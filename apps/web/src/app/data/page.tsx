import type { Metadata } from "next";
import { Download } from "lucide-react";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Open data",
  description: "Download TrackBharat's data as CSV: constituencies, representatives, promises and weekly highlights.",
};

const FILES = [
  { name: "constituencies", title: "Constituencies", body: "All 543 Lok Sabha and ~4,100 Vidhan Sabha seats with state, reservation and the Lok Sabha seat each assembly seat lies in." },
  { name: "representatives", title: "Representatives", body: "Members of the current Lok Sabha (and any curated MLAs) with party, status, terms served, questions asked and a source link." },
  { name: "promises", title: "Promises", body: "Every tracked promise with who made it, its status, deadline and source. Demo data is excluded." },
  { name: "weekly-highlights", title: "Weekly highlights", body: "The top citizen-reported problems in each constituency, frozen every Monday." },
];

export default function DataPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Open data</h1>
      <p className="mt-3 text-muted">
        What you can see on TrackBharat, you can download. Researchers, journalists and students are welcome to use it. Files are UTF-8 CSV and open
        correctly in Excel and Google Sheets, Hindi included.
      </p>
      <ul className="mt-8 space-y-4">
        {FILES.map((f) => (
          <li key={f.name}>
            <Card className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-semibold">{f.title}</h2>
                <p className="mt-1 text-sm text-muted">{f.body}</p>
              </div>
              {/* Plain link, no JS: the rewrite in next.config.ts forwards it to the API */}
              <a
                href={`/downloads/${f.name}.csv`}
                download
                className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border border-border px-4 text-sm font-medium hover:border-primary hover:text-primary"
              >
                <Download className="size-4" aria-hidden /> CSV
              </a>
            </Card>
          </li>
        ))}
      </ul>
      <section className="mt-10 space-y-2 text-sm text-muted">
        <h2 className="text-base font-semibold text-foreground">Licence and credits</h2>
        <p>
          Our compilation is shared under CC BY 4.0: please credit &ldquo;TrackBharat&rdquo;. The underlying sources keep their own licences: constituency
          boundaries by DataMeet (CC0 for Lok Sabha seats, CC BY 2.5 India for assembly seats); the post office directory from the Department of Posts under
          the Government Open Data Licence – India; members and questions from the Lok Sabha Secretariat (sansad.in).
        </p>
        <p>
          Personal data of citizens (emails, passwords) is never included. Reporters appear only as first name and initial.
        </p>
      </section>
    </div>
  );
}
