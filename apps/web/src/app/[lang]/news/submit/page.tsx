import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, Eyebrow } from "@/components/ui/card";
import { getT } from "@/i18n/server";
import { getMe } from "@/lib/api-user";
import { NewsSubmitForm } from "./news-submit-form";

export const metadata: Metadata = { title: "Suggest a story" };

export default async function SubmitNewsPage() {
  const { t } = await getT();
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <Eyebrow>{t.nav.news}</Eyebrow>
      <h1 className="mt-2 text-4xl font-black tracking-tight">{t.news.submit}</h1>
      <p className="mt-3 text-muted">{t.news.submitLead}</p>
      <Card className="mt-8">
        <Suspense fallback={<div className="h-72 animate-pulse rounded-md bg-surface-muted" />}>
          <Gate />
        </Suspense>
      </Card>
    </div>
  );
}

async function Gate() {
  if (!(await getMe().catch(() => null))) redirect("/login?next=/news/submit");
  return <NewsSubmitForm />;
}
