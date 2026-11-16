import { Suspense } from "react";
import { ArrowRight, Database, Landmark, Megaphone, ScrollText, ShieldCheck, Users, Vote } from "lucide-react";
import Link from "@/components/link";
import { PincodeSearch } from "@/components/pincode-search";
import { TodayTeaser } from "@/components/issues/today-teaser";
import { TricolourRibbon } from "@/components/india/tricolour-ribbon";
import { CausesSection } from "@/components/voices/causes-section";
import { NewsCard } from "@/components/voices/news-card";
import { Ring, StatusBar } from "@/components/voices/progress";
import { ButtonLink } from "@/components/ui/button";
import { Badge, Eyebrow, Stamp } from "@/components/ui/card";
import { getT } from "@/i18n/server";
import { getNews, getParties } from "@/lib/api";

/**
 * HOME: the whole idea in one scroll.
 *   hero → motto → "what we do" in 3 steps → this week's causes (vote) →
 *   what India asks today → news that needs a voice → promised vs done → ideology
 * The shell is static; the live sections stream in inside <Suspense>.
 */
export default async function HomePage() {
  const { t } = await getT();

  const steps = [
    { n: 1, icon: Megaphone, title: t.home.step1Title, body: t.home.step1Body, cta: t.home.step1Cta, href: "/issues/new", tone: "bg-flag-saffron" },
    { n: 2, icon: Vote, title: t.home.step2Title, body: t.home.step2Body, cta: t.home.step2Cta, href: "/causes", tone: "bg-flag-white" },
    { n: 3, icon: Landmark, title: t.home.step3Title, body: t.home.step3Body, cta: t.home.step3Cta, href: "/neta", tone: "bg-flag-green" },
  ];
  const facts = [
    { value: "96.8 Cr", label: t.home.factVoters },
    { value: "543", label: t.home.factLs },
    { value: "4,000+", label: t.home.factVs },
    { value: "19,000+", label: t.home.factPins },
  ];
  const principles = [
    { icon: ShieldCheck, title: t.home.principle1Title, body: t.home.principle1Body },
    { icon: Users, title: t.home.principle2Title, body: t.home.principle2Body },
    { icon: Database, title: t.home.principle3Title, body: t.home.principle3Body },
  ];

  return (
    <>
      {/* ---------------- Hero ---------------- */}
      <section className="relative overflow-hidden border-b-2 border-ink">
        <div aria-hidden className="bg-grid pointer-events-none absolute inset-0" />
        <div className="relative mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)] items-center gap-10 px-4 pb-14 pt-10 sm:pt-14 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="flex flex-col items-start">
            <Stamp className="mb-6 bg-surface text-foreground" tilt={-2}>
              {t.home.badge}
            </Stamp>
            <h1 className="text-balance text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
              {t.home.title1}
              <br />
              <span className="relative inline-block">
                <span aria-hidden className="absolute inset-x-0 bottom-1 -z-10 h-3 bg-flag-saffron/70 sm:h-5" />
                {t.home.title2}
              </span>
              <br />
              <span className="text-flag-green dark:text-green">{t.home.title3}</span>
            </h1>
            <p className="mt-6 max-w-xl text-pretty text-lg text-muted">{t.home.lead}</p>
            <PincodeSearch className="mt-8 w-full max-w-xl" />
            <p className="mt-1 text-sm text-muted">
              {t.home.try}{" "}
              {[
                ["110001", "New Delhi"],
                ["560034", "Bengaluru"],
                ["400001", "Mumbai"],
              ].map(([pin, city], i) => (
                <span key={pin}>
                  {i > 0 && " · "}
                  <Link href={`/area/${pin}`} className="font-medium text-foreground underline decoration-saffron decoration-2 underline-offset-4">
                    <span className="font-mono">{pin}</span> {city}
                  </Link>
                </span>
              ))}
            </p>
          </div>
          <TricolourRibbon className="mx-auto w-full max-w-[300px] sm:max-w-[380px]" />
        </div>
        {/* India in numbers, as a strip */}
        <dl className="relative grid grid-cols-2 border-t-2 border-ink bg-surface sm:grid-cols-4">
          {facts.map((f, i) => (
            <div key={f.label} className={`px-4 py-5 text-center ${i > 0 ? "border-ink sm:border-l-2" : ""} ${i % 2 ? "border-l-2 border-ink" : ""} ${i > 1 ? "border-t-2 sm:border-t-0" : ""}`}>
              <dt className="order-2 text-xs font-medium uppercase tracking-wide text-muted">{f.label}</dt>
              <dd className="font-mono text-2xl font-bold sm:text-3xl">{f.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ---------------- Motto ---------------- */}
      <section aria-label={t.home.mottoLabel} className="border-b-2 border-ink bg-ink text-background">
        <figure className="mx-auto max-w-5xl px-4 py-12 text-center sm:py-16">
          <Eyebrow className="justify-center text-background/70">{t.home.mottoLabel}</Eyebrow>
          <blockquote className="mt-4 text-balance text-2xl font-bold leading-snug sm:text-4xl">&ldquo;{t.home.motto}&rdquo;</blockquote>
          <p className="mt-4 font-hindi text-lg text-background/80" lang="hi">
            &ldquo;हम किसी पार्टी या धर्म से नहीं हैं। हमारा एक ही उद्देश्य है: पारदर्शिता।&rdquo;
          </p>
          <figcaption className="mt-3 font-mono text-xs uppercase tracking-widest text-flag-saffron">{t.home.mottoBy}</figcaption>
        </figure>
      </section>

      {/* ---------------- What we do: 3 steps ---------------- */}
      <section id="how-it-works" className="mx-auto max-w-7xl scroll-mt-28 px-4 py-16">
        <Eyebrow>{t.home.whatTitle}</Eyebrow>
        <ol className="mt-6 grid gap-5 lg:grid-cols-3">
          {steps.map((s) => (
            <li key={s.n} className="brutal reveal relative flex flex-col overflow-hidden rounded-md bg-surface">
              <div className={`flex items-center justify-between border-b-2 border-ink px-5 py-3 ${s.tone} ${s.tone === "bg-flag-white" ? "text-ink" : "text-ink"}`}>
                <span className="font-mono text-3xl font-black">0{s.n}</span>
                <s.icon className="size-7" aria-hidden />
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h2 className="text-xl font-bold leading-tight">{s.title}</h2>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{s.body}</p>
                <ButtonLink href={s.href} variant={s.n === 2 ? "primary" : "secondary"} size="sm" className="mt-5 self-start">
                  {s.cta} <ArrowRight className="size-4" aria-hidden />
                </ButtonLink>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------------- Causes of the Week ---------------- */}
      <section className="border-y-2 border-ink bg-surface-muted">
        <div className="mx-auto max-w-7xl px-4 py-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <Eyebrow>{t.nav.causes}</Eyebrow>
              <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">{t.causes.title}</h2>
              <p className="mt-2 max-w-2xl text-muted">{t.causes.lead}</p>
            </div>
            <ButtonLink href="/causes" variant="secondary" size="sm">
              {t.causes.all} <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
          </div>
          <div className="mt-8">
            <Suspense fallback={<div className="h-64 animate-pulse rounded-md bg-surface" />}>
              <CausesSection limit={4} />
            </Suspense>
          </div>
        </div>
      </section>

      {/* Live: what citizens across India are raising today (renders nothing without data) */}
      <Suspense fallback={null}>
        <TodayTeaser />
      </Suspense>

      {/* ---------------- News that needs a voice ---------------- */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Eyebrow>{t.nav.news}</Eyebrow>
            <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">{t.home.newsTitle}</h2>
          </div>
          <ButtonLink href="/news" variant="secondary" size="sm">
            {t.home.newsCta} <ArrowRight className="size-4" aria-hidden />
          </ButtonLink>
        </div>
        <Suspense fallback={<div className="mt-8 h-48 animate-pulse rounded-md bg-surface-muted" />}>
          <NewsStrip />
        </Suspense>
      </section>

      {/* ---------------- Promised vs done + timeline ---------------- */}
      <section className="mx-auto max-w-7xl px-4 pb-16">
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="brutal reveal rounded-md bg-surface p-6 lg:col-span-2">
            <Eyebrow>{t.nav.manifestos}</Eyebrow>
            <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">{t.home.manifestoTitle}</h2>
            <p className="mt-2 max-w-xl text-sm text-muted">{t.home.manifestoBody}</p>
            <Suspense fallback={<div className="mt-6 h-32 animate-pulse rounded-md bg-surface-muted" />}>
              <ManifestoTeaser />
            </Suspense>
            <ButtonLink href="/parties" size="sm" className="mt-6">
              {t.home.manifestoCta} <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
          </div>
          <Link href="/timeline" className="brutal press reveal flex flex-col justify-between gap-6 rounded-md bg-flag-navy p-6 text-white">
            <ScrollText className="size-8" aria-hidden />
            <div>
              <h2 className="text-2xl font-black leading-tight">{t.home.timelineTitle}</h2>
              <p className="mt-2 text-sm text-white/80">{t.home.timelineBody}</p>
              <span className="mt-4 inline-flex items-center gap-1 font-semibold underline underline-offset-4">
                {t.home.timelineCta} <ArrowRight className="size-4" aria-hidden />
              </span>
            </div>
          </Link>
        </div>
      </section>

      {/* ---------------- Our ideology ---------------- */}
      <section className="border-t-2 border-ink bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-16">
          <Eyebrow>{t.home.ideologyTitle}</Eyebrow>
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {principles.map((p) => (
              <div key={p.title} className="brutal reveal rounded-md bg-background p-5">
                <p.icon className="size-6 text-flag-green dark:text-green" aria-hidden />
                <h3 className="mt-4 text-lg font-bold">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{p.body}</p>
              </div>
            ))}
          </div>
          <ButtonLink href="/ideology" variant="dark" size="sm" className="mt-8">
            {t.home.ideologyCta} <ArrowRight className="size-4" aria-hidden />
          </ButtonLink>
        </div>
      </section>
    </>
  );
}

async function NewsStrip() {
  const [{ t }, news] = await Promise.all([getT(), getNews().catch(() => null)]);
  const items = news?.items.slice(0, 4) ?? [];
  if (!items.length) return <p className="brutal mt-8 rounded-md bg-surface p-6 text-sm text-muted">{t.news.empty}</p>;
  return (
    <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((n) => (
        <NewsCard key={n.id} item={n} t={t} compact />
      ))}
    </div>
  );
}

async function ManifestoTeaser() {
  const [{ t }, data] = await Promise.all([getT(), getParties().catch(() => null)]);
  const top = (data?.parties ?? [])
    .filter((p) => p.promises > 0)
    .sort((a, b) => b.seatsLokSabha - a.seatsLokSabha)
    .slice(0, 2);
  if (!top.length) return null;
  return (
    <div className="mt-6 grid gap-5 sm:grid-cols-2">
      {top.map((p) => {
        const rated = p.promises - (p.byStatus.NOT_RATED ?? 0) - (p.byStatus.NOT_IN_POWER ?? 0);
        return (
          <Link key={p.slug} href={`/parties/${p.slug}`} className="brutal-sm press flex items-center gap-4 rounded-md bg-background p-4">
            <Ring value={rated ? (p.byStatus.FULFILLED ?? 0) / p.promises : 0} label={t.parties.fulfilled} size={76} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="inline-block size-3 rounded-sm border border-ink" style={{ background: p.color }} />
                <span className="font-bold">{p.shortName ?? p.name}</span>
                <Badge>{p.promises}</Badge>
              </div>
              <div className="mt-3">
                <StatusBar byStatus={p.byStatus} t={t} />
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
