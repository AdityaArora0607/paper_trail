"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button, Card } from "@/components/ui";
import { Field } from "@/components/AuthForm";

export default function AccountPage() {
  const { user } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (next.length < 10) {
      setMsg({ ok: false, text: "New password must be at least 10 characters." });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      await api.changePassword(current, next);
      setCurrent("");
      setNext("");
      setMsg({ ok: true, text: "Password changed. Other sessions were signed out." });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof ApiError ? err.message : "Could not change password." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-md flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Account</h1>
      <Card>
        <div className="text-sm text-muted">Email</div>
        <div>{user?.email}</div>
      </Card>
      <Card>
        <h2 className="font-medium mb-3">Change password</h2>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <Field label="Current password" type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} />
          <Field label="New password (min 10 characters)" type="password" autoComplete="new-password" required value={next} onChange={(e) => setNext(e.target.value)} />
          {msg && (
            <div role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-success" : "text-danger"}`}>
              {msg.text}
            </div>
          )}
          <Button type="submit" variant="primary" loading={busy}>
            Change password
          </Button>
        </form>
      </Card>
    </div>
  );
}
