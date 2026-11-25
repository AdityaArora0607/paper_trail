"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useAsync } from "@/lib/useAsync";

const links = [
  { href: "/", label: "Home", exact: true },
  { href: "/library", label: "Library" },
  { href: "/path", label: "Reading path" },
  { href: "/profile", label: "Profile" },
];

export default function Nav() {
  const pathname = usePathname();
  const health = useAsync(() => api.health(), []);
  const { user, devAutologin, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  async function doLogout() {
    setOpen(false);
    await logout();
    router.replace("/login");
  }
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-panel/90 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 h-12 flex items-center gap-6">
          <Link href="/" className="font-semibold tracking-tight">
            PaperTrail
          </Link>
          <nav aria-label="Main" className="flex gap-1">
            {links.map((l) => {
              const active = l.exact ? pathname === l.href : pathname.startsWith(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-md px-2.5 py-1 text-sm transition-colors ${
                    active ? "bg-hover text-fg font-medium" : "text-muted hover:text-fg hover:bg-hover"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
          {user && (
            <div className="ml-auto relative">
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={open}
                onClick={() => setOpen((o) => !o)}
                className="flex items-center gap-2 rounded-md px-2 py-1 text-sm text-muted hover:text-fg hover:bg-hover"
              >
                <span>{user.email}</span>
                {devAutologin && (
                  <span className="rounded bg-warn/15 text-warn px-1 text-[10px] uppercase">dev</span>
                )}
              </button>
              {open && (
                <div role="menu" className="absolute right-0 mt-1 w-44 rounded-lg border border-line bg-panel shadow-lg py-1 text-sm">
                  <Link role="menuitem" href="/account" onClick={() => setOpen(false)} className="block px-3 py-1.5 hover:bg-hover">
                    Account
                  </Link>
                  {user.is_admin && (
                    <Link role="menuitem" href="/admin" onClick={() => setOpen(false)} className="block px-3 py-1.5 hover:bg-hover">
                      Admin
                    </Link>
                  )}
                  <button role="menuitem" type="button" onClick={doLogout} className="block w-full text-left px-3 py-1.5 hover:bg-hover">
                    Log out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>
      {health.error && (
        <div role="alert" className="bg-warn/15 border-b border-warn/40 text-warn text-sm px-4 py-1.5 text-center">
          API unreachable — {health.error.message}. Data below may be missing.
        </div>
      )}
    </>
  );
}
