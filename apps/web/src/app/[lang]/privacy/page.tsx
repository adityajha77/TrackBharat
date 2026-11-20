import type { Metadata } from "next";
import Link from "@/components/link";
import { Eyebrow } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "What TrackBharat stores about you, why, who can see it, and how to delete it.",
};

const UPDATED = "21 November 2026";

/**
 * PRIVACY POLICY, written to match what the code actually does (schema.ts, the
 * auth and photo modules). If the data we store changes, this page must change
 * in the same pull request. Written with India's Digital Personal Data
 * Protection Act, 2023 in mind: say what, why, for how long, and how to erase.
 */
export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-8 px-4 py-14 leading-relaxed">
      <header>
        <Eyebrow>Privacy</Eyebrow>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Privacy policy</h1>
        <p className="mt-2 font-mono text-xs text-muted">Last updated {UPDATED}</p>
        <p className="mt-4 text-lg">
          The short version: we collect as little as possible, we never sell it, we never show your votes to anyone, and you can delete your
          account and everything you posted at any time.
        </p>
      </header>

      <Section title="Who we are">
        TrackBharat is a non-partisan, open-source civic project run by a small group of volunteers. It is not part of any government, party
        or company. Questions about your data: use the <Link href="/contact" className="underline">contact page</Link>.
      </Section>

      <Section title="Without an account">
        You can read everything on TrackBharat without an account. We do not use advertising or tracking cookies, and we do not sell or share
        visitor data. Our servers keep short technical logs (the page requested, time, browser type and IP address) to keep the site
        secure and working, for example to slow down abuse. A PIN code you search for is used to find your constituency and is not linked
        to you.
      </Section>

      <Section title="With an account, we store">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Your name and email address.</strong> Your name appears publicly only as first name and initial (for example
            &ldquo;Asha K.&rdquo;) next to things you post. Your email is never shown.
          </li>
          <li>
            <strong>Your password, as a one-way hash</strong> (Argon2). We cannot see or recover it. If you use &ldquo;Continue with
            Google&rdquo;, Google tells us your name, email and that the email is verified, plus an account id; we never see your Google
            password and get no access to your Gmail, contacts or anything else.
          </li>
          <li>
            <strong>Sign-in sessions:</strong> a hashed session id, your browser type and when it was last used, so you stay signed in
            and can be signed out.
          </li>
          <li>
            <strong>What you post:</strong> problem reports (title, description, PIN code, category, and a photo if you add one),
            promises and news stories you suggest.
          </li>
          <li>
            <strong>Your votes.</strong> We store which way you voted so you can change it. Only totals are ever shown; nobody else,
            not even other users, can see how you voted.
          </li>
        </ul>
      </Section>

      <Section title="Photos">
        Phone photos often contain hidden data such as the GPS location where they were taken. We remove all of that hidden data and
        re-save the image before storing it. Please don&apos;t upload photos of people&apos;s faces or private documents.
      </Section>

      <Section title="Why we use it">
        Only to run TrackBharat: to let you sign in, to count each person&apos;s vote once, to show what you posted, to send you the emails
        you ask for (confirming your email address, resetting your password), and to stop spam and abuse. We do not use your data for
        advertising and we never sell it.
      </Section>

      <Section title="Who can see it">
        <ul className="list-disc space-y-2 pl-5">
          <li>The public: what you post, with your first name and initial.</li>
          <li>
            Our volunteer moderators and verifiers: what you post, so they can check it; and your email if they need to contact you
            about it. Every moderation decision is logged.
          </li>
          <li>
            Service providers that run the site for us: our database and hosting providers, and the email service that sends our emails.
            They process data only to provide that service.
          </li>
          <li>Authorities only where Indian law requires it.</li>
        </ul>
      </Section>

      <Section title="How long we keep it">
        Your account and posts stay until you delete them. One-time email links expire within hours. Sign-in sessions end after 30 days of
        not being used. Technical logs are kept for a short time and then deleted.
      </Section>

      <Section title="Your rights">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Delete everything:</strong> <Link href="/me/settings" className="underline">Settings</Link> → &ldquo;Delete my
            account&rdquo; permanently removes your account, your reports, your votes and your photos. Only a record that a moderation
            decision happened is kept, without your details.
          </li>
          <li>
            <strong>Correct or ask:</strong> you can ask us what we hold about you, or to correct it, through the{" "}
            <Link href="/contact" className="underline">contact page</Link>. We aim to reply within 30 days.
          </li>
          <li>
            You must be 18 or older to create an account. If you are under 18, you may read the site but please don&apos;t sign up.
          </li>
        </ul>
      </Section>

      <Section title="Security">
        Passwords and session ids are stored only as hashes, connections use HTTPS, and photos are stripped of hidden data. No system is
        perfectly secure; if we ever learn of a breach that affects you, we will tell you.
      </Section>

      <Section title="Changes">
        If we change what we collect, we will update this page and its date before the change takes effect.
      </Section>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-bold">{title}</h2>
      <div className="mt-2 text-muted">{children}</div>
    </section>
  );
}
