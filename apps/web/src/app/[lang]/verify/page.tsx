import { Suspense } from "react";
import type { Metadata } from "next";
import { CheckCircle2, XCircle } from "lucide-react";
import Link from "@/components/link";
import { Card } from "@/components/ui/card";
import { getT } from "@/i18n/server";
import { verifyEmail } from "@/lib/api-user";

export const metadata: Metadata = { title: "Verify your email", robots: { index: false } };

/** The link in the verification email lands here; the token is checked once, server-side. */
export default async function VerifyPage({ searchParams }: PageProps<"/[lang]/verify">) {
  const { t } = await getT();
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-3xl font-black tracking-tight">{t.auth.verifyTitle}</h1>
      <Card className="mt-8">
        <Suspense fallback={<p className="text-sm text-muted">{t.common.loading}</p>}>
          {searchParams.then((sp) => (
            <Result token={typeof sp.token === "string" ? sp.token : ""} />
          ))}
        </Suspense>
      </Card>
    </div>
  );
}

async function Result({ token }: { token: string }) {
  const { t } = await getT();
  const ok = token.length >= 20 && (await verifyEmail(token).then(() => true, () => false));
  return ok ? (
    <div className="space-y-3 text-sm">
      <p className="flex items-center gap-2">
        <CheckCircle2 className="size-5 text-green" aria-hidden /> {t.auth.verifyDone}
      </p>
      <Link href="/causes" className="font-semibold underline underline-offset-4">
        {t.home.step2Cta} →
      </Link>
    </div>
  ) : (
    <div className="space-y-3 text-sm">
      <p className="flex items-start gap-2">
        <XCircle className="size-5 shrink-0 text-danger" aria-hidden /> {t.auth.verifyFailed}
      </p>
      <Link href="/me/settings" className="font-semibold underline underline-offset-4">
        {t.account.settings} →
      </Link>
    </div>
  );
}
