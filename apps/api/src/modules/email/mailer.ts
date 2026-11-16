import nodemailer from "nodemailer";

/**
 * MAILER ADAPTER. The rest of the app only knows `send()`. Which provider sits
 * behind it is a config decision:
 *
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
  const transport = nodemailer.createTransport(smtpUrl);
  return {
    async send(email) {
      await transport.sendMail({ from, to: email.to, subject: email.subject, text: email.text });
    },
  };
}
