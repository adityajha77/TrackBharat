import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Building2, Landmark, Mail, Megaphone, MapPin, Users } from "lucide-react";
import { Pincode } from "@trackbharat/shared";
import { ApiError, getPincode, getPincodeConstituencies } from "@/lib/api";
import { Badge, Card } from "@/components/ui/card";
import { PincodeSearch } from "@/components/pincode-search";
import { OutdatedBoundaryNote } from "@/components/civic/bits";
import { RepresentativePhoto } from "@/components/civic/representative-photo";

/**
 * /area/560034, the "your constituency" page.
 *
 * Rendering model (Next.js 16 Cache Components):
 * - The page shell (layout, headings, skeleton) is static and instant.
 * - `params` is only known at request time, so it is awaited INSIDE <Suspense>;
 *   the area details stream in when ready.
 * - getPincode() is "use cache"d, so repeat visits don't hit the API.
 */

export async function generateMetadata({ params }: PageProps<"/area/[pincode]">): Promise<Metadata> {
  const { pincode } = await params;
  return { title: `PIN ${pincode}`, description: `Representatives, promises and local issues for PIN code ${pincode}.` };
}

export default function AreaPage({ params }: PageProps<"/area/[pincode]">) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Suspense fallback={<AreaSkeleton />}>
        {params.then(({ pincode }) => (
          <AreaDetails pincode={pincode} />
        ))}
      </Suspense>
    </div>
  );
}

async function AreaDetails({ pincode }: { pincode: string }) {
  const valid = Pincode.safeParse(pincode);
  if (!valid.success) notFound();

  // Two independent sources, fetched in PARALLEL. allSettled (not all) so one
  // failing (e.g. India Post down) doesn't hide the other (our own database).
  const [areaRes, seatsRes] = await Promise.allSettled([getPincode(valid.data), getPincodeConstituencies(valid.data)]);
  const area = areaRes.status === "fulfilled" ? areaRes.value : null;
  const seats = seatsRes.status === "fulfilled" ? seatsRes.value.constituencies : [];

  if (!area && !seats.length) {
    const err = areaRes.status === "rejected" ? areaRes.reason : null;
    if (err instanceof ApiError && err.status === 404) notFound();
    return <ErrorState message={err instanceof Error ? err.message : "Something went wrong"} />;
  }

  const primary = seats[0];
  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="flex items-center gap-2 text-sm text-muted">
            <MapPin className="size-4" aria-hidden /> PIN code <span className="font-mono text-foreground">{valid.data}</span>
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{area?.district ?? primary?.name}</h1>
          <p className="mt-1 text-lg text-muted">{area?.state ?? primary?.state}</p>
        </div>
        <PincodeSearch className="sm:max-w-xs" />
      </header>

      {/* Your Lok Sabha constituency (one, or several when the PIN straddles a boundary) */}
      <section aria-labelledby="your-mp" className="space-y-4">
        <h2 id="your-mp" className="flex items-center gap-2 text-lg font-semibold">
          <Landmark className="size-5 text-primary" aria-hidden />
          {seats.length > 1 ? "This PIN code spans more than one constituency" : "Your Lok Sabha constituency"}
        </h2>
        {seats.length ? (
          <div className={seats.length > 1 ? "grid gap-4 md:grid-cols-2" : ""}>
            {seats.map((s) => (
              <Link key={s.slug} href={`/constituency/${s.slug}`} className="group block">
                <Card className="flex items-center gap-5 transition-colors group-hover:border-primary">
                  {s.representative && <RepresentativePhoto name={s.representative.name} src={s.representative.imageUrl} className="size-16 shrink-0 text-lg" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs uppercase tracking-widest text-muted">
                      {s.name} · {s.state}
                      {seats.length > 1 && <> · {Math.round(s.share * 100)}% of post offices</>}
                    </p>
                    <p className="mt-1 text-xl font-semibold">{s.representative ? s.representative.name : "Seat vacant"}</p>
                    {s.representative?.party && <p className="text-sm text-muted">Member of Parliament · {s.representative.party}</p>}
                  </div>
                  <span className="hidden items-center gap-1 text-sm font-medium text-primary sm:inline-flex">
                    Promises <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </span>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="border-dashed text-sm text-muted">We couldn&apos;t match this PIN code to a constituency yet.</Card>
        )}
        {seats.some((s) => s.boundaryOutdated) && <OutdatedBoundaryNote />}
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <ComingSoon
          icon={Users}
          title="Your MLA (Vidhan Sabha)"
          phase="Phase 1b"
          body="Your state assembly representative, from each state legislature's records."
        />
        <ComingSoon
          icon={Megaphone}
          title="Top local issues this week"
          phase="Phase 2"
          body="Problems reported by residents, ranked by upvotes and highlighted every week."
        />
      </div>

      {area && <Card>
        <div className="flex items-center justify-between gap-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <Mail className="size-4 text-primary" aria-hidden /> Post offices in this PIN code
          </h2>
          <Badge>{area.postOffices.length}</Badge>
        </div>
        <ul className="mt-4 divide-y divide-border">
          {area.postOffices.map((po) => (
            <li key={po.name} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
              <span className="flex items-center gap-2">
                <Building2 className="size-4 text-muted" aria-hidden />
                {po.name}
                {po.block && <span className="text-muted">· {po.block}</span>}
              </span>
              <span className="flex gap-2">
                <Badge>{po.branchType}</Badge>
                <Badge tone={po.deliveryStatus === "Delivery" ? "live" : "neutral"}>{po.deliveryStatus}</Badge>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-muted">
          Source: India Post · last updated {new Date(area.fetchedAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}
        </p>
      </Card>}
    </div>
  );
}

function ComingSoon({ icon: Icon, title, body, phase }: { icon: typeof Landmark; title: string; body: string; phase: string }) {
  return (
    <Card className="border-dashed">
      <div className="flex items-start justify-between gap-2">
        <Icon className="size-5 text-muted" aria-hidden />
        <Badge tone="soon">{phase}</Badge>
      </div>
      <h2 className="mt-5 font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
    </Card>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <Card className="mx-auto max-w-lg text-center">
      <h1 className="text-xl font-semibold">We couldn&apos;t load this area</h1>
      <p className="mt-2 text-sm text-muted">{message}</p>
    </Card>
  );
}

function AreaSkeleton() {
  return (
    <div className="animate-pulse space-y-8" aria-busy="true" aria-label="Loading area">
      <div className="space-y-3">
        <div className="h-4 w-32 rounded bg-surface-muted" />
        <div className="h-10 w-64 rounded bg-surface-muted" />
        <div className="h-5 w-40 rounded bg-surface-muted" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-44 rounded-2xl bg-surface-muted" />
        ))}
      </div>
      <div className="h-64 rounded-2xl bg-surface-muted" />
    </div>
  );
}
