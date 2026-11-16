import "server-only";
import {
  ApiErrorBody,
  AuthResponse,
  IssueDetail,
  IssueListResponse,
  ModerationQueue,
  MyActivity,
  PublicUser,
  VoteResponse,
  CausesResponse,
  NewsItem,
} from "@trackbharat/shared";
import { z } from "zod";
import { ApiError } from "./api";
import { getSessionToken } from "./session";

/**
 * PER-USER API calls. Unlike lib/api.ts these are NEVER cached ("use cache"
 * would share one user's answer with everyone). They forward the session
 * token from the cookie, and must run inside <Suspense> (they read cookies).
 */
const API_URL = process.env.API_URL ?? "http://localhost:4000";

async function call<T extends z.ZodType>(path: string, schema: T, init: RequestInit & { token?: string | null } = {}): Promise<z.infer<T>> {
  const token = init.token === undefined ? await getSessionToken() : init.token;
  const headers = new Headers(init.headers);
  headers.set("accept", "application/json");
  if (token) headers.set("authorization", `Bearer ${token}`);
  if (typeof init.body === "string") headers.set("content-type", "application/json");

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...init, headers, cache: "no-store" });
  } catch {
    throw new ApiError(503, "API_UNREACHABLE", "The TrackBharat API is not reachable. Is it running?");
  }
  if (res.status === 204) return schema.parse(undefined);
  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const err = ApiErrorBody.safeParse(json);
    throw new ApiError(res.status, err.success ? err.data.error.code : "UNKNOWN", err.success ? err.data.error.message : `HTTP ${res.status}`);
  }
  return schema.parse(json);
}

const json = (body: unknown) => JSON.stringify(body);
const Nothing = z.undefined();
const Created = z.object({ id: z.number().int() });

/** Current user, or null if not logged in / session expired. */
export async function getMe(): Promise<PublicUser | null> {
  if (!(await getSessionToken())) return null;
  return call("/v1/auth/me", PublicUser).catch((e) => (e instanceof ApiError && e.status === 401 ? null : Promise.reject(e)));
}

export const signup = (body: unknown) => call("/v1/auth/signup", AuthResponse, { method: "POST", body: json(body), token: null });
export const login = (body: unknown) => call("/v1/auth/login", AuthResponse, { method: "POST", body: json(body), token: null });
export const logout = () => call("/v1/auth/logout", Nothing, { method: "POST" }).catch(() => undefined);

export const getIssues = (slug: string, sort: "top" | "new" = "top", limit = 20) =>
  call(`/v1/constituencies/${slug}/issues?sort=${sort}&limit=${limit}`, IssueListResponse);
export const getIssue = (id: number) => call(`/v1/issues/${id}`, IssueDetail);
export const createIssue = (form: FormData) => call("/v1/issues", Created, { method: "POST", body: form });
/** value: +1 / -1, or 0 to take the vote back. */
export const vote = (id: number, value: 1 | -1 | 0) =>
  call(`/v1/issues/${id}/vote`, VoteResponse, value === 0 ? { method: "DELETE" } : { method: "POST", body: json({ value }) });
export const reportIssue = (id: number, reason: string) => call(`/v1/issues/${id}/report`, Nothing, { method: "POST", body: json({ reason }) });

export const submitPromise = (body: unknown) => call("/v1/promise-submissions", Created, { method: "POST", body: json(body) });
export const getMyActivity = () => call("/v1/me/activity", MyActivity);

export const getModerationQueue = () => call("/v1/moderation/queue", ModerationQueue);
export const moderateIssue = (id: number, body: unknown) => call(`/v1/moderation/issues/${id}`, Nothing, { method: "POST", body: json(body) });
export const reviewSubmission = (id: number, body: unknown) =>
  call(`/v1/moderation/submissions/${id}`, z.object({ promiseId: z.number().int().nullable() }), { method: "POST", body: json(body) });

export const changePassword = (body: unknown) => call("/v1/auth/change-password", Nothing, { method: "POST", body: json(body) });
export const deleteAccount = (body: unknown) => call("/v1/auth/delete-account", Nothing, { method: "POST", body: json(body) });

// ---- Causes, news, email links ------------------------------------------------
export const getCauses = () => call("/v1/causes/current", CausesResponse);
export const voteCause = (id: number, value: 1 | -1 | 0) =>
  call(`/v1/causes/${id}/vote`, VoteResponse, value === 0 ? { method: "DELETE" } : { method: "POST", body: json({ value }) });
export const submitNews = (body: unknown) => call("/v1/news", Created, { method: "POST", body: json(body) });
export const getNewsQueue = () => call("/v1/moderation/news", z.object({ items: z.array(NewsItem) }));
export const reviewNews = (id: number, body: unknown) => call(`/v1/moderation/news/${id}`, Nothing, { method: "POST", body: json(body) });

export const verifyEmail = (token: string) => call("/v1/auth/verify-email", Nothing, { method: "POST", body: json({ token }), token: null });
export const resendVerification = () => call("/v1/auth/resend-verification", Nothing, { method: "POST" });
export const forgotPassword = (email: string) => call("/v1/auth/forgot-password", Nothing, { method: "POST", body: json({ email }), token: null });
export const resetPassword = (body: unknown) => call("/v1/auth/reset-password", Nothing, { method: "POST", body: json(body), token: null });
export const getOutbox = () =>
  call("/v1/dev/outbox", z.object({ emails: z.array(z.object({ to: z.string(), subject: z.string(), text: z.string(), sentAt: z.string() })) }), { token: null });
