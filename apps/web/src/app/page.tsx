import { BarChart3, FileCheck2, Landmark, Megaphone, MapPin, Scale, ShieldCheck, Database } from "lucide-react";
import { PincodeSearch } from "@/components/pincode-search";
import { Badge, Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";

// Fully static page: prerendered at build time and served from a CDN.

const steps = [
  { icon: MapPin, title: "Enter your PIN code", body: "We find your area, district and, from Phase 1, your Lok Sabha and Vidhan Sabha constituencies." },
  { icon: Landmark, title: "Meet your representatives", body: "Your MP and MLA, their party, term, declared assets and criminal cases, from their own sworn affidavits." },
  { icon: FileCheck2, title: "Track every promise", body: "Each promise links to where it was made, has a deadline, and moves from pending to fulfilled, or broken, with evidence." },
  { icon: BarChart3, title: "Judge performance", body: "Attendance, questions asked, funds used, compared with the previous representative. The formula is public." },
];

const features = [
  { icon: MapPin, title: "PIN code lookup", body: "Area, district and post offices for any of India's ~19,000 PIN codes.", status: "live" as const },
  { icon: FileCheck2, title: "Promise tracker", body: "Sourced promises with deadlines, status history and evidence.", status: "Phase 1" },
  { icon: Landmark, title: "Representative profiles", body: "MP & MLA data from ECI affidavits and parliamentary records.", status: "Phase 1" },
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
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="bg-grid absolute inset-0" />
        <div className="relative mx-auto flex max-w-6xl flex-col items-center px-4 pb-20 pt-20 text-center sm:pt-28">
          <Badge tone="primary" className="mb-6">
            Civic transparency for every Indian citizen
          </Badge>
          <h1 className="max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
            Promises are made at election time. <span className="text-saffron">Track what happens next.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-pretty text-lg text-muted">
            TrackBharat makes political promises measurable and government performance understandable. Start with your
            PIN code.
          </p>
          <PincodeSearch className="mt-10" />
          <p className="text-sm text-muted">
            Try{" "}
            {["110001", "560034", "400001"].map((pin, i) => (
              <span key={pin}>
                {i > 0 && ", "}
                <a href={`/area/${pin}`} className="font-mono text-foreground underline decoration-border underline-offset-4 hover:decoration-primary">
                  {pin}
                </a>
              </span>
            ))}
          </p>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-16">
        <h2 className="text-sm font-medium uppercase tracking-widest text-muted">How it works</h2>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.title}>
              <Card className="h-full">
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

      {/* Features */}
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

      {/* Principles */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <Card className="grid gap-8 bg-surface-muted p-8 sm:p-10 md:grid-cols-3">
          {principles.map((p) => (
            <div key={p.title}>
              <p.icon className="size-5 text-green" aria-hidden />
              <h3 className="mt-4 font-semibold">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{p.body}</p>
            </div>
          ))}
        </Card>
      </section>
    </>
  );
}
