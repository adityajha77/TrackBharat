import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "@/components/link";
import { Card } from "@/components/ui/card";
import { getT } from "@/i18n/server";
import { EmailLinkForms } from "../forgot-password/forms";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

export default async function ResetPasswordPage({ searchParams }: PageProps<"/[lang]/reset-password">) {
  const { t } = await getT();
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-3xl font-black tracking-tight">{t.auth.resetTitle}</h1>
      <Card className="mt-8">
        <Suspense fallback={null}>
          {searchParams.then((sp) =>
            typeof sp.token === "string" && sp.token.length >= 20 ? (
              <EmailLinkForms mode="reset" token={sp.token} />
            ) : (
              <p className="text-sm">
                {t.auth.verifyFailed}{" "}
                <Link href="/forgot-password" className="font-semibold underline">
                  {t.auth.forgot}
                </Link>
              </p>
            ),
          )}
        </Suspense>
      </Card>
    </div>
  );
}
