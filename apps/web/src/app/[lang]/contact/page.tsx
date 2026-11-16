import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { site } from "@/lib/site";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = { title: "Contact", description: "Suggest data, report a mistake, or contribute to TrackBharat." };

export default function ContactPage() {
  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-14 md:grid-cols-[1fr_1.3fr]">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Get in touch</h1>
        <p className="mt-3 text-muted">
          Found a promise we missed, a wrong number, or want to contribute? Corrections with a source are always welcome.
        </p>
        <a href={site.author.linkedin} className="mt-6 inline-block text-sm text-primary underline underline-offset-4">
          Connect with {site.author.name} on LinkedIn
        </a>
      </div>
      <Card>
        <ContactForm />
      </Card>
    </div>
  );
}
