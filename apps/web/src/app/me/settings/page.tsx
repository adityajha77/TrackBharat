import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getMe } from "@/lib/api-user";
import { Card } from "@/components/ui/card";
import { SettingsForms } from "./settings-forms";

export const metadata: Metadata = { title: "Account settings", robots: { index: false } };

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <Link href="/me" className="text-sm text-muted hover:text-foreground">
        ← My activity
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Account settings</h1>
      <Suspense fallback={<div className="mt-8 h-64 animate-pulse rounded-2xl bg-surface-muted" />}>
        <Gate />
      </Suspense>
    </div>
  );
}

async function Gate() {
  const me = await getMe().catch(() => null);
  if (!me) redirect("/login?next=/me/settings");
  return (
    <div className="mt-8 space-y-8">
      <Card>
        <p className="text-sm text-muted">
          Signed in as <strong className="text-foreground">{me.name}</strong>. Your public name is shown as first name and initial.
        </p>
      </Card>
      <SettingsForms />
    </div>
  );
}
