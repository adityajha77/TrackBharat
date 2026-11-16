"use client";

import { useActionState } from "react";
import { reviewNewsAction, type ActionState } from "@/app/actions";
import { Field, FormError, Input, Select, Textarea } from "@/components/ui/field";

export function NewsReviewForm({ id, states, categories }: { id: number; states: string[]; categories: [string, string][] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(reviewNewsAction.bind(null, id), {});
  if (state.ok) return <p className="mt-3 text-sm text-green">Done. Recorded in the audit log.</p>;
  const v = state.values ?? {};
  return (
    <details className="mt-3">
      <summary className="cursor-pointer text-sm font-semibold">Review this story</summary>
      <form action={action} className="mt-3 space-y-3">
        <Field label="Your summary (2–5 lines, your own words)">
          <Textarea name="summary" minLength={60} maxLength={600} defaultValue={v.summary} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="State">
            <Select name="state" defaultValue={v.state ?? ""}>
              <option value="">Choose…</option>
              {states.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </Field>
          <Field label="District (optional)">
            <Input name="district" maxLength={80} defaultValue={v.district} />
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
        <Field label="Who is responsible (optional)" hint="An office or body named in the report, e.g. 'District Collector, Bastar' or 'Municipal corporation'.">
          <Input name="responsible" maxLength={160} defaultValue={v.responsible} />
        </Field>
        <FormError message={state.error} />
        <div className="flex gap-2">
          <button name="decision" value="PUBLISH" disabled={pending} className="brutal-sm press rounded-md bg-flag-green px-3 py-1.5 text-sm font-semibold text-white">
            Publish
          </button>
          <button name="decision" value="REJECT" disabled={pending} className="brutal-sm press rounded-md bg-surface px-3 py-1.5 text-sm font-semibold text-danger">
            Reject
          </button>
        </div>
      </form>
    </details>
  );
}
