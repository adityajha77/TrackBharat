"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { ArrowRight, LoaderCircle, MapPin } from "lucide-react";
import { Pincode } from "@trackbharat/shared";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/client";

/**
 * Client component: it needs state + event handlers. It validates with the SAME
 * schema the API uses, so the user gets instant feedback with no round trip.
 * The API still validates again: never trust the client.
 */
export function PincodeSearch({ className, autoFocus }: { className?: string; autoFocus?: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = Pincode.safeParse(value);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid PIN code");
      return;
    }
    setError(null);
    startTransition(() => router.push(`/area/${parsed.data}`));
  }

  return (
    <form onSubmit={onSubmit} className={cn("w-full max-w-md", className)} noValidate>
      <label htmlFor="pincode" className="sr-only">
        {t.search.label}
      </label>
      <div
        className={cn(
          "brutal flex items-center gap-2 rounded-md bg-surface p-1.5 pl-4",
          error && "border-danger",
        )}
      >
        <MapPin className="size-5 shrink-0 text-muted" aria-hidden />
        <input
          id="pincode"
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={6}
          placeholder={t.search.placeholder}
          value={value}
          autoFocus={autoFocus}
          onChange={(e) => {
            setValue(e.target.value.replace(/\D/g, ""));
            setError(null);
          }}
          aria-invalid={!!error}
          aria-describedby={error ? "pincode-error" : undefined}
          className="min-w-0 flex-1 bg-transparent py-2 font-mono text-lg tracking-widest outline-none placeholder:font-sans placeholder:text-base placeholder:tracking-normal placeholder:text-muted"
        />
        <button
          type="submit"
          disabled={pending}
          className="brutal-sm press inline-flex h-11 items-center gap-2 rounded-md bg-saffron px-4 text-sm font-bold text-ink disabled:opacity-60"
        >
          {pending ? <LoaderCircle className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
          <span className="hidden sm:inline">{t.search.button}</span>
        </button>
      </div>
      <p id="pincode-error" role="alert" className="mt-2 min-h-5 text-sm text-danger">
        {error}
      </p>
    </form>
  );
}
