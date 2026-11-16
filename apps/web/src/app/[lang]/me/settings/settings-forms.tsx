"use client";

import { useActionState } from "react";
import { changePasswordAction, deleteAccountAction, type ActionState } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, FormError, Input } from "@/components/ui/field";

export function SettingsForms() {
  const [pw, pwAction, pwPending] = useActionState<ActionState, FormData>(changePasswordAction, {});
  const [del, delAction, delPending] = useActionState<ActionState, FormData>(deleteAccountAction, {});

  return (
    <>
      <Card>
        <h2 className="text-lg font-semibold">Change password</h2>
        <p className="mt-1 text-sm text-muted">Changing your password logs you out of every other device.</p>
        <form action={pwAction} className="mt-4 space-y-4">
          <Field label="Current password">
            <Input name="currentPassword" type="password" autoComplete="current-password" required />
          </Field>
          <Field label="New password" hint="At least 10 characters.">
            <Input name="newPassword" type="password" autoComplete="new-password" required minLength={10} />
          </Field>
          <FormError message={pw.error} />
          {pw.ok && <p role="status" className="text-sm text-green">Password changed. Other devices were logged out.</p>}
          <Button type="submit" disabled={pwPending}>
            {pwPending ? "Saving…" : "Change password"}
          </Button>
        </form>
      </Card>

      <Card className="border-danger/40">
        <h2 className="text-lg font-semibold text-danger">Delete my account</h2>
        <p className="mt-1 text-sm text-muted">
          This permanently deletes your account, your reports, your votes and your photos. It cannot be undone. Records of moderator decisions stay,
          but no longer point to you.
        </p>
        <form action={delAction} className="mt-4 space-y-4">
          <Field label="Password">
            <Input name="password" type="password" autoComplete="current-password" required />
          </Field>
          <Field label="Type DELETE to confirm">
            <Input name="confirm" autoComplete="off" required pattern="DELETE" placeholder="DELETE" />
          </Field>
          <FormError message={del.error} />
          <button
            type="submit"
            disabled={delPending}
            className="inline-flex h-11 items-center rounded-lg bg-danger px-5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {delPending ? "Deleting…" : "Delete my account forever"}
          </button>
        </form>
      </Card>
    </>
  );
}
