"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { ArrowBigUp } from "lucide-react";
import { voteAction } from "@/app/actions";
import { cn } from "@/lib/utils";

/**
 * OPTIMISTIC UI: the count changes the moment you click, then the Server
 * Action confirms it. If the server refuses (e.g. it's your own report),
 * React automatically rolls the optimistic value back and we show why.
 */
export function VoteButton({ issueId, votes, voted, signedIn, disabled }: { issueId: number; votes: number; voted: boolean; signedIn: boolean; disabled?: string }) {
  const [state, setOptimistic] = useOptimistic({ votes, voted });
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!signedIn) {
    return (
      <Link href="/login" title="Log in to vote" className="flex w-14 shrink-0 flex-col items-center rounded-xl border border-border py-2 text-muted hover:border-primary hover:text-primary">
        <ArrowBigUp className="size-5" aria-hidden />
        <span className="font-mono text-sm font-semibold">{votes}</span>
        <span className="sr-only">votes this week. Log in to vote</span>
      </Link>
    );
  }

  return (
    <div className="flex shrink-0 flex-col items-center gap-1">
      <button
        type="button"
        disabled={pending || !!disabled}
        title={disabled ?? (state.voted ? "Remove your vote" : "Vote: this matters to me this week")}
        aria-pressed={state.voted}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const up = !state.voted;
            setOptimistic({ votes: state.votes + (up ? 1 : -1), voted: up });
            const res = await voteAction(issueId, up);
            if (res.error) setError(res.error);
          })
        }
        className={cn(
          "flex w-14 flex-col items-center rounded-xl border py-2 transition-colors disabled:cursor-not-allowed disabled:opacity-60",
          state.voted ? "border-saffron bg-saffron/12 text-saffron" : "border-border text-muted hover:border-saffron hover:text-saffron",
        )}
      >
        <ArrowBigUp className={cn("size-5", state.voted && "fill-current")} aria-hidden />
        <span className="font-mono text-sm font-semibold">{state.votes}</span>
        <span className="sr-only">votes this week</span>
      </button>
      {error && (
        <p role="alert" className="w-28 text-center text-[11px] leading-tight text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
