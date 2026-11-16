"use client";

import { useState, useSyncExternalStore } from "react";
import { Check, Share2 } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/utils";

/**
 * RAISE YOUR VOICE: share to X/Twitter, WhatsApp, Facebook, Telegram, or the
 * phone's own share sheet. Plain "intent" links: nothing is posted until the
 * person presses Post in that app, and we never need their social accounts.
 */
export function shareLinks(url: string, text: string, hashtags: string[]) {
  const u = encodeURIComponent(url);
  const tx = encodeURIComponent(text);
  return {
    x: `https://twitter.com/intent/tweet?text=${tx}&url=${u}&hashtags=${encodeURIComponent(hashtags.join(","))}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
    telegram: `https://t.me/share/url?url=${u}&text=${tx}`,
  };
}

export function ShareBar({ path, text, hashtags = [], className }: { path: string; text: string; hashtags?: string[]; className?: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  // The origin is only known in the browser. useSyncExternalStore gives the server (and the
  // first client render) the same value, so hydration matches, then switches to the full URL.
  const origin = useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => "",
  );
  const url = origin ? new URL(path, origin).toString() : path;
  const links = shareLinks(url, text, [t.share.hashtag, ...hashtags]);
  const chip = "brutal-sm press inline-flex h-8 items-center gap-1.5 rounded-md bg-surface px-2.5 text-xs font-semibold";

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-muted">{t.share.label}</span>
      <a className={chip} href={links.x} target="_blank" rel="noopener noreferrer" aria-label="Share on X (Twitter)">
        <svg viewBox="0 0 24 24" className="size-3.5" aria-hidden fill="currentColor">
          <path d="M18.9 2H22l-7.2 8.2L23 22h-6.6l-5.2-6.8L5.2 22H2l7.7-8.8L1.5 2h6.7l4.7 6.2L18.9 2Zm-1.2 18h1.8L7.4 3.9H5.5L17.7 20Z" />
        </svg>
        X
      </a>
      <a className={cn(chip, "bg-[#25D366]/15")} href={links.whatsapp} target="_blank" rel="noopener noreferrer">
        WhatsApp
      </a>
      <a className={chip} href={links.facebook} target="_blank" rel="noopener noreferrer">
        Facebook
      </a>
      <a className={chip} href={links.telegram} target="_blank" rel="noopener noreferrer">
        Telegram
      </a>
      <button
        type="button"
        className={chip}
        onClick={async () => {
          // Phones: the native share sheet (Instagram, SMS, email…); desktop: copy the link.
          if (typeof navigator.share === "function") {
            await navigator.share({ title: "TrackBharat", text, url }).catch(() => undefined);
            return;
          }
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
      >
        {copied ? <Check className="size-3.5" aria-hidden /> : <Share2 className="size-3.5" aria-hidden />}
        {copied ? t.share.copied : t.share.more}
      </button>
    </div>
  );
}
