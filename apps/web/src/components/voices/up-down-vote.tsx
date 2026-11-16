"use client";

import { useOptimistic, useState, useTransition } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import Link from "@/components/link";
import { voteAction } from "@/app/actions";
import { fmt, useI18n } from "@/i18n/client";
import { cn } from "@/lib/utils";

type Vote = 1 | -1 | 0;

/**
 * UP / DOWN VOTE with OPTIMISTIC UI: the bar moves the moment you click; the
 * Server Action confirms. If the server refuses, React rolls the optimistic
 * value back and we show why.
 *
 *   issue: ▲ "Faced this too"  ▼ "Not accurate"   (neighbours verify a report)
 *   cause: ▲ "Affects me"      ▼ "Not my issue"   (is it felt across India?)
 */
export function UpDownVote({
  kind,
  id,
  up,
  down,
  myVote,
  signedIn,
  disabled,
  size = "md",
}: {
  kind: "issue" | "cause";
  id: number;
  up: number;
  down: number;
  myVote: Vote;
  signedIn: boolean;
  disabled?: string;
  size?: "sm" | "md";
}) {
  const { t } = useI18n();
  const [state, setOptimistic] = useOptimistic({ up, down, myVote });
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState<{ error?: string; info?: string } | null>(null);

  const labels = kind === "issue" ? { up: t.vote.upIssue, down: t.vote.downIssue } : { up: t.vote.up, down: t.vote.down };
  const total = state.up + state.down;
  const agree = total ? Math.round((state.up / total) * 100) : 0;

  function cast(value: 1 | -1) {
    startTransition(async () => {
      setNote(null);
      const next: Vote = state.myVote === value ? 0 : value; // clicking your current vote takes it back
      setOptimistic({
        up: state.up - (state.myVote === 1 ? 1 : 0) + (next === 1 ? 1 : 0),
        down: state.down - (state.myVote === -1 ? 1 : 0) + (next === -1 ? 1 : 0),
        myVote: next,
      });
      const res = await voteAction(kind, id, next);
      if (res.error) setNote({ error: res.error });
      else if (res.counted === false) setNote({ info: t.vote.verifyToCount });
    });
  }

  const btn = (value: 1 | -1) => {
    const active = state.myVote === value;
    const Icon = value === 1 ? ThumbsUp : ThumbsDown;
    const count = value === 1 ? state.up : state.down;
    const cls = cn(
      "brutal-sm press inline-flex items-center gap-1.5 rounded-md font-semibold disabled:cursor-not-allowed disabled:opacity-60",
      size === "sm" ? "h-8 px-2 text-xs" : "h-10 px-3 text-sm",
      active ? (value === 1 ? "bg-flag-green text-white" : "bg-danger text-white") : "bg-surface",
    );
    const body = (
      <>
        <Icon className={cn("size-4", active && "fill-current")} aria-hidden />
        <span className="hidden sm:inline">{value === 1 ? labels.up : labels.down}</span>
        <span className="font-mono">{count}</span>
      </>
    );
    if (!signedIn)
      return (
        <Link href="/login" title={t.vote.loginToVote} className={cls}>
          {body}
          <span className="sr-only">{t.vote.loginToVote}</span>
        </Link>
      );
    return (
      <button
        type="button"
        className={cls}
        aria-pressed={active}
        disabled={pending || !!disabled}
        title={disabled ?? (value === 1 ? labels.up : labels.down)}
        onClick={() => cast(value)}
      >
        {body}
      </button>
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {btn(1)}
        {btn(-1)}
        {total > 0 && <span className="font-mono text-xs text-muted">{fmt(t.vote.agree, { n: agree })}</span>}
      </div>
      {/* Agree / disagree bar: green share vs red share */}
      {total > 0 && (
        <div aria-hidden className="flex h-2 overflow-hidden rounded-sm border border-ink">
          <span className="bg-flag-green transition-[width] duration-500" style={{ width: `${agree}%` }} />
          <span className="flex-1 bg-danger/70" />
        </div>
      )}
      {note?.error && (
        <p role="alert" className="text-xs text-danger">
          {note.error}
        </p>
      )}
      {note?.info && <p className="text-xs text-saffron">{note.info}</p>}
    </div>
  );
}
