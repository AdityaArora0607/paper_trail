"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { AuthCard, Button, Field } from "@/components/AuthForm";

function SignupForm() {
  const { config, refresh } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [invite, setInvite] = useState(useSearchParams().get("invite") ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 10) {
      setError("Password must be at least 10 characters.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.signup({ email: email.trim(), password, invite_code: invite.trim() || undefined });
      await refresh();
      router.replace("/");
    } catch (err) {
      setError(err instanceof ApiError ? (err.status === 409 ? "That email is already registered." : err.message) : "Signup failed.");
      setBusy(false);
    }
  }

  if (config && !config.allow_signup && !config.invite_signup) {
    return (
      <AuthCard title="Sign up">
        <p className="text-sm text-muted">Signup is closed.</p>
        <Link href="/login" className="text-accent underline text-sm">
          Back to log in
        </Link>
      </AuthCard>
    );
  }
  return (
    <AuthCard title="Create your account">
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Field label="Invite code" autoComplete="off" required={!config?.allow_signup} value={invite} onChange={(e) => setInvite(e.target.value)} />
        <Field label="Email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field label="Password (min 10 characters)" type="password" autoComplete="new-password" required minLength={10} value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && (
          <div role="alert" className="text-sm text-danger">
            {error}
          </div>
        )}
        <Button type="submit" variant="primary" size="lg" loading={busy}>
          Sign up
        </Button>
        <p className="text-xs text-muted">
          Already have an account?{" "}
          <Link href="/login" className="text-accent underline">
            Log in
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}
