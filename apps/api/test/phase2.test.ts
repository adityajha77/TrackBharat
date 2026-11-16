import { describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { PublicUser } from "@trackbharat/shared";
import { createAuthService, hashToken } from "../src/modules/auth/auth.service";
import type { AuthRepository } from "../src/modules/auth/auth.repository";
import { hashPassword } from "../src/modules/auth/password";
import { createIssueService, MAX_ISSUES_PER_DAY } from "../src/modules/issues/issue.service";
import type { IssueRepository } from "../src/modules/issues/issue.repository";
import { shortName } from "../src/modules/issues/issue.repository";
import { createPhotoStore } from "../src/modules/issues/photo-store";
import { previousWeek, weekStartIST } from "../src/lib/time";

const citizen: PublicUser = { id: 1, name: "Priya Sharma", role: "CITIZEN" };

describe("weeks in India time", () => {
  it("starts on Monday 00:00 IST, even when UTC is still Sunday", () => {
    // Sunday 2026-11-15 20:00 UTC = Monday 2026-11-16 01:30 IST
    expect(weekStartIST(new Date("2026-11-15T20:00:00Z"))).toBe("2026-11-16");
    // Sunday 2026-11-15 10:00 UTC = Sunday 15:30 IST → still the week of Monday 9th
    expect(weekStartIST(new Date("2026-11-15T10:00:00Z"))).toBe("2026-11-09");
  });
  it("finds the previous week", () => expect(previousWeek("2026-11-09")).toBe("2026-11-02"));
});

describe("auth service", () => {
  function repo(user?: { passwordHash: string; isBlocked?: boolean }) {
    return {
      findUserByEmail: vi.fn().mockResolvedValue(user ? { id: 7, name: "Asha", role: "CITIZEN", email: "a@x.org", isBlocked: false, ...user } : null),
      createUser: vi.fn().mockResolvedValue({ id: 8, name: "New", role: "CITIZEN" }),
      createSession: vi.fn(),
      findSessionUser: vi.fn(),
      touchSession: vi.fn(),
      deleteSession: vi.fn(),
    } as unknown as AuthRepository & { createSession: ReturnType<typeof vi.fn> };
  }

  it("stores only the HASH of the session token, never the token itself", async () => {
    const r = repo({ passwordHash: await hashPassword("correct horse battery") });
    const res = await createAuthService(r).login({ email: "a@x.org", password: "correct horse battery" }, null);
    const storedHash = r.createSession.mock.calls[0]![1];
    expect(storedHash).toBe(hashToken(res.token));
    expect(storedHash).not.toBe(res.token);
  });

  it("gives the same error for an unknown email and a wrong password", async () => {
    const unknown = await createAuthService(repo()).login({ email: "x@x.org", password: "whatever-pass" }, null).catch((e) => e.message);
    const wrong = await createAuthService(repo({ passwordHash: await hashPassword("right-password") })).login({ email: "a@x.org", password: "wrong-password" }, null).catch((e) => e.message);
    expect(unknown).toBe(wrong);
  });

  it("refuses blocked accounts", async () => {
    const r = repo({ passwordHash: await hashPassword("right-password"), isBlocked: true });
    await expect(createAuthService(r).login({ email: "a@x.org", password: "right-password" }, null)).rejects.toMatchObject({ statusCode: 403 });
  });

  it("refuses a duplicate signup", async () => {
    const r = repo({ passwordHash: "x" });
    await expect(createAuthService(r).signup({ name: "A", email: "a@x.org", password: "long-enough-pass" }, null)).rejects.toMatchObject({ statusCode: 409 });
  });
});

describe("issue service rules", () => {
  const base = (o: Partial<IssueRepository> = {}) =>
    ({
      countByUserSince: vi.fn().mockResolvedValue(0),
      seatForPincode: vi.fn().mockResolvedValue(10),
      create: vi.fn().mockResolvedValue(1),
      exists: vi.fn().mockResolvedValue({ id: 5, status: "OPEN", userId: 99 }),
      vote: vi.fn(),
      unvote: vi.fn(),
      votesInWeek: vi.fn().mockResolvedValue(3),
      findDetail: vi.fn(),
      ...o,
    }) as unknown as IssueRepository;
  const photos = { save: vi.fn(), open: () => null, remove: vi.fn() };
  const input = { title: "Broken street light", description: "Dark for two weeks, unsafe at night.", category: "SAFETY" as const, pincode: "560034" };

  it(`limits reports to ${MAX_ISSUES_PER_DAY} per day`, async () => {
    const svc = createIssueService(base({ countByUserSince: vi.fn().mockResolvedValue(MAX_ISSUES_PER_DAY) }), photos);
    await expect(svc.create(citizen, input, null)).rejects.toMatchObject({ statusCode: 429 });
  });

  it("doesn't save the photo if the PIN code can't be matched (no orphan files)", async () => {
    const save = vi.fn();
    const svc = createIssueService(base({ seatForPincode: vi.fn().mockResolvedValue(null) }), { save, open: () => null, remove: vi.fn() });
    await expect(svc.create(citizen, input, Buffer.from("x"))).rejects.toMatchObject({ statusCode: 400 });
    expect(save).not.toHaveBeenCalled();
  });

  it("forbids voting for your own report", async () => {
    const svc = createIssueService(base({ exists: vi.fn().mockResolvedValue({ id: 5, status: "OPEN", userId: citizen.id }) }), photos);
    await expect(svc.vote(citizen, 5, 1)).rejects.toThrow(/own report/);
  });

  it("hides HIDDEN issues from the public but not from their author", async () => {
    const detail = { id: 5, status: "HIDDEN", ownerId: citizen.id };
    const svc = createIssueService(base({ findDetail: vi.fn().mockResolvedValue(detail) }), photos);
    await expect(svc.get(5, null)).rejects.toMatchObject({ statusCode: 404 });
    await expect(svc.get(5, { id: 2, name: "Other", role: "CITIZEN" })).rejects.toMatchObject({ statusCode: 404 });
    await expect(svc.get(5, citizen)).resolves.toMatchObject({ id: 5 });
  });

  it("shows reporters as first name + initial", () => {
    expect(shortName("Priya Sharma")).toBe("Priya S.");
    expect(shortName("Ravi")).toBe("Ravi");
  });
});

describe("photo store", () => {
  it("strips EXIF (incl. GPS) and re-encodes to WebP", async () => {
    const withGps = await sharp({ create: { width: 64, height: 64, channels: 3, background: "#123456" } })
      .jpeg()
      .withExif({ IFD0: { Model: "SecretPhone" }, IFD3: { GPSLatitudeRef: "N", GPSLatitude: "12/1 55/1 0/1" } })
      .toBuffer();
    expect((await sharp(withGps).metadata()).exif).toBeDefined();

    const store = createPhotoStore(mkdtempSync(path.join(tmpdir(), "tb-photos-")));
    const key = await store.save(withGps);
    const chunks: Buffer[] = [];
    for await (const c of store.open(key)!) chunks.push(c as Buffer);
    const meta = await sharp(Buffer.concat(chunks)).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.exif).toBeUndefined();
  });

  it("rejects files that aren't images, and refuses path traversal", async () => {
    const store = createPhotoStore(mkdtempSync(path.join(tmpdir(), "tb-photos-")));
    await expect(store.save(Buffer.from("<script>alert(1)</script>"))).rejects.toMatchObject({ statusCode: 400 });
    expect(store.open("../../etc/passwd")).toBeNull();
  });
});
