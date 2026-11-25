"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useAsync } from "@/lib/useAsync";
import { Button, Card } from "@/components/ui";
import { ErrorBanner, Loading } from "@/components/States";

const fmt = (s: string | null) => (s ? s.slice(0, 16).replace("T", " ") : "—");

export default function AdminPage() {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user?.is_admin) return <div role="alert" className="text-sm text-danger">Admin only.</div>;
  return <AdminPanel />;
}

function AdminPanel() {
  const users = useAsync(() => api.adminUsers(), []);
  const invites = useAsync(() => api.adminInvites(), []);
  const [created, setCreated] = useState<{ code: string; expires_at: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const link = created && typeof window !== "undefined" ? `${window.location.origin}/signup?invite=${created.code}` : "";

  async function create() {
    setErr(null);
    setCopied(false);
    try {
      setCreated(await api.createInvite());
      invites.reload();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Could not create invite.");
    }
  }
  async function revoke(id: number, email: string) {
    setErr(null);
    try {
      const r = await api.revokeSessions(id);
      setNote(`Revoked ${r.revoked} session(s) for ${email}.`);
      users.reload();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Could not revoke sessions.");
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      /* clipboard unavailable; the link is visible to copy manually */
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Admin</h1>
      {err && <div role="alert" className="text-sm text-danger">{err}</div>}
      {note && <div role="status" className="text-sm text-muted">{note}</div>}

      <section>
        <h2 className="font-medium mb-2">Users</h2>
        {users.error && <ErrorBanner error={users.error} onRetry={users.reload} />}
        {users.loading && !users.data ? (
          <Loading />
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-muted">
              <tr>
                <th>Email</th><th>Admin</th><th>Sessions</th><th>Last seen</th><th>Library</th><th />
              </tr>
            </thead>
            <tbody>
              {users.data?.map((u) => (
                <tr key={u.id} className="border-t border-line">
                  <td className="py-1.5">{u.email}</td>
                  <td>{u.is_admin ? "yes" : ""}</td>
                  <td>{u.active_sessions}</td>
                  <td>{fmt(u.last_seen)}</td>
                  <td>{u.library_size}</td>
                  <td className="text-right">
                    <Button size="sm" variant="danger" onClick={() => revoke(u.id, u.email)}>
                      Revoke sessions
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <div className="flex items-center gap-3 mb-2">
          <h2 className="font-medium">Invites</h2>
          <Button size="sm" variant="primary" onClick={create}>
            Create invite
          </Button>
        </div>
        {created && (
          <Card className="mb-3">
            <div className="text-sm text-muted mb-1">New invite code (shown once — copy it now)</div>
            <code data-testid="invite-code" className="block font-mono break-all">{created.code}</code>
            <div className="text-xs text-muted mt-1 break-all">{link}</div>
            <div className="flex items-center gap-2 mt-2">
              <Button size="sm" onClick={copy}>{copied ? "Copied" : "Copy link"}</Button>
              <span className="text-xs text-muted">Expires {fmt(created.expires_at)}</span>
              <Button size="sm" variant="ghost" onClick={() => setCreated(null)}>Dismiss</Button>
            </div>
          </Card>
        )}
        {invites.error && <ErrorBanner error={invites.error} onRetry={invites.reload} />}
        <table className="w-full text-sm">
          <thead className="text-left text-muted">
            <tr><th>Created</th><th>Expires</th><th>Status</th></tr>
          </thead>
          <tbody>
            {invites.data?.map((i) => (
              <tr key={i.id} className="border-t border-line">
                <td className="py-1.5">{fmt(i.created_at)}</td>
                <td>{fmt(i.expires_at)}</td>
                <td>{i.used_at ? `used ${fmt(i.used_at)}` : new Date(i.expires_at) < new Date() ? "expired" : "unused"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
