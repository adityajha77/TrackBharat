"use client";

import { useState, type FormEvent } from "react";
import emailjs from "@emailjs/browser";
import { Button } from "@/components/ui/button";

// NEXT_PUBLIC_ vars are inlined into the browser bundle at build time. Only
// values designed to be public (like EmailJS IDs) may use that prefix.
const SERVICE = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
const TEMPLATE = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID;
const KEY = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;

const field = "mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary";

export function ContactForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  if (!SERVICE || !TEMPLATE || !KEY) {
    return (
      <p className="text-sm text-muted">
        The contact form isn&apos;t configured in this environment. Set the <code className="font-mono">NEXT_PUBLIC_EMAILJS_*</code> variables
        (see <code className="font-mono">apps/web/.env.example</code>).
      </p>
    );
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setStatus("sending");
    try {
      await emailjs.sendForm(SERVICE!, TEMPLATE!, form, { publicKey: KEY! });
      form.reset();
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          Name
          <input name="from_name" required className={field} />
        </label>
        <label className="block text-sm font-medium">
          Email
          <input name="from_email" type="email" required className={field} />
        </label>
      </div>
      <label className="block text-sm font-medium">
        Subject
        <input name="subject" required className={field} />
      </label>
      <label className="block text-sm font-medium">
        Message
        <textarea name="message" required rows={5} className={field} />
      </label>
      <Button type="submit" disabled={status === "sending"} className="w-full">
        {status === "sending" ? "Sending…" : "Send message"}
      </Button>
      <p role="status" className="min-h-5 text-sm">
        {status === "sent" && <span className="text-green">Thanks! Your message was sent.</span>}
        {status === "error" && <span className="text-danger">Couldn&apos;t send right now. Please try again later.</span>}
      </p>
    </form>
  );
}
