import type { Metadata } from "next";
import { Check, Circle } from "lucide-react";
import { Badge } from "@/components/ui/card";

export const metadata: Metadata = { title: "Roadmap", description: "What TrackBharat is building, phase by phase." };

const phases = [
  {
    name: "Phase 0: Foundation",
    done: true,
    items: ["Monorepo: Next.js web, Fastify API, shared contract", "Postgres + PostGIS with versioned migrations", "PIN code lookup with caching", "Docker, CI, tests"],
  },
  {
    name: "Phase 1: Lok Sabha, MPs & promises",
    done: true,
    items: [
      "PIN code → Lok Sabha constituency for 19,000+ PIN codes (PostGIS spatial join)",
      "All 543 constituencies with boundaries; 540 sitting MPs from sansad.in",
      "Promise tracker: sources, deadlines, status timeline and evidence",
      "Admin API to record promises (every entry requires a source)",
    ],
  },
  {
    name: "Phase 1b: Vidhan Sabha & MLAs",
    done: false,
    items: ["Assembly constituency boundaries", "MLAs from state legislature records", "Candidate affidavits: assets, cases, education (ECI)"],
  },
  {
    name: "Phase 2: Citizen voice",
    done: false,
    items: ["Accounts & roles (citizen, moderator, admin)", "Report local issues with photos", "Weekly top-issues highlight per constituency (scheduled job)", "Moderation, rate limits and an audit log"],
  },
  {
    name: "Phase 3: Report cards",
    done: false,
    items: ["Transparent performance score with a published formula", "Comparison with previous representatives", "Charts and open-data downloads"],
  },
  {
    name: "Phase 4: Production & reach",
    done: false,
    items: ["Deploy with staging + production environments", "Monitoring, error tracking, backups", "Hindi and regional languages", "PWA, then the mobile app (Phase 5)"],
  },
];

export default function RoadmapPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Roadmap</h1>
      <p className="mt-3 text-muted">TrackBharat is built in public, one phase at a time.</p>
      <ol className="mt-10 space-y-6">
        {phases.map((p) => (
          <li key={p.name} className="rounded-2xl border border-border bg-surface p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-semibold">{p.name}</h2>
              {p.done ? <Badge tone="live">Done</Badge> : <Badge tone="soon">Planned</Badge>}
            </div>
            <ul className="mt-4 space-y-2 text-sm">
              {p.items.map((item) => (
                <li key={item} className="flex gap-3">
                  {p.done ? <Check className="mt-0.5 size-4 shrink-0 text-green" aria-hidden /> : <Circle className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />}
                  <span className={p.done ? "" : "text-muted"}>{item}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  );
}
