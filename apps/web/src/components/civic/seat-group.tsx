import Link from "next/link";
import { ArrowRight, Building, Landmark } from "lucide-react";
import type { PincodeConstituency } from "@trackbharat/shared";
import { Card } from "@/components/ui/card";
import { RepresentativePhoto } from "./representative-photo";

const HOUSE = {
  LOK_SABHA: { title: "Your Lok Sabha constituency", many: "This PIN code spans more than one Lok Sabha seat", role: "Member of Parliament", icon: Landmark },
  VIDHAN_SABHA: { title: "Your Vidhan Sabha constituency", many: "This PIN code spans more than one assembly seat", role: "MLA", icon: Building },
} as const;

/** The seat(s) a PIN code falls in for one house, each linking to its constituency page. */
export function SeatGroup({ house, seats }: { house: keyof typeof HOUSE; seats: PincodeConstituency[] }) {
  if (!seats.length) return null;
  const h = HOUSE[house];
  return (
    <section aria-label={h.title} className="space-y-3">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <h.icon className="size-5 text-primary" aria-hidden />
        {seats.length > 1 ? h.many : h.title}
      </h2>
      <div className={seats.length > 1 ? "grid gap-4 md:grid-cols-2" : ""}>
        {seats.map((s) => (
          <Link key={s.slug} href={`/constituency/${s.slug}`} className="group block">
            <Card className="flex items-center gap-5 transition-colors group-hover:border-primary">
              {s.representative && <RepresentativePhoto name={s.representative.name} className="size-16 shrink-0 text-lg" />}
              <div className="min-w-0 flex-1">
                <p className="text-xs uppercase tracking-widest text-muted">
                  {s.name} · {s.state}
                  {seats.length > 1 && <> · {Math.round(s.share * 100)}% of post offices</>}
                </p>
                {s.representative ? (
                  <>
                    <p className="mt-1 text-xl font-semibold">{s.representative.name}</p>
                    <p className="text-sm text-muted">
                      {h.role}
                      {s.representative.party && <> · {s.representative.party}</>}
                    </p>
                  </>
                ) : house === "VIDHAN_SABHA" ? (
                  <>
                    <p className="mt-1 text-xl font-semibold">{s.name}</p>
                    <p className="text-sm text-muted">MLA data for {s.state} isn&apos;t available yet</p>
                  </>
                ) : (
                  <p className="mt-1 text-xl font-semibold">Seat vacant</p>
                )}
              </div>
              <span className="hidden items-center gap-1 text-sm font-medium text-primary sm:inline-flex">
                Open <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </span>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
