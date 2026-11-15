import { BarChart3, FileCheck2, Landmark, Megaphone, MapPin, Scale, ShieldCheck, Database } from "lucide-react";
import { PincodeSearch } from "@/components/pincode-search";
import { Badge, Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { WavingFlag } from "@/components/india/waving-flag";
import { AshokaChakra, IndiaFlag } from "@/components/india/flag";

// Fully static page: prerendered at build time and served from a CDN.

/** Headline facts about Indian democracy. Each has a public source (ECI / India Post). */
const indiaFacts = [
  { value: "96.8 Cr", label: "registered voters", note: "General Election 2024 (ECI)" },
  { value: "543", label: "Lok Sabha constituencies", note: "one MP each" },
  { value: "4,000+", label: "Vidhan Sabha constituencies", note: "one MLA each" },
  { value: "19,000+", label: "PIN codes", note: "India Post" },
];

const steps = [
  { icon: MapPin, title: "Enter your PIN code", body: "We find your area, district and, from Phase 1, your Lok Sabha and Vidhan Sabha constituencies." },
  { icon: Landmark, title: "Meet your representatives", body: "Your MP and MLA, their party, term, declared assets and criminal cases, from their own sworn affidavits." },
  { icon: FileCheck2, title: "Track every promise", body: "Each promise links to where it was made, has a deadline, and moves from pending to fulfilled, or broken, with evidence." },
  { icon: BarChart3, title: "Judge performance", body: "Attendance, questions asked, funds used, compared with the previous representative. The formula is public." },
];

const features = [
  { icon: MapPin, title: "PIN code lookup", body: "Area, district and post offices for any of India's ~19,000 PIN codes.", status: "live" as const },
  { icon: FileCheck2, title: "Promise tracker", body: "Sourced promises with deadlines, status history and evidence.", status: "live" as const },
  { icon: Landmark, title: "Representative profiles", body: "All 540 sitting MPs from Parliament's records; MLAs next.", status: "live" as const },
  { icon: Megaphone, title: "Citizen issue board", body: "Report local problems with photos; the community upvotes; the top issues are highlighted every week.", status: "Phase 2" },
  { icon: BarChart3, title: "Constituency report card", body: "A transparent score with the formula published, and history across terms.", status: "Phase 3" },
  { icon: Scale, title: "Know your rights", body: "RTI, voting rights, education, food and work guarantees in plain language.", status: "live" as const },
];

const principles = [
  { icon: ShieldCheck, title: "Every claim has a source", body: "No source, no claim. Promises and evidence link to the original manifesto, speech, gazette or news report." },
  { icon: Scale, title: "Non-partisan by design", body: "The same rules and the same formula for every party and every representative." },
  { icon: Database, title: "Open data", body: "Everything you can see, you can download. Researchers and journalists are welcome." },
];

export default function HomePage() {
  return (
    <>
      {/* ---------------- Hero ---------------- */}
      <section className="relative overflow-hidden">
        {/* Tricolour light: saffron from the top, green from the bottom */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -left-40 -top-48 size-[36rem] rounded-full bg-flag-saffron/25 blur-3xl dark:bg-flag-saffron/15" />
          <div className="absolute -bottom-56 -right-40 size-[36rem] rounded-full bg-flag-green/20 blur-3xl dark:bg-flag-green/20" />
          <div className="bg-grid absolute inset-0" />
          {/* Giant Ashoka Chakra watermark, turning very slowly */}
          <AshokaChakra
            color="currentColor"
            className="chakra-spin absolute -right-48 top-1/2 size-[44rem] -translate-y-1/2 text-flag-navy opacity-[0.05] dark:text-white dark:opacity-[0.04]"
          />
        </div>

        {/* minmax(0,1fr): stop the column growing to fit its widest child on small screens */}
        <div className="relative mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] items-center gap-8 px-4 pb-16 pt-10 sm:pt-16 lg:grid-cols-[1.15fr_0.85fr] lg:gap-6 lg:pb-24">
          {/* Flag first on mobile (above the headline), right column on desktop */}
          <div className="order-first mx-auto w-full max-w-[220px] sm:max-w-[280px] lg:order-last lg:max-w-[420px]">
            <WavingFlag />
            <p className="mt-6 hidden text-center font-hindi text-lg font-medium text-muted lg:block">हर वादे का हिसाब</p>
          </div>

          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
            <Badge tone="neutral" className="mb-6 flex-wrap justify-center gap-x-2 gap-y-0.5 border border-border bg-surface px-3 py-1 text-foreground">
              <IndiaFlag className="h-3 w-[18px]" />
              For every Indian citizen
              <span className="font-hindi text-muted">· हर नागरिक के लिए</span>
            </Badge>

            <h1 className="max-w-2xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              Promises are made at election time.{" "}
              <span className="bg-gradient-to-r from-flag-saffron via-saffron to-flag-green bg-clip-text text-transparent">
                Track what happens next.
              </span>
            </h1>

            <p className="mt-5 font-hindi text-xl font-medium text-foreground/90 sm:text-2xl" lang="hi">
              चेहरा नहीं, तथ्य देखकर वोट करें।
            </p>

            <p className="mt-4 max-w-xl text-pretty text-lg text-muted">
              TrackBharat makes political promises measurable and government performance understandable. Start with your
              PIN code.
            </p>

            <PincodeSearch className="mt-8" />
            <p className="text-sm text-muted">
              Try{" "}
              {[
                ["110001", "New Delhi"],
                ["560034", "Bengaluru"],
                ["400001", "Mumbai"],
              ].map(([pin, city], i) => (
                <span key={pin}>
                  {i > 0 && " · "}
                  <a href={`/area/${pin}`} className="text-foreground underline decoration-border underline-offset-4 hover:decoration-saffron">
                    <span className="font-mono">{pin}</span> {city}
                  </a>
                </span>
              ))}
            </p>
          </div>
        </div>
      </section>

      {/* ---------------- India in numbers ---------------- */}
      <section aria-label="Indian democracy in numbers" className="border-y border-border bg-surface">
        <div aria-hidden className="flex h-1">
          <span className="flex-1 bg-flag-saffron" />
          <span className="flex-1 bg-flag-white dark:bg-white/80" />
          <span className="flex-1 bg-flag-green" />
        </div>
        <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-px bg-border lg:grid-cols-4">
          {indiaFacts.map((f) => (
            <div key={f.label} className="bg-surface px-4 py-8 text-center sm:px-6">
              <dt className="sr-only">{f.label}</dt>
              <dd>
                <span className="block font-mono text-3xl font-semibold tracking-tight sm:text-4xl">{f.value}</span>
                <span className="mt-1 block text-sm font-medium">{f.label}</span>
                <span className="mt-0.5 block text-xs text-muted">{f.note}</span>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ---------------- How it works ---------------- */}
      <section id="how-it-works" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-16 sm:py-20">
        <h2 className="text-sm font-medium uppercase tracking-widest text-muted">How it works</h2>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.title}>
              <Card className="relative h-full overflow-hidden">
                {/* Each step card carries one colour of the tricolour on its top edge */}
                <span
                  aria-hidden
                  className={`absolute inset-x-0 top-0 h-0.5 ${["bg-flag-saffron", "bg-flag-navy dark:bg-primary", "bg-flag-green", "bg-flag-saffron"][i]}`}
                />
                <div className="flex items-center justify-between">
                  <s.icon className="size-5 text-primary" aria-hidden />
                  <span className="font-mono text-sm text-muted">0{i + 1}</span>
                </div>
                <h3 className="mt-6 font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------------- Features ---------------- */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-sm font-medium uppercase tracking-widest text-muted">What you can do</h2>
            <p className="mt-3 max-w-xl text-2xl font-semibold tracking-tight">Built in public, phase by phase.</p>
          </div>
          <ButtonLink href="/roadmap" variant="secondary" size="sm">
            See the roadmap
          </ButtonLink>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Card key={f.title} className="flex flex-col">
              <div className="flex items-start justify-between gap-4">
                <span className="inline-flex size-10 items-center justify-center rounded-xl bg-surface-muted">
                  <f.icon className="size-5 text-foreground" aria-hidden />
                </span>
                {f.status === "live" ? <Badge tone="live">● Live</Badge> : <Badge tone="soon">{f.status}</Badge>}
              </div>
              <h3 className="mt-5 font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{f.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* ---------------- We, the people ---------------- */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-surface-muted p-8 sm:p-12">
          <AshokaChakra
            color="currentColor"
            className="absolute -bottom-24 -right-24 size-80 text-flag-navy opacity-[0.07] dark:text-white dark:opacity-[0.05]"
          />
          <figure className="relative max-w-3xl">
            <blockquote className="text-2xl font-semibold tracking-tight sm:text-3xl">
              &ldquo;We, the people of India&hellip;&rdquo;
            </blockquote>
            <figcaption className="mt-2 text-sm text-muted">The first words of the Constitution of India</figcaption>
            <p className="mt-6 text-pretty text-muted">
              Power in a democracy begins with citizens, and it doesn&apos;t end on polling day. TrackBharat exists so that
              every promise made to you can be checked, by you.
            </p>
          </figure>
          <div className="relative mt-10 grid gap-8 md:grid-cols-3">
            {principles.map((p) => (
              <div key={p.title}>
                <p.icon className="size-5 text-flag-green dark:text-green" aria-hidden />
                <h3 className="mt-4 font-semibold">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
