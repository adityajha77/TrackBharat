import { Suspense } from "react";
import type { Metadata } from "next";
import { Megaphone } from "lucide-react";
import { CausesSection } from "@/components/voices/causes-section";
import { ButtonLink } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/card";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.causes.title, description: t.causes.lead };
}

export default async function CausesPage() {
  const { t } = await getT();
  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <header className="max-w-3xl">
        <Eyebrow>{t.nav.causes}</Eyebrow>
        <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">{t.causes.title}</h1>
        <p className="mt-3 text-lg text-muted">{t.causes.lead}</p>
        <ButtonLink href="/issues/new" size="sm" className="mt-5">
          <Megaphone className="size-4" aria-hidden /> {t.home.step1Cta}
        </ButtonLink>
      </header>
      <div className="mt-10">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-md bg-surface-muted" aria-busy="true" />}>
          <CausesSection />
        </Suspense>
      </div>
    </div>
  );
}
