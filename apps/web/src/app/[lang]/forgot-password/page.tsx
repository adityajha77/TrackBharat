import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { getT } from "@/i18n/server";
import { EmailLinkForms } from "./forms";

export const metadata: Metadata = { title: "Reset your password" };

export default async function ForgotPasswordPage() {
  const { t } = await getT();
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-3xl font-black tracking-tight">{t.auth.forgotTitle}</h1>
      <p className="mt-2 text-muted">{t.auth.forgotLead}</p>
      <Card className="mt-8">
        <EmailLinkForms mode="forgot" />
      </Card>
    </div>
  );
}
