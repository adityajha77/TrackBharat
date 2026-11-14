import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-2xl border border-border bg-surface p-6", className)} {...props} />;
}

export function Badge({
  tone = "neutral",
  className,
  ...props
}: ComponentProps<"span"> & { tone?: "neutral" | "live" | "soon" | "primary" }) {
  const tones = {
    neutral: "bg-surface-muted text-muted",
    live: "bg-green/12 text-green",
    soon: "bg-saffron/12 text-saffron",
    primary: "bg-primary/12 text-primary",
  };
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", tones[tone], className)}
      {...props}
    />
  );
}
