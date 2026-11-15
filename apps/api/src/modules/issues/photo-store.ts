import { createReadStream, existsSync, mkdirSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { AppError } from "../../lib/errors";

/**
 * PHOTO STORAGE for issue reports.
 *
 * We NEVER store or serve the file the user uploaded. Instead we decode it and
 * re-encode a fresh WebP:
 *  - Strips EXIF metadata: phone photos embed the GPS location (often the
 *    reporter's home), device model and timestamps. sharp drops all metadata
 *    unless asked to keep it.
 *  - Neutralises malicious files: anything that isn't a real image fails to decode.
 *  - Normalises size (max 1600px) and format (WebP), saving storage and bandwidth.
 *
 * Files live on local disk (a Docker volume in production). Swapping in S3 /
 * R2 later only means another implementation of this interface.
 */
export interface PhotoStore {
  save(upload: Buffer): Promise<string>;
  open(key: string): ReturnType<typeof createReadStream> | null;
}

export const PHOTO_KEY = /^[0-9a-f-]{36}\.webp$/;
const ALLOWED = new Set(["jpeg", "png", "webp", "heif"]);

export function createPhotoStore(dir: string): PhotoStore {
  mkdirSync(dir, { recursive: true });
  return {
    async save(upload) {
      let meta;
      try {
        meta = await sharp(upload).metadata();
      } catch {
        throw AppError.validation("The photo couldn't be read. Use a JPEG, PNG or WebP image.");
      }
      if (!meta.format || !ALLOWED.has(meta.format)) throw AppError.validation("Only JPEG, PNG, WebP or HEIC photos are accepted");
      if ((meta.width ?? 0) * (meta.height ?? 0) > 50_000_000) throw AppError.validation("Photo dimensions are too large");

      const out = await sharp(upload)
        .rotate() // apply the EXIF orientation BEFORE the metadata is dropped
        .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer(); // no .withMetadata() → EXIF/GPS is not copied
      const key = `${crypto.randomUUID()}.webp`; // random name: can't be guessed or enumerated
      await writeFile(path.join(dir, key), out);
      return key;
    },

    open(key) {
      if (!PHOTO_KEY.test(key)) return null; // also blocks path traversal like "../../etc/passwd"
      const file = path.join(dir, key);
      return existsSync(file) ? createReadStream(file) : null;
    },
  };
}
