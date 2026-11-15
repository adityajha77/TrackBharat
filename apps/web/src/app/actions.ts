"use server";

import { redirect } from "next/navigation";
import { refresh, updateTag } from "next/cache";
import { ChangePasswordInput, DeleteAccountInput, LoginInput, SignupInput } from "@trackbharat/shared";
import { ApiError } from "@/lib/api";
import * as api from "@/lib/api-user";
import { clearSessionCookie, setSessionCookie } from "@/lib/session";

/**
 * SERVER ACTIONS: functions that run on the server but can be called straight
 * from a <form action={…}> or a button. Next.js turns each one into a POST
 * endpoint with built-in CSRF protection (it checks the request's Origin).
 *
 * Pattern: validate → call the API with the user's token → return a small
 * result for the UI (errors as data, not exceptions) → refresh what changed.
 */
export type ActionState = { error?: string; ok?: boolean; values?: Record<string, string> };

/**
 * React 19 RESETS a form after its Server Action finishes. On an error that would
 * wipe everything the person typed, so we send the text fields back with the
 * error and the form restores them via defaultValue. Passwords and files are never echoed.
 */
const fieldsOf = (form: FormData): Record<string, string> =>
  Object.fromEntries([...form.entries()].filter(([k, v]) => typeof v === "string" && !/password|confirm|next/i.test(k)) as [string, string][]);

const message = (e: unknown) => (e instanceof ApiError ? e.message : "Something went wrong. Please try again.");
/** Only allow same-site relative redirects (blocks "open redirect" tricks like ?next=https://evil.example). */
const safeNext = (v: FormDataEntryValue | null) => (typeof v === "string" && v.startsWith("/") && !v.startsWith("//") ? v : "/me");

// ---- Accounts ----------------------------------------------------------------
export async function signupAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = SignupInput.safeParse({ name: form.get("name"), email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message, values: fieldsOf(form) };
  try {
    const res = await api.signup(parsed.data);
    await setSessionCookie(res.token);
  } catch (e) {
    return { error: message(e), values: fieldsOf(form) };
  }
  redirect(safeNext(form.get("next"))); // redirect() throws, so it must be outside try/catch
}

export async function loginAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = LoginInput.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return { error: "Enter your email and password", values: fieldsOf(form) };
  try {
    const res = await api.login(parsed.data);
    await setSessionCookie(res.token);
  } catch (e) {
    return { error: message(e), values: fieldsOf(form) };
  }
  redirect(safeNext(form.get("next")));
}

export async function logoutAction() {
  await api.logout(); // revoke the session server-side, not just forget the cookie
  await clearSessionCookie();
  redirect("/");
}

// ---- Issues ------------------------------------------------------------------
export async function createIssueAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const photo = form.get("photo");
  // An empty file input still sends an empty File: drop it so the API sees "no photo"
  if (photo instanceof File && photo.size === 0) form.delete("photo");
  let id: number;
  try {
    ({ id } = await api.createIssue(form));
  } catch (e) {
    return { error: message(e), values: fieldsOf(form) }; // the photo has to be re-chosen; the text is kept
  }
  redirect(`/issues/${id}?new=1`);
}

export async function voteAction(issueId: number, up: boolean): Promise<ActionState> {
  try {
    await api.vote(issueId, up);
  } catch (e) {
    return { error: message(e) };
  }
  refresh(); // re-render the current page with fresh vote counts
  return { ok: true };
}

export async function reportIssueAction(issueId: number, reason: string): Promise<ActionState> {
  try {
    await api.reportIssue(issueId, reason);
    return { ok: true };
  } catch (e) {
    return { error: message(e) };
  }
}

// ---- Promises ----------------------------------------------------------------
export async function submitPromiseAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const party = String(form.get("partyName") ?? "").trim();
  const opt = (k: string) => (String(form.get(k) ?? "").trim() || undefined);
  try {
    await api.submitPromise({
      constituencySlug: String(form.get("constituencySlug") ?? ""),
      madeBy: form.get("madeBy") === "PARTY" ? { type: "PARTY", partyName: party } : { type: "REPRESENTATIVE" },
      title: String(form.get("title") ?? ""),
      description: opt("description"),
      category: String(form.get("category") ?? ""),
      madeOn: opt("madeOn"),
      deadline: opt("deadline"),
      source: { url: String(form.get("sourceUrl") ?? ""), title: String(form.get("sourceTitle") ?? ""), publisher: String(form.get("sourcePublisher") ?? ""), kind: String(form.get("sourceKind") ?? "NEWS") },
    });
  } catch (e) {
    return { error: message(e), values: fieldsOf(form) };
  }
  redirect("/me?submitted=1");
}

// ---- Moderation & review -------------------------------------------------------
export async function moderateIssueAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    await api.moderateIssue(Number(form.get("issueId")), { action: form.get("action"), note: form.get("note") });
  } catch (e) {
    return { error: message(e) };
  }
  refresh();
  return { ok: true };
}

export async function reviewSubmissionAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    await api.reviewSubmission(Number(form.get("submissionId")), { decision: form.get("decision"), note: form.get("note") });
    // A new promise may now exist: expire the cached constituency page immediately
    const slug = String(form.get("constituencySlug") ?? "");
    if (slug) updateTag(`constituency:${slug}`);
  } catch (e) {
    return { error: message(e) };
  }
  refresh();
  return { ok: true };
}

// ---- Account settings ----------------------------------------------------------
export async function changePasswordAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = ChangePasswordInput.safeParse({ currentPassword: form.get("currentPassword"), newPassword: form.get("newPassword") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  try {
    await api.changePassword(parsed.data);
  } catch (e) {
    return { error: message(e) };
  }
  return { ok: true };
}

export async function deleteAccountAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = DeleteAccountInput.safeParse({ password: form.get("password") });
  if (!parsed.success || form.get("confirm") !== "DELETE") return { error: "Type DELETE and enter your password to confirm" };
  try {
    await api.deleteAccount(parsed.data);
  } catch (e) {
    return { error: message(e) };
  }
  await clearSessionCookie();
  redirect("/?deleted=1");
}
