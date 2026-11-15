import { Suspense } from "react";
import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Create an account" };

export default function SignupPage({ searchParams }: PageProps<"/signup">) {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Join TrackBharat</h1>
      <p className="mt-2 text-muted">Raise local problems, vote on your area&apos;s priorities and submit promises you&apos;ve seen made.</p>
      <Card className="mt-8">
        <Suspense fallback={<AuthForm mode="signup" />}>
          {searchParams.then((sp) => (
            <AuthForm mode="signup" next={typeof sp.next === "string" ? sp.next : undefined} />
          ))}
        </Suspense>
      </Card>
      <p className="mt-6 flex gap-2 text-xs text-muted">
        <ShieldCheck className="size-4 shrink-0 text-green" aria-hidden />
        We store only your name and email. Your password is hashed with Argon2 and never stored or logged. Your name appears
        publicly as first name + initial.
      </p>
    </div>
  );
}
