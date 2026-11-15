import type { Metadata } from "next";
import { METHODOLOGY } from "@trackbharat/shared";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "How report cards work",
  description: "The exact formula behind every TrackBharat report card, the data it uses, and what it cannot tell you.",
};

// Numbers are imported from the SAME constants the API uses to compute scores,
// so this page can never drift out of sync with the real formula.
const W = METHODOLOGY.weights;
const pct = (n: number) => `${Math.round(n * 100)}%`;

export default function MethodologyPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-10 px-4 py-14">
      <header>
        <p className="font-mono text-xs text-muted">Methodology {METHODOLOGY.version}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">How report cards work</h1>
        <p className="mt-3 text-muted">
          A score is only trustworthy if you can check it. This page is the complete formula. The same rules apply to every seat, every party and
          every MP.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">The score has three parts</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead className="text-left text-xs text-muted">
              <tr>
                <th className="py-2 pr-3 font-medium">Part</th>
                <th className="py-2 pr-3 font-medium">Weight</th>
                <th className="py-2 font-medium">How it is scored (0–100)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border align-top">
              <tr>
                <td className="py-3 pr-3 font-medium">Promises delivered</td>
                <td className="py-3 pr-3 font-mono">{pct(W.promises)}</td>
                <td className="py-3 text-muted">
                  (fulfilled + ½ × partly delivered) ÷ all tracked promises. Needs at least {METHODOLOGY.minPromises} sourced promises.
                </td>
              </tr>
              <tr>
                <td className="py-3 pr-3 font-medium">Questions in Parliament</td>
                <td className="py-3 pr-3 font-mono">{pct(W.activity)}</td>
                <td className="py-3 text-muted">
                  The MP&apos;s rank among all MPs of the same Lok Sabha who asked at least one question, using total questions asked (percentile).
                </td>
              </tr>
              <tr>
                <td className="py-3 pr-3 font-medium">Local problems resolved</td>
                <td className="py-3 pr-3 font-mono">{pct(W.issues)}</td>
                <td className="py-3 text-muted">
                  Citizen reports older than {METHODOLOGY.issueGraceDays} days that are marked resolved ÷ all such reports. Needs at least{" "}
                  {METHODOLOGY.minIssues}.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <Card className="bg-surface-muted text-sm">
          <p className="font-medium">When data is missing, we say so.</p>
          <p className="mt-1 text-muted">
            A part without enough data is <strong>left out</strong>, never scored as zero, and the remaining weights are scaled up to add to 100%. An
            overall score appears only when at least {METHODOLOGY.minComponents} parts could be scored. No score is better than a misleading one.
          </p>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Where the data comes from</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted">
          <li>
            <strong className="text-foreground">Promises:</strong> each one links to a public source (manifesto, official speech, gazette, news). A
            verifier checks the link before it is published. Status changes form an append-only timeline.
          </li>
          <li>
            <strong className="text-foreground">Questions:</strong> the Lok Sabha Secretariat&apos;s own records (sansad.in), counted per MP.
          </li>
          <li>
            <strong className="text-foreground">Local problems:</strong> reported by registered citizens, moderated, and marked resolved by a
            moderator.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">What a report card cannot tell you</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted">
          <li>
            <strong className="text-foreground">Questions aren&apos;t quality.</strong> One sharp question can matter more than fifty routine ones, and
            ministers and the Speaker don&apos;t ask questions at all. That is why activity is one part of three, and why a missing record is not a zero.
          </li>
          <li>
            <strong className="text-foreground">Early days.</strong> The 18th Lok Sabha began in June 2024, so totals are compared per month and as a
            percentile of the same Lok Sabha, never against a finished 5-year term.
          </li>
          <li>
            <strong className="text-foreground">Citizen reports aren&apos;t a census.</strong> They show what people with internet access chose to report. A
            seat with few reports isn&apos;t necessarily a seat with few problems.
          </li>
          <li>
            <strong className="text-foreground">Changed boundaries.</strong> Assam (2023) and Jammu &amp; Kashmir (2022) were redrawn, so comparisons with the
            previous MP there are approximate and marked as such.
          </li>
          <li>
            <strong className="text-foreground">Promises are only what we could source.</strong> The tracker is built slowly and carefully; an empty tracker means
            &ldquo;not yet curated&rdquo;, not &ldquo;no promises made&rdquo;.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Check our work</h2>
        <p className="text-sm text-muted">
          Everything behind these numbers is downloadable on the <a href="/data" className="text-primary underline underline-offset-2">open data page</a>, and the
          scoring code is a few short functions in the <a href="https://github.com/adityajha77/TrackBharat" className="text-primary underline underline-offset-2">public repository</a>.
          Found a mistake? <a href="/contact" className="text-primary underline underline-offset-2">Tell us</a> with a source and we will correct it and record the
          change.
        </p>
      </section>
    </article>
  );
}
