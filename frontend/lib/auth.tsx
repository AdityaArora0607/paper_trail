"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api, ApiError, AUTH_EXPIRED_EVENT, type AuthConfig, type User } from "./api";

interface AuthState {
  user: User | null;
  loading: boolean;
  /** server reachable but auth/me failed for a reason other than 401 */
  error: Error | null;
  config: AuthConfig | null;
  devAutologin: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setUser: (u: User | null) => void;
}

const noop = async () => {
  throw new Error("AuthProvider missing");
};
const Ctx = createContext<AuthState>({
  user: null,
  loading: false,
  error: null,
  config: null,
  devAutologin: false,
  login: noop as AuthState["login"],
  logout: noop,
  refresh: noop,
  setUser: () => {},
});

export const useAuth = () => useContext(Ctx);

export const PUBLIC_PATHS = ["/login", "/signup"];
export const isPublicPath = (p: string) => PUBLIC_PATHS.some((x) => p === x || p.startsWith(x + "/"));

/** Only same-site relative paths are allowed as post-login targets. */
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  return next;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const [user, setUser] = useState<User | null>(null);
  const [config, setConfig] = useState<AuthConfig | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setUser(await api.me());
      setError(null);
    } catch (e) {
      setUser(null);
      setError(e instanceof ApiError && e.status === 401 ? null : e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    api.authConfig().then(setConfig, () => {});
  }, [refresh]);

  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const u = await api.login(email, password);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      setUser(null);
    }
  }, []);

  const needsLogin = !loading && !user && !error && !isPublicPath(pathname);
  useEffect(() => {
    if (needsLogin) {
      const search = typeof window !== "undefined" ? window.location.search : "";
      router.replace(`/login?next=${encodeURIComponent(pathname + search)}`);
    }
  }, [needsLogin, pathname, router]);

  const value = useMemo<AuthState>(
    () => ({ user, loading, error, config, devAutologin: !!config?.dev_autologin, login, logout, refresh, setUser }),
    [user, loading, error, config, login, logout, refresh],
  );

  const blocked = !isPublicPath(pathname) && (loading || needsLogin);
  return (
    <Ctx.Provider value={value}>
      {blocked ? (
        <div role="status" className="text-muted text-sm py-8 text-center">
          Loading…
        </div>
      ) : (
        children
      )}
    </Ctx.Provider>
  );
}
