import type {
  AdminOverview,
  AdminPromiseList,
  AdminUserList,
  AuthResponse,
  CausesResponse,
  ConstituencyDetail,
  HeadlineList,
  ModerationQueue,
  MyActivity,
  NewsItem,
  NewsList,
  PartiesResponse,
  PartyDetail,
  PincodeConstituenciesResponse,
  PublicUser,
  VoteResponse,
} from "@trackbharat/shared";
import { API_URL } from "./config";

/**
 * The app's API client. Same API and same contract as the website: types come
 * from packages/shared (type-only imports, so nothing extra is bundled).
 * The session token is passed in by the auth context and sent as a Bearer token,
 * exactly like the website's server does.
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

let token: string | null = null;
export const setApiToken = (t: string | null) => {
  token = t;
};

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { accept: "application/json", ...(init.headers as Record<string, string>) };
  if (init.body) headers["content-type"] = "application/json";
  if (token) headers.authorization = `Bearer ${token}`;
  let res: Response;
  try {
    // The free server sleeps when idle; the first request can take ~40 s, so allow 60.
    res = await fetch(`${API_URL}${path}`, { ...init, headers, signal: AbortSignal.timeout(60_000) });
  } catch {
    throw new ApiError(0, "Can't reach TrackBharat. Check your internet and try again.");
  }
  if (res.status === 204) return undefined as T;
  const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
  if (!res.ok) throw new ApiError(res.status, body?.error?.message ?? `Something went wrong (HTTP ${res.status})`);
  return body as T;
}
const post = <T>(path: string, data?: unknown, method = "POST") => call<T>(path, { method, body: data === undefined ? undefined : JSON.stringify(data) });

export const api = {
  // Public data
  pincode: (pin: string) => call<PincodeConstituenciesResponse>(`/v1/pincodes/${pin}/constituencies`),
  constituency: (slug: string) => call<ConstituencyDetail>(`/v1/constituencies/${slug}`),
  parties: () => call<PartiesResponse>("/v1/parties"),
  party: (slug: string) => call<PartyDetail>(`/v1/parties/${slug}`),
  causes: () => call<CausesResponse>("/v1/causes/current"),
  voteCause: (id: number, value: 1 | -1 | 0) => (value === 0 ? post<VoteResponse>(`/v1/causes/${id}/vote`, undefined, "DELETE") : post<VoteResponse>(`/v1/causes/${id}/vote`, { value })),
  news: () => call<NewsList>("/v1/news"),
  headlines: (state?: string) => call<HeadlineList>(`/v1/news/headlines${state ? `?state=${encodeURIComponent(state)}` : ""}`),
  suggestStory: (url: string, headline: string) => post<{ id: number }>("/v1/news", { url, headline }),
  providers: () => call<{ google: boolean; email: boolean }>("/v1/auth/providers"),

  // Account
  login: (email: string, password: string) => post<AuthResponse>("/v1/auth/login", { email, password }),
  signup: (name: string, email: string, password: string) => post<AuthResponse>("/v1/auth/signup", { name, email, password }),
  googleExchange: (code: string) => post<AuthResponse>("/v1/auth/google/exchange", { code }),
  me: () => call<PublicUser>("/v1/auth/me"),
  logout: () => post<void>("/v1/auth/logout"),
  activity: () => call<MyActivity>("/v1/me/activity"),

  // Staff (the API checks the role on every call)
  adminOverview: () => call<AdminOverview>("/v1/admin/overview"),
  adminUsers: (q: string) => call<AdminUserList>(`/v1/admin/users${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  updateUser: (id: number, body: { role?: string; blocked?: boolean; note: string }) => post<void>(`/v1/admin/users/${id}`, body, "PATCH"),
  adminPromises: (q: string) => call<AdminPromiseList>(`/v1/admin/promises${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  promiseStatus: (id: number, body: unknown) => post<{ id: number }>(`/v1/admin/promises/${id}/status`, body),
  newsQueue: () => call<{ items: NewsItem[] }>("/v1/moderation/news"),
  reviewNews: (id: number, body: unknown) => post<void>(`/v1/moderation/news/${id}`, body),
  updateCause: (id: number, body: { title?: string | null; pinned?: boolean }) => post<void>(`/v1/moderation/causes/${id}`, body, "PATCH"),
  moderationQueue: () => call<ModerationQueue>("/v1/moderation/queue"),
};
