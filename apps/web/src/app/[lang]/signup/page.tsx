import { Suspense } from "react";
import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import Link from "@/components/link";
import { Card } from "@/components/ui/card";
import { AuthForm } from "@/components/auth/auth-form";
import { EmailOffNote, GoogleButton } from "@/components/auth/google-button";

export const metadata: Metadata = { title: "Create an account" };

export default function SignupPage({ searchParams }: PageProps<"/[lang]/signup">) {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Join TrackBharat</h1>
      <p className="mt-2 text-muted">Raise local problems, vote on your area&apos;s priorities and submit promises you&apos;ve seen made.</p>
      <Card className="mt-8">
        <Suspense fallback={<AuthForm mode="signup" />}>
          {searchParams.then((sp) => {
            const next = typeof sp.next === "string" ? sp.next : undefined;
            return (
              <>
                <EmailOffNote>
                  Email confirmation isn&apos;t switched on yet. Sign up with Google and your votes count right away; with an email
                  sign-up they count once confirmation emails start.
                </EmailOffNote>
                <GoogleButton next={next} label="Sign up with Google" />
                <AuthForm mode="signup" next={next} />
              </>
            );
          })}
        </Suspense>
      </Card>
      <p className="mt-6 text-xs text-muted">
        By creating an account you confirm you are 18 or older and agree to our{" "}
        <Link href="/terms" className="underline">
          terms of use
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline">
          privacy policy
        </Link>
        .
      </p>
      <p className="mt-3 flex gap-2 text-xs text-muted">
        <ShieldCheck className="size-4 shrink-0 text-green" aria-hidden />
        We store only your name and email. Your password is hashed with Argon2 and never stored or logged. Your name appears
        publicly as first name + initial.
      </p>
    </div>
  );
}
