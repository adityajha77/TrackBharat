"use client";

import { useActionState } from "react";
import { promiseEvidenceAction, promiseStatusAction, updateCauseAction, updateUserAction, type ActionState } from "@/app/actions";
import { Field, FormError, Input, Select, Textarea } from "@/components/ui/field";

const Done = ({ text = "Saved. Recorded in the audit log." }: { text?: string }) => <p className="text-sm font-semibold text-flag-green">{text}</p>;
const Submit = ({ pending, children, danger = false }: { pending: boolean; children: React.ReactNode; danger?: boolean }) => (
  <button type="submit" disabled={pending} className={`brutal-sm press rounded-md px-3 py-1.5 text-sm font-semibold ${danger ? "bg-danger text-white" : "bg-flag-green text-white"}`}>
    {pending ? "Saving…" : children}
  </button>
);

/** Role + block/unblock for one user. A reason is required (audit log). */
export function UserForm({ id, role, isBlocked }: { id: number; role: string; isBlocked: boolean }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateUserAction.bind(null, id), {});
  const v = state.values ?? {};
  return (
    <form action={action} className="mt-3 flex flex-wrap items-end gap-2 border-t-2 border-ink/10 pt-3">
      <Field label="Role">
        <Select name="role" defaultValue={v.role ?? role} className="mt-0">
          <option value="CITIZEN">Citizen</option>
          <option value="VERIFIER">Verifier</option>
          <option value="MODERATOR">Moderator</option>
          <option value="ADMIN">Admin</option>
        </Select>
      </Field>
      <Field label="Account">
        <Select name="blocked" defaultValue={v.blocked ?? (isBlocked ? "1" : "0")} className="mt-0">
          <option value="0">Active</option>
          <option value="1">Blocked (signs them out)</option>
        </Select>
      </Field>
      <div className="min-w-48 flex-1">
        <Field label="Reason (for the audit log)">
          <Input name="note" required minLength={5} maxLength={300} defaultValue={v.note} placeholder="e.g. Helps verify news in Odisha" className="mt-0" />
        </Field>
      </div>
      <Submit pending={pending}>Save</Submit>
      <div className="w-full">{state.ok ? <Done /> : <FormError message={state.error} />}</div>
    </form>
  );
}

function SourceFields({ v }: { v: Record<string, string> }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <Field label="Source link">
        <Input name="sourceUrl" type="url" required placeholder="https://…" defaultValue={v.sourceUrl} />
      </Field>
      <Field label="Source title">
        <Input name="sourceTitle" required minLength={3} maxLength={300} defaultValue={v.sourceTitle} />
      </Field>
      <Field label="Publisher">
        <Input name="sourcePublisher" required minLength={2} maxLength={200} placeholder="e.g. The Hindu, PIB" defaultValue={v.sourcePublisher} />
      </Field>
      <Field label="Type of source">
        <Select name="sourceKind" defaultValue={v.sourceKind ?? "NEWS"}>
          <option value="OFFICIAL">Official (government)</option>
          <option value="NEWS">News report</option>
          <option value="MANIFESTO">Manifesto</option>
          <option value="DATASET">Dataset</option>
          <option value="OTHER">Other</option>
        </Select>
      </Field>
    </div>
  );
}

/** New status for a promise: always with a note and a source. */
export function PromiseStatusForm({ id, status }: { id: number; status: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(promiseStatusAction.bind(null, id), {});
  const v = state.values ?? {};
  if (state.ok) return <Done text="Status updated. It shows on the report card with your source." />;
  return (
    <form action={action} className="space-y-2">
      <Field label="New status">
        <Select name="status" defaultValue={v.status ?? status}>
          {["PENDING", "IN_PROGRESS", "PARTIAL", "FULFILLED", "STALLED", "BROKEN"].map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ").toLowerCase()}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="What changed (10+ characters)">
        <Textarea name="note" required minLength={10} maxLength={1000} defaultValue={v.note} />
      </Field>
      <SourceFields v={v} />
      <FormError message={state.error} />
      <Submit pending={pending}>Update status</Submit>
    </form>
  );
}

/** Evidence: what a source shows about the promise. */
export function PromiseEvidenceForm({ id }: { id: number }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(promiseEvidenceAction.bind(null, id), {});
  const v = state.values ?? {};
  if (state.ok) return <Done text="Evidence added to the report card." />;
  return (
    <form action={action} className="space-y-2">
      <Field label="What the source shows (10+ characters)">
        <Textarea name="summary" required minLength={10} maxLength={1000} defaultValue={v.summary} />
      </Field>
      <Field label="It shows…">
        <Select name="stance" defaultValue={v.stance ?? "SHOWS_PROGRESS"}>
          <option value="SHOWS_PROGRESS">progress</option>
          <option value="SHOWS_NO_PROGRESS">no progress</option>
          <option value="CONTEXT">context only</option>
        </Select>
      </Field>
      <SourceFields v={v} />
      <FormError message={state.error} />
      <Submit pending={pending}>Add evidence</Submit>
    </form>
  );
}

/** Reword or pin a Cause of the Week. Empty title/blurb = the automatic text. */
export function CauseForm({ id, title, blurb, pinned }: { id: number; title: string | null; blurb: string | null; pinned: boolean }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateCauseAction.bind(null, id), {});
  const v = state.values ?? {};
  return (
    <form action={action} className="mt-3 space-y-2">
      <Field label="Title (empty = category name)">
        <Input name="title" maxLength={120} defaultValue={v.title ?? title ?? ""} />
      </Field>
      <Field label="Short description (empty = automatic)">
        <Textarea name="blurb" maxLength={400} defaultValue={v.blurb ?? blurb ?? ""} />
      </Field>
      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" name="pinned" defaultChecked={pinned} className="size-4" /> Pin to the top
      </label>
      <div className="flex items-center gap-3">
        <Submit pending={pending}>Save</Submit>
        {state.ok ? <Done /> : <FormError message={state.error} />}
      </div>
    </form>
  );
}
