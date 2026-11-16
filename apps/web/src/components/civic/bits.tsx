import { ExternalLink, FlaskConical, TriangleAlert } from "lucide-react";
import type { PromiseStatus, Source } from "@trackbharat/shared";
import { STATUS } from "@/lib/labels";
import { cn } from "@/lib/utils";

/** Coloured pill for a promise status, with the Hindi label for screen readers too. */
export function StatusBadge({ status, className }: { status: PromiseStatus; className?: string }) {
  const s = STATUS[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium", s.badge, className)}>
      <span aria-hidden className={cn("size-1.5 rounded-full", s.dot)} />
      {s.label}
      <span className="sr-only"> ({s.hi})</span>
    </span>
  );
}

/** Every claim on the site links back to where it came from. */
export function SourceLink({ source, className }: { source: Source; className?: string }) {
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className={cn("inline-flex items-center gap-1 text-xs text-muted underline decoration-border underline-offset-2 hover:text-foreground", className)}
    >
      Source: {source.publisher}
      <ExternalLink className="size-3" aria-hidden />
    </a>
  );
}

export function DemoNotice() {
  return (
    <div role="note" className="flex items-start gap-3 rounded-md border border-saffron/40 bg-saffron/10 px-4 py-3 text-sm">
      <FlaskConical className="mt-0.5 size-4 shrink-0 text-saffron" aria-hidden />
      <p>
        <strong>Demo data.</strong> This constituency, its representative, party and promises are fictional. They exist only to
        show how the promise tracker works.
      </p>
    </div>
  );
}

export function OutdatedBoundaryNote() {
  return (
    <div role="note" className="flex items-start gap-3 brutal rounded-md bg-surface-muted px-4 py-3 text-sm">
      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-saffron" aria-hidden />
      <p className="text-muted">
        <strong className="text-foreground">Boundaries changed recently.</strong> Constituencies in Assam (2023) and Jammu &amp;
        Kashmir (2022) were redrawn after our open boundary map was made, so PIN-code matching here is approximate. Confirm on the{" "}
        <a href="https://electoralsearch.eci.gov.in/" className="underline underline-offset-2" target="_blank" rel="noopener noreferrer">
          Election Commission&apos;s electoral search
        </a>
        .
      </p>
    </div>
  );
}
