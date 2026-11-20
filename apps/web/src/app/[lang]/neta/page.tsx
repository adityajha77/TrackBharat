import { connection } from "next/server";
import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "@/components/link";
import { Eyebrow } from "@/components/ui/card";
import { getT } from "@/i18n/server";
import { getNetas } from "@/lib/api";
import { cn } from "@/lib/utils";
import { NetaBrowser } from "./neta-browser";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.neta.title, description: t.neta.lead };
}

export default async function NetaPage({ searchParams }: PageProps<"/[lang]/neta">) {
  await connection(); // live data: render per request, never at build time (the API isn't running during `next build`)
  const { t } = await getT();
  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <header className="max-w-3xl">
        <Eyebrow>{t.nav.neta}</Eyebrow>
        <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">{t.neta.title}</h1>
        <p className="mt-3 text-lg text-muted">{t.neta.lead}</p>
      </header>
      <Suspense fallback={<div className="mt-10 h-96 animate-pulse rounded-md bg-surface-muted" aria-busy="true" />}>
        {searchParams.then((sp) => (
          <House house={sp.house === "mla" ? "VIDHAN_SABHA" : "LOK_SABHA"} />
        ))}
      </Suspense>
    </div>
  );
}

async function House({ house }: { house: "LOK_SABHA" | "VIDHAN_SABHA" }) {
  const [{ t }, data] = await Promise.all([getT(), getNetas(house)]);
  return (
    <>
      <nav aria-label="House" className="mt-8 inline-flex gap-2">
        {(
          [
            ["LOK_SABHA", "/neta", t.neta.mps],
            ["VIDHAN_SABHA", "/neta?house=mla", t.neta.mlas],
          ] as const
        ).map(([h, href, label]) => (
          <Link key={h} href={href} aria-current={house === h ? "page" : undefined} className={cn("brutal-sm press rounded-md px-4 py-2 text-sm font-bold", house === h ? "bg-ink text-background" : "bg-surface")}>
            {label}
          </Link>
        ))}
      </nav>
      <NetaBrowser
        data={data}
        labels={{ search: t.neta.search, allParties: t.neta.allParties, allStates: t.neta.allStates, results: t.neta.results, noMla: t.neta.noMla, seats: t.neta.seats }}
      />
    </>
  );
}
