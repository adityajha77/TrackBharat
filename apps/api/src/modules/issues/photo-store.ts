import { createReadStream, existsSync, mkdirSync } from "node:fs";
import { rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Readable } from "node:stream";
import sharp from "sharp";
import { AppError } from "../../lib/errors";

/**
 * PHOTO STORAGE for issue reports (and leader photos).
 *
 * We NEVER store or serve the file the user uploaded. Instead we decode it and
 * re-encode a fresh WebP:
 *  - Strips EXIF metadata: phone photos embed the GPS location (often the
 *    reporter's home), device model and timestamps. sharp drops all metadata
 *    unless asked to keep it.
 *  - Neutralises malicious files: anything that isn't a real image fails to decode.
 *  - Normalises size (max 1600px) and format (WebP), saving storage and bandwidth.
 *
 * Where the bytes live is a separate choice: local disk (dev, Docker volume) or
 * Supabase Storage (hosts without a persistent disk, e.g. Render's free plan).
 * Both serve through our API, so photo URLs never change.
 */
export interface PhotoStore {
  save(upload: Buffer): Promise<string>;
  open(key: string): Promise<Readable | Buffer | null>;
  remove(key: string): Promise<void>;
}

export const PHOTO_KEY = /^[0-9a-f-]{36}\.webp$/;
const ALLOWED = new Set(["jpeg", "png", "webp", "heif"]);

/** Decode → check → re-encode as a clean WebP (no metadata), with a random key. */
export async function reencode(upload: Buffer): Promise<{ key: string; bytes: Buffer }> {
  let meta;
  try {
    meta = await sharp(upload).metadata();
  } catch {
    throw AppError.validation("The photo couldn't be read. Use a JPEG, PNG or WebP image.");
  }
  if (!meta.format || !ALLOWED.has(meta.format)) throw AppError.validation("Only JPEG, PNG, WebP or HEIC photos are accepted");
  if ((meta.width ?? 0) * (meta.height ?? 0) > 50_000_000) throw AppError.validation("Photo dimensions are too large");

  const bytes = await sharp(upload)
    .rotate() // apply the EXIF orientation BEFORE the metadata is dropped
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer(); // no .withMetadata() → EXIF/GPS is not copied
  return { key: `${crypto.randomUUID()}.webp`, bytes }; // random name: can't be guessed or enumerated
}

/** Local folder (dev, or a mounted disk). */
export function createPhotoStore(dir: string): PhotoStore {
  mkdirSync(dir, { recursive: true });
  return {
    async save(upload) {
      const { key, bytes } = await reencode(upload);
      await writeFile(path.join(dir, key), bytes);
      return key;
    },

    async open(key) {
      if (!PHOTO_KEY.test(key)) return null; // also blocks path traversal like "../../etc/passwd"
      const file = path.join(dir, key);
      return existsSync(file) ? createReadStream(file) : null;
    },

    async remove(key) {
      if (PHOTO_KEY.test(key)) await rm(path.join(dir, key), { force: true });
    },
  };
}

/**
 * Supabase Storage, in a PRIVATE bucket. Only this server holds the service key;
 * browsers get photos through our API, exactly as with local disk.
 */
export function createSupabasePhotoStore(opts: { url: string; serviceKey: string; bucket: string }, fetchImpl: typeof fetch = fetch): PhotoStore & { ensureBucket(): Promise<void> } {
  const base = `${opts.url.replace(/\/$/, "")}/storage/v1`;
  const auth = { authorization: `Bearer ${opts.serviceKey}`, apikey: opts.serviceKey };
  const object = (key: string) => `${base}/object/${encodeURIComponent(opts.bucket)}/${key}`;
  return {
    /** Create the private bucket once (a 409 "already exists" is fine). */
    async ensureBucket() {
      const res = await fetchImpl(`${base}/bucket`, {
        method: "POST",
        headers: { ...auth, "content-type": "application/json" },
        body: JSON.stringify({ id: opts.bucket, name: opts.bucket, public: false, file_size_limit: 5_000_000, allowed_mime_types: ["image/webp"] }),
      });
      if (!res.ok && res.status !== 409 && !(await res.text()).includes("already exists")) throw new Error(`Supabase Storage: could not create bucket "${opts.bucket}" (HTTP ${res.status})`);
    },

    async save(upload) {
      const { key, bytes } = await reencode(upload);
      const res = await fetchImpl(object(key), { method: "POST", headers: { ...auth, "content-type": "image/webp" }, body: new Uint8Array(bytes) });
      if (!res.ok) throw new Error(`Supabase Storage upload failed (HTTP ${res.status})`);
      return key;
    },

    async open(key) {
      if (!PHOTO_KEY.test(key)) return null;
      const res = await fetchImpl(object(key), { headers: auth });
      if (res.status === 404 || res.status === 400) return null;
      if (!res.ok) throw new Error(`Supabase Storage read failed (HTTP ${res.status})`);
      return Buffer.from(await res.arrayBuffer());
    },

    async remove(key) {
      if (!PHOTO_KEY.test(key)) return;
      await fetchImpl(`${base}/object/${encodeURIComponent(opts.bucket)}`, {
        method: "DELETE",
        headers: { ...auth, "content-type": "application/json" },
        body: JSON.stringify({ prefixes: [key] }),
      });
    },
  };
}
