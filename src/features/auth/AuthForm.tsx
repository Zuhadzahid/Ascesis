"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { signInAction, signUpAction, type AuthResult } from "./actions";
import { GoogleButton } from "./GoogleButton";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-olive px-4 py-2.5 text-sm font-semibold text-beige shadow-card transition-colors hover:bg-olive-700 disabled:opacity-60"
    >
      {pending ? "Please wait…" : label}
    </button>
  );
}

export function AuthForm({
  mode,
  next = "/app",
  initialError,
}: {
  mode: "signin" | "signup";
  next?: string;
  initialError?: string;
}) {
  const action = mode === "signin" ? signInAction : signUpAction;
  const [state, formAction] = useActionState<AuthResult, FormData>(action, {
    error: initialError,
  });

  return (
    <div className="w-full max-w-sm">
      <div className="rounded-2xl border border-card-border bg-card p-6 shadow-float">
        <h1 className="text-xl font-semibold text-ink">
          {mode === "signin" ? "Welcome back" : "Create your canvas"}
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          {mode === "signin"
            ? "Sign in to open your week."
            : "One place for everything you need to do."}
        </p>

        <div className="mt-5">
          <GoogleButton next={next} />
        </div>

        <div className="my-5 flex items-center gap-3 text-xs text-ink-faint">
          <span className="h-px flex-1 bg-card-border" />
          or
          <span className="h-px flex-1 bg-card-border" />
        </div>

        <form action={formAction} className="space-y-3">
          <input type="hidden" name="next" value={next} />
          {mode === "signup" && (
            <Field
              name="name"
              label="Name"
              type="text"
              autoComplete="name"
              placeholder="Your name"
            />
          )}
          <Field
            name="email"
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
          />
          <Field
            name="password"
            label="Password"
            type="password"
            autoComplete={
              mode === "signin" ? "current-password" : "new-password"
            }
            placeholder="••••••••"
            required
          />

          {state.error && (
            <p className="rounded-md bg-danger-soft/60 px-3 py-2 text-xs text-danger">
              {state.error}
            </p>
          )}
          {state.message && (
            <p className="rounded-md bg-tea px-3 py-2 text-xs text-ink-soft">
              {state.message}
            </p>
          )}

          <SubmitButton label={mode === "signin" ? "Sign in" : "Sign up"} />
        </form>
      </div>

      <p className="mt-4 text-center text-sm text-ink-soft">
        {mode === "signin" ? (
          <>
            New here?{" "}
            <Link href="/signup" className="font-medium text-olive underline">
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-olive underline">
              Sign in
            </Link>
          </>
        )}
      </p>
    </div>
  );
}

function Field({
  name,
  label,
  ...props
}: { name: string; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-ink-soft">
        {label}
      </span>
      <input
        name={name}
        {...props}
        className="w-full rounded-lg border border-card-border bg-beige-100 px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-teal-600"
      />
    </label>
  );
}
