import { BriefcaseBusiness, GraduationCap, Repeat } from "lucide-react";
import type { Representative } from "@trackbharat/shared";
import { Badge, Card } from "@/components/ui/card";
import { RepresentativePhoto } from "./representative-photo";
import { SourceLink } from "./bits";

/** 1 → "1st", 2 → "2nd", 11 → "11th", 18 → "18th", 22 → "22nd" */
function ordinal(n: number) {
  const suffixes = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (suffixes[(v - 20) % 10] ?? suffixes[v] ?? suffixes[0]);
}

export function RepresentativeCard({ rep, title, house = "LOK_SABHA" }: { rep: Representative; title?: string; house?: "LOK_SABHA" | "VIDHAN_SABHA" }) {
  const role = title ?? (house === "LOK_SABHA" ? "Member of Parliament" : "Member of the Legislative Assembly");
  // Lok Sabha terms are numbered (18th); state assemblies are stored by election year.
  const term = house === "LOK_SABHA" ? `${ordinal(rep.legislature)} Lok Sabha` : `elected ${rep.legislature}`;
  return (
    <Card className="flex flex-col gap-5 sm:flex-row">
      <RepresentativePhoto name={rep.name} src={rep.imageUrl} className="size-24 shrink-0 text-2xl sm:size-28" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-widest text-muted">
          {role} · {term}
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">{rep.name}</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {rep.party && (
            <Badge tone="primary" title={rep.party.name}>
              {rep.party.name}
              {rep.party.shortName && rep.party.shortName !== rep.party.name && <span className="opacity-70">({rep.party.shortName})</span>}
            </Badge>
          )}
          {rep.status !== "SITTING" && <Badge tone="soon">{rep.status === "DIED" ? "Died in office" : rep.status === "RESIGNED" ? "Resigned" : rep.status.toLowerCase()}</Badge>}
        </div>
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
          {rep.termsServed != null && (
            <div className="flex items-center gap-2">
              <Repeat className="size-4 text-muted" aria-hidden />
              <dt className="sr-only">Terms</dt>
              <dd>{rep.termsServed === 1 ? "First term" : `${rep.termsServed} terms`}</dd>
            </div>
          )}
          {rep.education && (
            <div className="flex items-center gap-2">
              <GraduationCap className="size-4 text-muted" aria-hidden />
              <dt className="sr-only">Education</dt>
              <dd>{rep.education}</dd>
            </div>
          )}
          {rep.profession && (
            <div className="flex min-w-0 items-center gap-2">
              <BriefcaseBusiness className="size-4 shrink-0 text-muted" aria-hidden />
              <dt className="sr-only">Profession</dt>
              <dd className="truncate" title={rep.profession}>
                {rep.profession}
              </dd>
            </div>
          )}
        </dl>
        <SourceLink source={rep.source} className="mt-4" />
      </div>
    </Card>
  );
}
