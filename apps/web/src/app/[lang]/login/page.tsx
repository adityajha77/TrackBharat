import { Suspense } from "react";
import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { AuthForm } from "@/components/auth/auth-form";
import { GOOGLE_ERRORS, GoogleButton } from "@/components/auth/google-button";
import { IndiaFlag } from "@/components/india/flag";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage({ searchParams }: PageProps<"/[lang]/login">) {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="flex items-center gap-3 text-3xl font-semibold tracking-tight">
        <IndiaFlag className="h-5 w-[30px]" /> Welcome back
      </h1>
      <p className="mt-2 text-muted">Log in to report problems in your area and vote on what matters most this week.</p>
      <Card className="mt-8">
        {/* searchParams is request-time data → read it inside Suspense */}
        <Suspense fallback={<AuthForm mode="login" />}>
          {searchParams.then((sp) => {
            const next = typeof sp.next === "string" ? sp.next : undefined;
            const error = typeof sp.error === "string" ? GOOGLE_ERRORS[sp.error] : undefined;
            return (
              <>
                {error && (
                  <p role="alert" className="mb-4 rounded-md border-2 border-danger px-3 py-2 text-sm text-danger">
                    {error}
                  </p>
                )}
                <GoogleButton next={next} />
                <AuthForm mode="login" next={next} />
              </>
            );
          })}
        </Suspense>
      </Card>
    </div>
  );
}
