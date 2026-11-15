"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, signupAction, type ActionState } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input } from "@/components/ui/field";

/**
 * useActionState wires a <form> to a Server Action: it gives us the action's
 * returned state (our error message) and a `pending` flag, with no fetch()
 * or onSubmit handlers. The form even works before JavaScript loads.
 */
export function AuthForm({ mode, next }: { mode: "login" | "signup"; next?: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(mode === "login" ? loginAction : signupAction, {});
  const signup = mode === "signup";

  return (
    <form action={action} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      {signup && (
        <Field label="Your name" hint="Shown as first name + initial, e.g. “Priya S.”">
          <Input name="name" autoComplete="name" required minLength={2} maxLength={80} defaultValue={state.values?.name} />
        </Field>
      )}
      <Field label="Email">
        <Input name="email" type="email" autoComplete="email" required defaultValue={state.values?.email} />
      </Field>
      <Field label="Password" hint={signup ? "At least 10 characters. A short sentence works well." : undefined}>
        <Input name="password" type="password" autoComplete={signup ? "new-password" : "current-password"} required minLength={signup ? 10 : 1} />
      </Field>
      <FormError message={state.error} />
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Please wait…" : signup ? "Create account" : "Log in"}
      </Button>
      <p className="text-center text-sm text-muted">
        {signup ? "Already have an account? " : "New to TrackBharat? "}
        <Link href={`${signup ? "/login" : "/signup"}${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="text-primary underline underline-offset-2">
          {signup ? "Log in" : "Create an account"}
        </Link>
      </p>
    </form>
  );
}
