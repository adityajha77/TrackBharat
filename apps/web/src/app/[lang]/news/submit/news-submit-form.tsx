"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import { submitNewsAction, type ActionState } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input, Textarea } from "@/components/ui/field";
import { useI18n } from "@/i18n/client";

export function NewsSubmitForm() {
  const { t } = useI18n();
  const [state, action, pending] = useActionState<ActionState, FormData>(submitNewsAction, {});
  if (state.ok)
    return (
      <p role="status" className="flex items-center gap-2 text-sm">
        <CheckCircle2 className="size-5 text-green" aria-hidden /> {t.news.pending}
      </p>
    );
  const v = state.values ?? {};
  return (
    <form action={action} className="space-y-4">
      <Field label="Link to the story" hint="A full https:// link to the original report.">
        <Input name="url" type="url" required placeholder="https://…" defaultValue={v.url} />
      </Field>
      <Field label="Headline" hint="As published. We write our own short summary; we never copy the article.">
        <Input name="headline" required minLength={10} maxLength={200} defaultValue={v.headline} />
      </Field>
      <Field label="Why does it need a voice? (optional)">
        <Textarea name="note" maxLength={500} defaultValue={v.note} />
      </Field>
      <FormError message={state.error} />
      <Button disabled={pending}>{pending ? t.common.loading : t.news.submit}</Button>
    </form>
  );
}
