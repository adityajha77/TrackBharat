"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import { forgotPasswordAction, resetPasswordAction, type ActionState } from "@/app/actions";
import Link from "@/components/link";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input } from "@/components/ui/field";
import { useI18n } from "@/i18n/client";

/** "Forgot password" (ask for a link) and "reset password" (use the link). */
export function EmailLinkForms({ mode, token }: { mode: "forgot" | "reset"; token?: string }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState<ActionState, FormData>(mode === "forgot" ? forgotPasswordAction : resetPasswordAction, {});

  if (state.ok)
    return (
      <div role="status" className="space-y-3 text-sm">
        <p className="flex items-start gap-2">
          <CheckCircle2 className="size-5 shrink-0 text-green" aria-hidden />
          {mode === "forgot" ? t.auth.forgotSent : t.auth.resetDone}
        </p>
        {mode === "reset" && (
          <Link href="/login" className="font-semibold underline underline-offset-4">
            {t.account.login} →
          </Link>
        )}
      </div>
    );

  return (
    <form action={action} className="space-y-4">
      {mode === "forgot" ? (
        <Field label={t.auth.email}>
          <Input name="email" type="email" required autoComplete="email" defaultValue={state.values?.email} />
        </Field>
      ) : (
        <>
          <input type="hidden" name="token" value={token} />
          <Field label={t.auth.newPassword} hint="At least 10 characters. A short sentence works well.">
            <Input name="newPassword" type="password" required minLength={10} autoComplete="new-password" />
          </Field>
          <Field label="Repeat the new password">
            <Input name="confirm" type="password" required minLength={10} autoComplete="new-password" />
          </Field>
        </>
      )}
      <FormError message={state.error} />
      <Button disabled={pending} className="w-full">
        {pending ? t.common.loading : mode === "forgot" ? t.auth.sendLink : t.auth.save}
      </Button>
    </form>
  );
}
