import { connection } from "next/server";
import { z } from "zod";

/**
 * "Continue with Google". A plain link to the API, which runs the whole OAuth
 * flow (see apps/api/src/modules/auth/google.ts). Hidden when the API has no
 * Google client configured, so a half-set-up server never shows a broken button.
 *
 * PUBLIC_API_URL = the API's address as the BROWSER reaches it (it can differ
 * from API_URL, which this server uses inside the hosting network).
 */
const API_URL = process.env.API_URL ?? "http://localhost:4000";
const PUBLIC_API_URL = process.env.PUBLIC_API_URL ?? API_URL;

/** What this server offers: Google sign-in, and whether it can send emails. */
export async function getProviders() {
  try {
    const res = await fetch(`${API_URL}/v1/auth/providers`, { next: { revalidate: 300 } });
    return z.object({ google: z.boolean(), email: z.boolean().default(true) }).parse(await res.json());
  } catch {
    return { google: false, email: true };
  }
}

/** Shown where an email would be sent, while the server has no email set up. */
export async function EmailOffNote({ children }: { children: React.ReactNode }) {
  await connection();
  if ((await getProviders()).email) return null;
  return <p className="mb-4 rounded-md border-2 border-saffron bg-saffron/10 px-3 py-2 text-sm">{children}</p>;
}

export async function GoogleButton({ next, label = "Continue with Google" }: { next?: string; label?: string }) {
  await connection();
  if (!(await getProviders()).google) return null;
  const href = `${PUBLIC_API_URL}/v1/auth/google/start?next=${encodeURIComponent(next ?? "/me")}`;
  return (
    <>
      <a href={href} className="brutal-sm press flex w-full items-center justify-center gap-3 rounded-md bg-white px-4 py-2.5 text-sm font-semibold text-[#1f1f1f]">
        {/* Google's "G" mark, as their sign-in branding guidelines ask */}
        <svg viewBox="0 0 48 48" className="size-5" aria-hidden>
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
        </svg>
        {label}
      </a>
      <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wide text-muted" aria-hidden>
        <span className="h-px flex-1 bg-border" /> or with email <span className="h-px flex-1 bg-border" />
      </div>
    </>
  );
}

/** Messages for ?error=… after a Google sign-in that didn't work out. */
export const GOOGLE_ERRORS: Record<string, string> = {
  google_cancelled: "Google sign-in was cancelled.",
  google_expired: "That sign-in took too long. Please try again.",
  google_state: "That sign-in link wasn't valid. Please try again.",
  google_failed: "We couldn't reach Google. Please try again in a moment.",
  google_unverified: "Google hasn't verified that email address, so we can't use it.",
  blocked: "This account has been blocked.",
};
