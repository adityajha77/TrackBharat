"use client";

import { useActionState, useState } from "react";
import { PromiseCategory } from "@trackbharat/shared";
import { submitPromiseAction, type ActionState } from "@/app/actions";
import { CATEGORY } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input, Select, Textarea } from "@/components/ui/field";

export function SubmitPromiseForm({ defaultSeat }: { defaultSeat: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(submitPromiseAction, {});
  const [madeBy, setMadeBy] = useState<"REPRESENTATIVE" | "PARTY">("REPRESENTATIVE");

  return (
    <form action={action} className="space-y-5">
      <Field label="Constituency" hint="Its id from the constituency page address, e.g. “bangalore-south” in /constituency/bangalore-south">
        <Input name="constituencySlug" required defaultValue={defaultSeat} placeholder="bangalore-south" className="font-mono" />
      </Field>
      <Field label="Who made the promise?">
        <Select name="madeBy" value={madeBy} onChange={(e) => setMadeBy(e.target.value as typeof madeBy)}>
          <option value="REPRESENTATIVE">The sitting representative of this seat</option>
          <option value="PARTY">A party, in its manifesto</option>
        </Select>
      </Field>
      {madeBy === "PARTY" && (
        <Field label="Party name" hint="As it appears on the constituency page, e.g. “Bharatiya Janata Party” or “INC”.">
          <Input name="partyName" required minLength={2} />
        </Field>
      )}
      <Field label="The promise, in one line">
        <Input name="title" required minLength={10} maxLength={200} placeholder="e.g. A 100-bed government hospital in the district" />
      </Field>
      <Field label="Details (optional)">
        <Textarea name="description" maxLength={2000} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Category">
          <Select name="category" required defaultValue="">
            <option value="" disabled>
              Choose…
            </option>
            {PromiseCategory.options.map((c) => (
              <option key={c} value={c}>
                {CATEGORY[c]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Made on (optional)">
          <Input name="madeOn" type="date" />
        </Field>
        <Field label="Deadline (optional)">
          <Input name="deadline" type="date" />
        </Field>
      </div>

      <fieldset className="space-y-4 rounded-xl border border-border p-4">
        <legend className="px-1 text-sm font-semibold">Source (required)</legend>
        <Field label="Link" hint="Must start with https://">
          <Input name="sourceUrl" type="url" required pattern="https://.*" placeholder="https://…" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Title" className="sm:col-span-2">
            <Input name="sourceTitle" required minLength={3} />
          </Field>
          <Field label="Type">
            <Select name="sourceKind" defaultValue="NEWS">
              <option value="NEWS">News report</option>
              <option value="MANIFESTO">Manifesto</option>
              <option value="OFFICIAL">Official / government</option>
              <option value="OTHER">Other</option>
            </Select>
          </Field>
        </div>
        <Field label="Publisher">
          <Input name="sourcePublisher" required minLength={2} placeholder="e.g. The Hindu, PIB, party website" />
        </Field>
      </fieldset>

      <FormError message={state.error} />
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Sending…" : "Send for review"}
      </Button>
    </form>
  );
}
