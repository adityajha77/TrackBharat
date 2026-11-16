import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getOutbox } from "@/lib/api-user";

export const metadata: Metadata = { title: "Dev outbox", robots: { index: false } };

/**
 * LOCAL DEVELOPMENT ONLY: emails the API would have sent (verification, password
 * reset), so the links can be clicked without a real mail provider. The API only
 * exposes the outbox when SMTP is not configured and NODE_ENV isn't production.
 */
export default function OutboxPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-black tracking-tight">Dev outbox</h1>
      <p className="mt-2 text-sm text-muted">Emails sent by the local API (newest first). Not available in production.</p>
      <Suspense fallback={null}>
        <Emails />
      </Suspense>
    </div>
  );
}

async function Emails() {
  await connection();
  const data = await getOutbox().catch(() => null);
  if (!data) notFound();
  if (!data.emails.length) return <p className="brutal mt-8 rounded-md bg-surface p-5 text-sm">No emails yet. Sign up or use &ldquo;Forgot password?&rdquo;.</p>;
  const linkify = (text: string) =>
    text.split(/(https?:\/\/\S+)/).map((part, i) =>
      /^https?:\/\//.test(part) ? (
        <a key={i} href={part.replace(/^https?:\/\/[^/]+/, "")} className="break-all font-semibold underline">
          {part}
        </a>
      ) : (
        part
      ),
    );
  return (
    <ul className="mt-8 space-y-4">
      {data.emails.map((e) => (
        <li key={e.sentAt + e.to} className="brutal rounded-md bg-surface p-5">
          <p className="font-mono text-xs text-muted">
            {new Date(e.sentAt).toLocaleString("en-IN")} · to {e.to}
          </p>
          <p className="mt-1 font-bold">{e.subject}</p>
          <pre className="mt-3 whitespace-pre-wrap font-sans text-sm">{linkify(e.text)}</pre>
        </li>
      ))}
    </ul>
  );
}
