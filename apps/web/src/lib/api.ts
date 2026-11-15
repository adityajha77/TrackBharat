import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import {
  ApiErrorBody,
  ConstituencyDetail,
  ConstituencyIndexResponse,
  PincodeConstituenciesResponse,
  PincodeLookupResponse,
  PromiseDetail,
} from "@trackbharat/shared";
import type { z } from "zod";

/**
 * Typed API client, used ONLY on the server (the "server-only" import makes the
 * build fail if a client component ever imports it).
 *
 * Every response is validated with the shared Zod schema. If the API and the
 * web app ever disagree about a shape, we get a clear error here instead of
 * `undefined is not a function` somewhere deep in a component.
 */
const API_URL = process.env.API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

async function request<T extends z.ZodType>(path: string, schema: T): Promise<z.infer<T>> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { headers: { accept: "application/json" } });
  } catch {
    throw new ApiError(503, "API_UNREACHABLE", "The TrackBharat API is not reachable. Is it running?");
  }
  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const err = ApiErrorBody.safeParse(json);
    throw new ApiError(res.status, err.success ? err.data.error.code : "UNKNOWN", err.success ? err.data.error.message : `HTTP ${res.status}`);
  }
  return schema.parse(json);
}

/**
 * `"use cache"` memoises the result across requests on the Next.js server:
 * 1000 people opening /area/560034 → 1 API call per cache lifetime.
 * `cacheTag` lets us purge one PIN code later with `revalidateTag("pincode:560034")`.
 */
export async function getPincode(pincode: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(`pincode:${pincode}`);
  return request(`/v1/pincodes/${pincode}`, PincodeLookupResponse);
}

export async function getPincodeConstituencies(pincode: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(`pincode:${pincode}`);
  return request(`/v1/pincodes/${pincode}/constituencies`, PincodeConstituenciesResponse);
}

/** The 543-seat index changes only when boundaries do: cache for days. */
export async function getConstituencyIndex() {
  "use cache";
  cacheLife("days");
  cacheTag("constituencies");
  return request(`/v1/constituencies`, ConstituencyIndexResponse);
}

/** Promises change through admin edits; minutes-long cache, purgeable per seat. */
export async function getConstituency(slug: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag(`constituency:${slug}`);
  return request(`/v1/constituencies/${slug}`, ConstituencyDetail);
}

export async function getPromise(id: number) {
  "use cache";
  cacheLife("minutes");
  cacheTag(`promise:${id}`);
  return request(`/v1/promises/${id}`, PromiseDetail);
}
