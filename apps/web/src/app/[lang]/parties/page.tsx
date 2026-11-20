import { connection } from "next/server";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import Link from "@/components/link";
import { fulfilledShare, Ring, StatusBar } from "@/components/voices/progress";
import { Eyebrow } from "@/components/ui/card";
import { fmt, getT } from "@/i18n/server";
import { getParties } from "@/lib/api";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.parties.title, description: t.parties.lead };
}

/** Parties in founding order: never ranked by size or score. */
export default async function PartiesPage() {
  await connection(); // live data: render per request, never at build time (the API isn't running during `next build`)
  const [{ t }, { parties }] = await Promise.all([getT(), getParties()]);
  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <header className="max-w-3xl">
        <Eyebrow>{t.nav.manifestos}</Eyebrow>
        <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">{t.parties.title}</h1>
        <p className="mt-3 text-lg text-muted">{t.parties.lead}</p>
      </header>
      <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {parties.map((p) => {
          const share = fulfilledShare(p.byStatus, p.promises);
          return (
            <li key={p.slug}>
              <Link href={`/parties/${p.slug}`} className="brutal press reveal flex h-full flex-col gap-4 overflow-hidden rounded-md bg-surface">
                <div className="h-2 border-b-2 border-ink" style={{ background: p.color }} aria-hidden />
                <div className="flex flex-1 flex-col gap-4 px-5 pb-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-black leading-tight">{p.name}</h2>
                      <p className="mt-1 font-mono text-xs text-muted">
                        {p.shortName} · {t.timeline.founded} {p.founded.slice(0, 4)} · {p.symbol}
                      </p>
                    </div>
                    {share !== null && <Ring value={share} label={t.parties.fulfilled} size={64} />}
                  </div>
                  {p.promises > 0 ? (
                    <>
                      <p className="font-mono text-xs">{fmt(t.parties.promises, { n: p.promises })}</p>
                      <StatusBar byStatus={p.byStatus} t={t} />
                    </>
                  ) : (
                    <p className="text-sm text-muted">{t.parties.notRated}: manifesto promises not added yet. History and leaders are on the timeline.</p>
                  )}
                  <span className="mt-auto inline-flex items-center gap-1 text-sm font-semibold">
                    {p.seatsLokSabha} Lok Sabha seats <ArrowRight className="size-4" aria-hidden />
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
