"use client";

import { useState, useTransition } from "react";
import { MailWarning } from "lucide-react";
import { resendVerificationAction } from "@/app/actions";
import { useI18n } from "@/i18n/client";

/** Shown to accounts that haven't clicked the email link yet: their votes don't count until they do. */
export function VerifyBanner() {
  const { t } = useI18n();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div role="status" className="brutal flex flex-wrap items-center gap-3 rounded-md bg-flag-saffron/20 p-4 text-sm">
      <MailWarning className="size-5 shrink-0" aria-hidden />
      <p className="flex-1">{msg ?? t.auth.verifyBanner}</p>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await resendVerificationAction();
            setMsg(res.error ?? t.auth.forgotSent.split(".")[0] + ".");
          })
        }
        className="brutal-sm press rounded-md bg-surface px-3 py-1.5 font-semibold"
      >
        {t.auth.resend}
      </button>
    </div>
  );
}
