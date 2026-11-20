import nodemailer from "nodemailer";

/**
 * MAILER ADAPTER. The rest of the app only knows `send()`. Which provider sits
 * behind it is a config decision:
 *
 *   BREVO_API_KEY    → real email over HTTPS (Brevo's API). Use this on hosts that
 *                      block outgoing SMTP ports, e.g. Render's free plan.
 *   SMTP_URL set     → real email via SMTP (any provider: SES, Resend, Brevo, Gmail…)
 *   no SMTP_URL      → "outbox" mailer: keeps the last 50 emails in memory and logs
 *                      them, so you can click verification links locally
 *                      (GET /v1/dev/outbox, never in production).
 */
export interface Email {
  to: string;
  subject: string;
  text: string;
}

export interface Mailer {
  send(email: Email): Promise<void>;
  /** Only the dev outbox has this. */
  outbox?: () => (Email & { sentAt: string })[];
}

export function createOutboxMailer(log: (msg: string) => void = console.log): Mailer {
  const sent: (Email & { sentAt: string })[] = [];
  return {
    async send(email) {
      sent.unshift({ ...email, sentAt: new Date().toISOString() });
      sent.length = Math.min(sent.length, 50);
      log(`[outbox] to=${email.to} subject="${email.subject}"`);
    },
    outbox: () => [...sent],
  };
}

export function createSmtpMailer(smtpUrl: string, from: string): Mailer {
  // Fail in seconds, not minutes, if the host blocks SMTP or the server is down.
  const timeouts = "connectionTimeout=10000&greetingTimeout=10000&socketTimeout=20000";
  const transport = nodemailer.createTransport(`${smtpUrl}${smtpUrl.includes("?") ? "&" : "?"}${timeouts}`);
  return {
    async send(email) {
      await transport.sendMail({ from, to: email.to, subject: email.subject, text: email.text });
    },
  };
}

/** "TrackBharat <me@gmail.com>" → { name: "TrackBharat", email: "me@gmail.com" } */
export function parseFrom(from: string): { name?: string; email: string } {
  const m = from.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  return m ? { name: m[1] || undefined, email: m[2]!.trim() } : { email: from.trim() };
}

/**
 * Brevo (brevo.com) transactional email over HTTPS. Free tier: 300 emails/day.
 * The sender (MAIL_FROM) must be a verified sender in Brevo; a Gmail address works
 * without owning a domain.
 */
export function createBrevoMailer(apiKey: string, from: string, fetchImpl: typeof fetch = fetch): Mailer {
  const sender = parseFrom(from);
  return {
    async send(email) {
      const res = await fetchImpl("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": apiKey, "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ sender, to: [{ email: email.to }], subject: email.subject, textContent: email.text }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) throw new Error(`Brevo: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
    },
  };
}
