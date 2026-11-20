import { Quote, UserRound } from "lucide-react";
import type { PartyLeader } from "@trackbharat/shared";
import type { Dictionary } from "@/i18n/server";

/** A leading figure: photo (free licence, credited), role, years and, where sourced, their words. */
export function LeaderCard({ leader: l, t }: { leader: PartyLeader; t: Dictionary }) {
  return (
    <li className="brutal reveal flex flex-col overflow-hidden rounded-md bg-surface">
      <div className="relative aspect-[4/5] border-b-2 border-ink bg-surface-muted">
        {l.photoPath ? (
          // eslint-disable-next-line @next/next/no-img-element -- our own re-encoded WebP from /media
          <img src={l.photoPath} alt={l.name} loading="lazy" className="absolute inset-0 size-full object-contain p-2 grayscale-[35%]" />
        ) : (
          <UserRound className="absolute inset-0 m-auto size-16 text-muted" aria-hidden />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="font-bold leading-tight">{l.name}</p>
        <p className="font-mono text-xs text-muted">
          {l.role} · {l.years}
        </p>
        {l.quote && (
          <blockquote className="flex gap-1.5 text-sm">
            <Quote className="size-3.5 shrink-0 text-saffron" aria-hidden />
            <span>
              &ldquo;{l.quote}&rdquo;{" "}
              {l.quoteSourceUrl && (
                <a href={l.quoteSourceUrl} target="_blank" rel="noopener noreferrer" className="font-mono text-[10px] underline">
                  {t.common.source}
                </a>
              )}
            </span>
          </blockquote>
        )}
        {l.photoCredit && (
          <p className="mt-auto pt-2 text-[10px] leading-tight text-muted">
            {t.timeline.photoCredit}:{" "}
            <a href={l.photoSourceUrl ?? "#"} target="_blank" rel="noopener noreferrer" className="underline">
              {l.photoCredit}
            </a>
          </p>
        )}
      </div>
    </li>
  );
}
