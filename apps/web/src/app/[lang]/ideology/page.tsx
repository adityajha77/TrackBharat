import type { Metadata } from "next";
import { Database, Eye, Scale, ShieldCheck, Users, Vote } from "lucide-react";
import { TricolourRibbon } from "@/components/india/tricolour-ribbon";
import { Eyebrow } from "@/components/ui/card";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.nav.ideology, description: t.home.motto };
}

export default async function IdeologyPage() {
  const { t, lang } = await getT();
  const pillars = [
    { icon: Users, title: t.home.principle2Title, body: t.home.principle2Body },
    { icon: ShieldCheck, title: t.home.principle1Title, body: t.home.principle1Body },
    { icon: Database, title: t.home.principle3Title, body: t.home.principle3Body },
  ];
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="grid items-center gap-8 md:grid-cols-[1fr_220px]">
        <div>
          <Eyebrow>{t.nav.ideology}</Eyebrow>
          <blockquote className="mt-4 text-balance text-3xl font-black leading-tight sm:text-5xl">&ldquo;{t.home.motto}&rdquo;</blockquote>
          {lang !== "hi" && (
            <p className="mt-4 font-hindi text-xl" lang="hi">
              &ldquo;हम किसी पार्टी या धर्म से नहीं हैं। हमारा एक ही उद्देश्य है: पारदर्शिता।&rdquo;
            </p>
          )}
        </div>
        <TricolourRibbon className="mx-auto w-44 md:w-full" />
      </div>

      <ul className="mt-12 grid gap-5 md:grid-cols-3">
        {pillars.map((p) => (
          <li key={p.title} className="brutal reveal rounded-md bg-surface p-5">
            <p.icon className="size-6 text-saffron" aria-hidden />
            <h2 className="mt-3 text-lg font-bold">{p.title}</h2>
            <p className="mt-2 text-sm text-muted">{p.body}</p>
          </li>
        ))}
      </ul>

      <section className="brutal mt-12 space-y-4 rounded-md bg-surface p-6 text-pretty leading-relaxed">
        <p className="text-sm text-muted">{t.common.englishOnly}</p>
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <Eye className="size-5" aria-hidden /> What we believe
        </h2>
        <p>
          Democracy does not end on polling day. A citizen should be able to see, in one place, what their representatives promised, what they did,
          and what people around them are struggling with, and then raise their voice about it.
        </p>
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <Scale className="size-5" aria-hidden /> How we stay fair
        </h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>We take no money from parties, candidates or religious organisations, and we run no political ads.</li>
          <li>The same rules, the same status scale and the same published formula apply to every party and every representative.</li>
          <li>Every claim links to a public source. If we can&apos;t source it, we don&apos;t publish it, and we say &ldquo;not yet rated&rdquo; instead of guessing.</li>
          <li>Parties out of power are never marked as having &ldquo;broken&rdquo; promises they had no chance to keep.</li>
          <li>Citizens&apos; reports are moderated for spam and abuse, never for political opinion.</li>
        </ul>
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <Vote className="size-5" aria-hidden /> What we ask of you
        </h2>
        <p>Report what you see, verify what others report, vote honestly, and share facts, not anger. Corrections with a source are always welcome.</p>
      </section>
    </div>
  );
}
