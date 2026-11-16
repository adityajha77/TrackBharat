import { cn } from "@/lib/utils";

/**
 * Initials avatar for a representative.
 *
 * Why not the official photo? sansad.in serves MP photos with the header
 * `Cross-Origin-Resource-Policy: same-site`, which tells browsers to refuse
 * showing them on any other website. Re-hosting the photos through our server
 * would sidestep the publisher's explicit choice, so we don't. The URL is still
 * stored (representatives.image_url) in case an openly-licensed source appears.
 */
const TONES = ["bg-flag-saffron/20 text-saffron", "bg-primary/15 text-primary", "bg-flag-green/20 text-green"];

export function RepresentativePhoto({ name, className }: { name: string; src?: string | null; className?: string }) {
  const words = name.split(/\s+/).filter(Boolean);
  const initials = ((words[0]?.[0] ?? "") + (words.length > 1 ? words.at(-1)![0] : "")).toUpperCase();
  // Stable colour per name, so the same MP always gets the same tone
  const tone = TONES[[...name].reduce((n, ch) => n + ch.charCodeAt(0), 0) % TONES.length];
  return (
    <span aria-hidden className={cn("inline-flex select-none items-center justify-center rounded-md font-semibold tracking-tight", tone, className)}>
      {initials}
    </span>
  );
}
