"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A header dropdown ("More", the profile menu). Opens on click; closes on a
 * click anywhere else, on Escape, or when one of its LINKS is chosen. Buttons
 * inside (e.g. the log-out form) are left alone, so their action still runs.
 */
export function Dropdown({
  trigger,
  label,
  buttonClassName,
  children,
}: {
  /** What the button shows. */
  trigger: ReactNode;
  /** Accessible name for the button. */
  label: string;
  buttonClassName?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
        className={cn("flex items-center gap-1 rounded-md px-2.5 py-2 text-sm font-medium hover:bg-surface-muted", buttonClassName)}
      >
        {trigger}
      </button>
      {open && (
        <div
          className="brutal absolute end-0 z-50 mt-2 w-56 rounded-md bg-surface p-1.5"
          onClick={(e) => {
            // Choosing a link closes the menu (the page changes underneath)
            if ((e.target as HTMLElement).closest("a")) setOpen(false);
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

/** The navbar's "More" menu. */
export function MoreMenu({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Dropdown
      label={label}
      trigger={
        <>
          {label} <ChevronDown className="size-3.5" aria-hidden />
        </>
      }
    >
      {children}
    </Dropdown>
  );
}
