import type { Metadata } from "next";
import Link from "@/components/link";
import { Eyebrow } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Terms of use",
  description: "The rules for using TrackBharat: what you can post, how moderation works, and what we promise.",
};

const UPDATED = "21 November 2026";

/** TERMS OF USE, in plain language. Matches how moderation actually works (hide, reject, block, all audited). */
export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-8 px-4 py-14 leading-relaxed">
      <header>
        <Eyebrow>Terms</Eyebrow>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Terms of use</h1>
        <p className="mt-2 font-mono text-xs text-muted">Last updated {UPDATED}</p>
        <p className="mt-4 text-lg">
          TrackBharat is a free, non-partisan place to check what was promised, what was done, and what citizens need. By using it you
          agree to these simple rules.
        </p>
      </header>

      <Section title="1. What TrackBharat is, and isn't">
        We collect public information (election results, manifestos, records of Parliament, news) and what citizens report, and we show
        it with its sources. We are not a government body, a party, or a news organisation, and nothing here is legal or voting advice.
        We work hard to be accurate and to cite every claim, but public records and reports can be incomplete or wrong. Always check the
        source we link, and tell us if something is wrong.
      </Section>

      <Section title="2. Your account">
        You must be 18 or older, give your real name and a working email, and keep your password private. One person, one account:
        creating several accounts to vote more than once is not allowed, and such votes are removed.
      </Section>

      <Section title="3. What you may post">
        Report real problems in your area, suggest promises and news with a source, and vote honestly. Everything you post must be true to
        the best of your knowledge.
      </Section>

      <Section title="4. What you may not post">
        <ul className="list-disc space-y-2 pl-5">
          <li>Hate speech or attacks on anyone&apos;s religion, caste, gender, region, language or community.</li>
          <li>Personal abuse, threats, or private information about anyone (phone numbers, addresses, ID documents, children&apos;s photos).</li>
          <li>Claims you know are false, or accusations of crimes without a public source.</li>
          <li>Party propaganda, spam, advertising, or the same thing posted many times.</li>
          <li>Anything illegal in India, or anything you don&apos;t have the right to share (for example someone else&apos;s photos or articles).</li>
        </ul>
      </Section>

      <Section title="5. Moderation">
        Volunteer moderators may hide a post, reject a suggestion, or block an account that breaks these rules. The same rules apply to
        every party, person and community. Every decision is recorded. If you think we got it wrong, write to us on the{" "}
        <Link href="/contact" className="underline">contact page</Link> and a different moderator will look at it.
      </Section>

      <Section title="6. Your content">
        You keep ownership of what you post. You allow TrackBharat to show it on the site and in our open data (with your name shortened to
        first name and initial). If you delete your account, your posts are deleted too.
      </Section>

      <Section title="7. Open data and open source">
        Our code is open source and our data is published so anyone can check our work. When you reuse the data, credit TrackBharat and the
        original sources listed with it.
      </Section>

      <Section title="8. Links to other sites">
        We link to news publishers, government websites and other sources so you can read the original. We are not responsible for their
        content.
      </Section>

      <Section title="9. No warranty">
        TrackBharat is provided free and &ldquo;as is&rdquo;, by volunteers. The site may sometimes be unavailable or contain mistakes.
        To the extent the law allows, we are not liable for decisions made based on it.
      </Section>

      <Section title="10. Changes">
        We may update these terms; the date above will change. Continuing to use the site after a change means you accept it. These terms
        are governed by the laws of India. See also our <Link href="/privacy" className="underline">privacy policy</Link>.
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
