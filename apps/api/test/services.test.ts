import { describe, expect, it, vi } from "vitest";
import type { PincodeConstituency } from "@trackbharat/shared";
import { createConstituencyService, MIN_PINCODE_SHARE } from "../src/modules/constituencies/constituency.service";
import type { ConstituencyRepository } from "../src/modules/constituencies/constituency.repository";
import { createPromiseService } from "../src/modules/promises/promise.service";
import type { PromiseRepository } from "../src/modules/promises/promise.repository";

const seat = (name: string, share: number): PincodeConstituency => ({
  slug: name.toLowerCase(),
  name,
  nameHi: null,
  house: "LOK_SABHA",
  state: "Delhi",
  number: 1,
  reservation: "GEN",
  boundaryOutdated: false,
  isDemo: false,
  share,
  representative: null,
});

describe("constituency service: PIN → constituency threshold", () => {
  const svc = (rows: PincodeConstituency[]) => createConstituencyService({ forPincode: async () => rows } as unknown as ConstituencyRepository);

  it("drops constituencies holding less than the minimum share of post offices", async () => {
    const res = await svc([seat("New Delhi", 0.87), seat("East Delhi", 0.09), seat("Faridabad", 0.04)]).forPincode("110001");
    expect(res.constituencies.map((c) => c.name)).toEqual(["New Delhi"]);
  });

  it("keeps every constituency at or above the threshold", async () => {
    const res = await svc([seat("Chandni Chowk", 0.45), seat("East Delhi", 0.45), seat("Noise", 0.1)]).forPincode("110002");
    expect(res.constituencies).toHaveLength(2);
  });

  it("applies the threshold separately to Lok Sabha and Vidhan Sabha seats", async () => {
    const vs = (name: string, share: number) => ({ ...seat(name, share), house: "VIDHAN_SABHA" as const });
    const res = await svc([seat("Bangalore South", 1), vs("B.T.M Layout", 0.75), vs("Bommanahalli", 0.25), vs("Noise", 0.05)]).forPincode("560034");
    expect(res.constituencies.map((c) => `${c.house}:${c.name}`)).toEqual([
      "LOK_SABHA:Bangalore South",
      "VIDHAN_SABHA:B.T.M Layout",
      "VIDHAN_SABHA:Bommanahalli",
    ]);
  });

  it("always keeps the top match, even below the threshold", async () => {
    const res = await svc([seat("A", MIN_PINCODE_SHARE - 0.05), seat("B", 0.1)]).forPincode("123456");
    expect(res.constituencies.map((c) => c.name)).toEqual(["A"]);
  });
});

describe("promise service: business rules", () => {
  const repo = (overrides: Partial<PromiseRepository> = {}): PromiseRepository =>
    ({
      findConstituencyId: vi.fn().mockResolvedValue(7),
      findSittingTermId: vi.fn().mockResolvedValue(3),
      findPartyId: vi.fn().mockResolvedValue(null),
      exists: vi.fn().mockResolvedValue(false),
      create: vi.fn().mockResolvedValue(99),
      ...overrides,
    }) as unknown as PromiseRepository;
  const base = {
    constituencySlug: "x",
    title: "A promise that is long enough",
    category: "WATER" as const,
    source: { url: "https://example.org/a", title: "Speech", publisher: "News", kind: "NEWS" as const },
  };

  it("attributes a representative's promise to the sitting term", async () => {
    const r = repo();
    await createPromiseService(r).create({ ...base, madeBy: { type: "REPRESENTATIVE" } });
    expect(r.create).toHaveBeenCalledWith(expect.objectContaining({ termId: 3, partyId: null, constituencyId: 7 }));
  });

  it("refuses when the seat is vacant (409)", async () => {
    const svc = createPromiseService(repo({ findSittingTermId: vi.fn().mockResolvedValue(null) }));
    await expect(svc.create({ ...base, madeBy: { type: "REPRESENTATIVE" } })).rejects.toMatchObject({ statusCode: 409 });
  });

  it("never invents a party from free text (404)", async () => {
    const svc = createPromiseService(repo());
    await expect(svc.create({ ...base, madeBy: { type: "PARTY", partyName: "Imaginary Party" } })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("404s on an unknown constituency", async () => {
    const svc = createPromiseService(repo({ findConstituencyId: vi.fn().mockResolvedValue(null) }));
    await expect(svc.create({ ...base, madeBy: { type: "REPRESENTATIVE" } })).rejects.toMatchObject({ statusCode: 404 });
  });

  it("can't update the status of a promise that doesn't exist", async () => {
    const svc = createPromiseService(repo());
    await expect(
      svc.updateStatus(1, { status: "FULFILLED", note: "Opened to the public", source: base.source }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});
