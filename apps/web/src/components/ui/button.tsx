import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * Hand-written primitive (no UI kit). One component, a few variants, all styled
 * from design tokens. Renders a <Link> when given `href`, else a <button>.
 */
const variants = {
  primary: "bg-primary text-primary-foreground hover:opacity-90",
  secondary: "bg-surface text-foreground border border-border hover:bg-surface-muted",
  ghost: "text-foreground hover:bg-surface-muted",
} as const;

const sizes = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-base",
} as const;

type StyleProps = { variant?: keyof typeof variants; size?: keyof typeof sizes; className?: string };

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-[opacity,background-color] disabled:pointer-events-none disabled:opacity-50";

export function Button({ variant = "primary", size = "md", className, ...props }: StyleProps & ComponentProps<"button">) {
  return <button className={cn(base, variants[variant], sizes[size], className)} {...props} />;
}

export function ButtonLink({ variant = "primary", size = "md", className, ...props }: StyleProps & ComponentProps<typeof Link>) {
  return <Link className={cn(base, variants[variant], sizes[size], className)} {...props} />;
}
