"use client";

import { useActionState, useState } from "react";
import { ImagePlus, ShieldCheck } from "lucide-react";
import { PromiseCategory } from "@trackbharat/shared";
import { createIssueAction, type ActionState } from "@/app/actions";
import { CATEGORY } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input, Select, Textarea } from "@/components/ui/field";

const MAX_MB = 8;

export function NewIssueForm({ defaultPincode }: { defaultPincode: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(createIssueAction, {});
  const [preview, setPreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  return (
    // encType is set automatically for Server Actions; the File travels as multipart form data
    <form action={action} className="space-y-5">
      <Field label="What's the problem?" hint="Be specific: what, and where exactly.">
        <Input name="title" required minLength={8} maxLength={120} placeholder="e.g. Deep potholes on Station Road near the bus depot" />
      </Field>
      <Field label="Details">
        <Textarea name="description" required minLength={20} maxLength={2000} placeholder="Since when? Who is affected? Has it been reported before?" />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
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
        <Field label="PIN code where it is" hint="Used to find the constituency.">
          <Input name="pincode" required inputMode="numeric" pattern="[1-9][0-9]{5}" maxLength={6} defaultValue={defaultPincode} className="font-mono tracking-widest" />
        </Field>
      </div>

      <Field label="Photo (optional)" hint={`JPEG, PNG, WebP or HEIC, up to ${MAX_MB} MB.`}>
        <div className="mt-1.5 flex items-center gap-4">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- local blob preview
            <img src={preview} alt="Selected photo preview" className="size-20 rounded-xl object-cover" />
          ) : (
            <span className="inline-flex size-20 items-center justify-center rounded-xl border border-dashed border-border text-muted">
              <ImagePlus className="size-6" aria-hidden />
            </span>
          )}
          <input
            name="photo"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic"
            className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-surface-muted file:px-3 file:py-2 file:text-sm"
            onChange={(e) => {
              const f = e.target.files?.[0];
              setFileError(f && f.size > MAX_MB * 1024 * 1024 ? `That file is larger than ${MAX_MB} MB` : null);
              setPreview(f ? URL.createObjectURL(f) : null);
            }}
          />
        </div>
      </Field>
      <p className="flex gap-2 text-xs text-muted">
        <ShieldCheck className="size-4 shrink-0 text-green" aria-hidden />
        We re-encode every photo and remove hidden location data (GPS) that phones add. Don&apos;t include faces or vehicle number plates.
      </p>

      <FormError message={fileError ?? state.error} />
      <Button type="submit" disabled={pending || !!fileError} className="w-full">
        {pending ? "Submitting…" : "Submit report"}
      </Button>
    </form>
  );
}
