import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { createSupabasePhotoStore } from "../src/modules/issues/photo-store";

/** Supabase Storage photo store, against a fake Storage API (no network). */
describe("Supabase photo storage", () => {
  function fakeStorage() {
    const files = new Map<string, Buffer>();
    const calls: { method: string; url: string; auth: string | null }[] = [];
    const fetchImpl = (async (input: string | URL | Request, init: RequestInit = {}) => {
      const url = String(input);
      const method = init.method ?? "GET";
      calls.push({ method, url, auth: new Headers(init.headers).get("authorization") });
      if (url.endsWith("/storage/v1/bucket")) return new Response('{"message":"The resource already exists"}', { status: 409 });
      const key = url.split("/").pop()!;
      if (method === "POST") {
        files.set(key, Buffer.from(init.body as Uint8Array));
        return new Response("{}");
      }
      if (method === "DELETE") {
        for (const k of JSON.parse(String(init.body)).prefixes) files.delete(k);
        return new Response("[]");
      }
      const f = files.get(key);
      return f ? new Response(new Uint8Array(f)) : new Response("not found", { status: 404 });
    }) as typeof fetch;
    return { files, calls, fetchImpl };
  }

  it("stores a cleaned WebP in a private bucket, reads it back, and deletes it", async () => {
    const { files, calls, fetchImpl } = fakeStorage();
    const store = createSupabasePhotoStore({ url: "https://abc.supabase.co/", serviceKey: "service-key", bucket: "issue-photos" }, fetchImpl);
    await store.ensureBucket(); // "already exists" is fine

    const jpeg = await sharp({ create: { width: 40, height: 30, channels: 3, background: "#f93" } }).jpeg().toBuffer();
    const key = await store.save(jpeg);
    expect(key).toMatch(/^[0-9a-f-]{36}\.webp$/);
    expect(calls.find((c) => c.method === "POST" && c.url.includes("/object/"))).toMatchObject({
      url: `https://abc.supabase.co/storage/v1/object/issue-photos/${key}`,
      auth: "Bearer service-key",
    });
    expect((await sharp(files.get(key)!).metadata()).format).toBe("webp");

    const back = await store.open(key);
    expect(Buffer.isBuffer(back) && back.length).toBeGreaterThan(0);

    await store.remove(key);
    expect(await store.open(key)).toBeNull();
  });

  it("never asks Storage for a key that isn't one of ours (no path tricks)", async () => {
    const { calls, fetchImpl } = fakeStorage();
    const store = createSupabasePhotoStore({ url: "https://abc.supabase.co", serviceKey: "k", bucket: "b" }, fetchImpl);
    expect(await store.open("../secrets.txt")).toBeNull();
    expect(calls).toHaveLength(0);
  });
});
