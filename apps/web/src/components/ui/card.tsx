import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * Brutalist card: thick ink border + hard offset shadow (see `.brutal` in globals.css).
 * `interactive` adds the press effect for cards that are links.
 */
export function Card({ className, interactive, ...props }: ComponentProps<"div"> & { interactive?: boolean }) {
  return <div className={cn("brutal rounded-md bg-surface p-6", interactive && "press", className)} {...props} />;
}

export function Badge({
  tone = "neutral",
  className,
  ...props
}: ComponentProps<"span"> & { tone?: "neutral" | "live" | "soon" | "primary" | "danger" }) {
  const tones = {
    neutral: "bg-surface-muted text-foreground",
    live: "bg-green/15 text-green",
    soon: "bg-saffron/15 text-saffron",
    primary: "bg-primary/15 text-primary",
    danger: "bg-danger/15 text-danger",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm border border-current/30 px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wide",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}

/** A tilted rubber "stamp" label, for playful emphasis (LIVE, NEW, VERIFIED…). */
export function Stamp({ className, tilt = -3, ...props }: ComponentProps<"span"> & { tilt?: number }) {
  return (
    <span
      style={{ rotate: `${tilt}deg` }}
      className={cn("inline-block rounded-sm border-2 border-current px-2 py-0.5 font-mono text-xs font-bold uppercase tracking-widest", className)}
      {...props}
    />
  );
}

/** Section eyebrow label: mono, uppercase, with a saffron tick. */
export function Eyebrow({ className, children, ...props }: ComponentProps<"p">) {
  return (
    <p className={cn("flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-muted", className)} {...props}>
      <span aria-hidden className="inline-block h-3 w-1.5 bg-saffron" />
      {children}
    </p>
  );
}

/** Bento grid: 1 column on phones, 6 on large screens; children pick their span with `col-span-*`. */
export function Bento({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6", className)} {...props} />;
}
