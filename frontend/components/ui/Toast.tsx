"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

export type ToastKind = "info" | "success" | "error";
interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}
interface ToastApi {
  /** Shows a toast; returns an id usable with update()/dismiss() for progress toasts. */
  toast: (message: string, opts?: { kind?: ToastKind; duration?: number }) => number;
  update: (id: number, message: string, opts?: { kind?: ToastKind; duration?: number }) => void;
  dismiss: (id: number) => void;
}

const noop: ToastApi = { toast: () => 0, update: () => {}, dismiss: () => {} };
const Ctx = createContext<ToastApi>(noop);

/** Safe without a provider (no-ops), so components render in isolation/tests. */
export function useToast(): ToastApi {
  return useContext(Ctx);
}

const KIND_CLASS: Record<ToastKind, string> = {
  info: "border-line",
  success: "border-success/50",
  error: "border-danger/50",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    setItems((xs) => xs.filter((x) => x.id !== id));
    const t = timers.current.get(id);
    if (t) clearTimeout(t);
    timers.current.delete(id);
  }, []);

  const schedule = useCallback(
    (id: number, kind: ToastKind, duration?: number) => {
      const t = timers.current.get(id);
      if (t) clearTimeout(t);
      const ms = duration ?? (kind === "info" ? 0 : kind === "error" ? 7000 : 4000);
      if (ms > 0) timers.current.set(id, setTimeout(() => dismiss(id), ms));
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      toast: (message, opts = {}) => {
        const id = nextId.current++;
        const kind = opts.kind ?? "info";
        setItems((xs) => [...xs.slice(-3), { id, kind, message }]);
        schedule(id, kind, opts.duration ?? (kind === "info" ? 4000 : undefined));
        return id;
      },
      update: (id, message, opts = {}) => {
        const kind = opts.kind ?? "info";
        setItems((xs) => xs.map((x) => (x.id === id ? { ...x, kind, message } : x)));
        schedule(id, kind, opts.duration);
      },
      dismiss,
    }),
    [schedule, dismiss],
  );

  return (
    <Ctx.Provider value={api}>
      {children}
      <div aria-live="polite" className="fixed bottom-4 right-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            role={t.kind === "error" ? "alert" : "status"}
            className={`flex items-start gap-2 rounded-lg border bg-panel px-3 py-2 text-sm shadow-lg ${KIND_CLASS[t.kind]}`}
          >
            <span className="flex-1 min-w-0 break-words">{t.message}</span>
            <button type="button" aria-label="Dismiss notification" onClick={() => dismiss(t.id)} className="text-muted hover:text-fg">
              ×
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
