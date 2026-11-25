"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiError } from "@/lib/api";
import { safeNext, useAuth } from "@/lib/auth";
import { AuthCard, Button, Field } from "@/components/AuthForm";

export function describeLoginError(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 429) {
      const wait = e.retryAfter
        ? e.retryAfter >= 90
          ? `${Math.ceil(e.retryAfter / 60)} minutes`
          : `${e.retryAfter} seconds`
        : "a little while";
      return `Too many attempts. Try again in ${wait}.`;
    }
    if (e.unreachable) return e.message;
    return e.status === 401 ? "Invalid email or password." : e.message;
  }
  return "Login failed.";
}

function LoginForm() {
  const { login, config } = useAuth();
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email.trim(), password);
      router.replace(next);
    } catch (err) {
      setError(describeLoginError(err));
      setBusy(false);
    }
  }

  const canSignup = !!config && (config.allow_signup || config.invite_signup);
  return (
    <AuthCard title="Log in to PaperTrail">
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Field label="Email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field label="Password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && (
          <div role="alert" className="text-sm text-danger">
            {error}
          </div>
        )}
        <Button type="submit" variant="primary" size="lg" loading={busy}>
          Log in
        </Button>
        {canSignup && (
          <p className="text-xs text-muted">
            Have an invite?{" "}
            <Link href="/signup" className="text-accent underline">
              Sign up
            </Link>
          </p>
        )}
      </form>
    </AuthCard>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
