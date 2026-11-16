import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Form primitives: one consistent look for every input on the site. */
const control =
  "mt-1.5 w-full rounded-md border-2 border-ink bg-surface px-3 py-2.5 text-sm outline-none transition-shadow placeholder:text-muted focus:shadow-[3px_3px_0_var(--ink)] disabled:opacity-60";

export function Field({ label, hint, children, className }: { label: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cn("block text-sm font-medium", className)}>
      {label}
      {children}
      {hint && <span className="mt-1 block text-xs font-normal text-muted">{hint}</span>}
    </label>
  );
}

export const Input = ({ className, ...p }: ComponentProps<"input">) => <input className={cn(control, className)} {...p} />;
export const Textarea = ({ className, ...p }: ComponentProps<"textarea">) => <textarea className={cn(control, "min-h-28", className)} {...p} />;
export const Select = ({ className, ...p }: ComponentProps<"select">) => <select className={cn(control, className)} {...p} />;

export function FormError({ message }: { message?: string }) {
  return (
    <p role="alert" aria-live="polite" className="min-h-5 text-sm text-danger">
      {message}
    </p>
  );
}
