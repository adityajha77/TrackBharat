import type { Metadata } from "next";
import { RightsBrowser } from "./rights-browser";

export const metadata: Metadata = {
  title: "Know your rights",
  description: "Your constitutional and legal rights as an Indian citizen, in plain language.",
};

// Server component renders the static heading; only the interactive filter is a client component.
export default function RightsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-14">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Know your rights</h1>
      <p className="mt-3 max-w-2xl text-muted">
        An informed citizen is an empowered citizen. These summaries are a starting point, not legal advice. Each one names
        the law it comes from.
      </p>
      <RightsBrowser />
    </div>
  );
}
