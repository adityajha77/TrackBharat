import { ExternalLink, MapPin, UserRoundCheck } from "lucide-react";
import type { NewsItem } from "@trackbharat/shared";
import { Badge } from "@/components/ui/card";
import type { Dictionary } from "@/i18n/server";
import { ShareBar } from "./share-bar";

/** One story: OUR summary (2–5 lines), where, who is responsible, and the original link. */
export function NewsCard({ item, t, compact }: { item: NewsItem; t: Dictionary; compact?: boolean }) {
  const date = item.sourcePublishedAt ?? item.publishedAt;
  return (
    <article className="brutal reveal flex h-full flex-col gap-3 rounded-md bg-surface p-5">
      <div className="flex flex-wrap items-center gap-2">
        {item.category && <Badge tone="soon">{t.category[item.category]}</Badge>}
        {item.state && (
          <span className="inline-flex items-center gap-1 font-mono text-xs text-muted">
            <MapPin className="size-3" aria-hidden />
            {[item.district, item.state].filter(Boolean).join(", ")}
          </span>
        )}
      </div>
      <h3 className="text-lg font-bold leading-snug">{item.headline}</h3>
      {item.summary && <p className={compact ? "line-clamp-3 text-sm text-muted" : "text-sm leading-relaxed text-muted"}>{item.summary}</p>}
      {item.responsible && (
        <p className="flex items-start gap-1.5 text-sm">
          <UserRoundCheck className="mt-0.5 size-4 shrink-0 text-saffron" aria-hidden />
          <span>
            <span className="font-semibold">{t.news.responsible}:</span> {item.responsible}
          </span>
        </p>
      )}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
        <a href={item.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold underline underline-offset-4">
          {t.news.source}: {item.sourceName} <ExternalLink className="size-3.5" aria-hidden />
        </a>
        {date && <time className="font-mono text-xs text-muted">{new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</time>}
      </div>
      {!compact && <ShareBar path={`/news#story-${item.id}`} text={`${item.headline}${item.state ? ` (${item.state})` : ""}. Raise your voice on TrackBharat`} />}
    </article>
  );
}
