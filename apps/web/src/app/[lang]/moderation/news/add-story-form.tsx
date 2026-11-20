"use client";

import { useActionState } from "react";
import { createNewsAction, type ActionState } from "@/app/actions";
import { Field, FormError, Input, Select, Textarea } from "@/components/ui/field";

/**
 * ADD A STORY DIRECTLY (verifiers, moderators, admins): paste the link and the
 * headline, write 2–5 lines in your own words, tag the place, publish. It goes
 * live at once and is recorded in the audit log.
 */
export function AddStoryForm({ states, categories }: { states: string[]; categories: [string, string][] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(createNewsAction, {});
  const v = state.values ?? {};
  return (
    <form action={action} key={state.ok ? "done" : "form"} className="mt-4 space-y-3">
      {state.ok && <p className="text-sm font-semibold text-flag-green">Published. It is now on the News page (and in the audit log).</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Link to the original story" hint="https://… on the publisher's site">
          <Input name="url" type="url" required defaultValue={state.ok ? "" : v.url} />
        </Field>
        <Field label="Headline (as the publisher wrote it)">
          <Input name="headline" required minLength={10} maxLength={200} defaultValue={state.ok ? "" : v.headline} />
        </Field>
      </div>
      <Field label="Your summary (2–5 lines, your own words)" hint="Never paste the article: say what happened, where, and why it matters.">
        <Textarea name="summary" required minLength={60} maxLength={600} defaultValue={state.ok ? "" : v.summary} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="State / UT">
          <Select name="state" required defaultValue={state.ok ? "" : (v.state ?? "")}>
            <option value="">Choose…</option>
            {states.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </Field>
        <Field label="District (optional)">
          <Input name="district" maxLength={80} defaultValue={state.ok ? "" : v.district} />
        </Field>
        <Field label="Category">
          <Select name="category" defaultValue={v.category ?? "OTHER"}>
            {categories.map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Who is responsible (optional)" hint="Only if the report names an office, e.g. 'Public Works Department, Port Blair'.">
        <Input name="responsible" maxLength={160} defaultValue={state.ok ? "" : v.responsible} />
      </Field>
      <FormError message={state.error} />
      <button type="submit" disabled={pending} className="brutal-sm press rounded-md bg-flag-green px-4 py-2 text-sm font-semibold text-white">
        {pending ? "Publishing…" : "Publish story"}
      </button>
    </form>
  );
}
