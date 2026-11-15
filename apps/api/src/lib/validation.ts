import type { z } from "zod";
import { AppError } from "./errors";

/** Parse untrusted input with a shared schema; turn the first Zod issue into a clear 400. */
export function parseBody<T extends z.ZodType>(schema: T, body: unknown): z.infer<T> {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const i = parsed.error.issues[0];
    throw AppError.validation(i ? `${i.path.join(".") || "body"}: ${i.message}` : "Invalid request");
  }
  return parsed.data;
}

/** Positive integer route param (":id"), else 400. */
export function parseId(raw: string, what = "id") {
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1 || id > 2_147_483_647) throw AppError.validation(`Invalid ${what}`);
  return id;
}
