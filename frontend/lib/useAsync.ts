"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface AsyncState<T> {
  data: T | null;
  error: Error | null;
  loading: boolean;
  reload: () => void;
}

interface Settled<T> {
  key: string;
  data: T | null;
  error: Error | null;
}

/** Runs `fn` on mount and whenever `deps` (primitives) change; never throws into render. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [settled, setSettled] = useState<Settled<T> | null>(null);
  const [tick, setTick] = useState(0);
  const fnRef = useRef(fn);
  const key = JSON.stringify([...deps, tick]);

  useEffect(() => {
    fnRef.current = fn;
  });

  useEffect(() => {
    let cancelled = false;
    fnRef
      .current()
      .then((data) => {
        if (!cancelled) setSettled({ key, data, error: null });
      })
      .catch((e: unknown) => {
        if (!cancelled) setSettled((s) => ({ key, data: s?.data ?? null, error: e instanceof Error ? e : new Error(String(e)) }));
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const loading = settled?.key !== key;
  return {
    data: settled?.data ?? null,
    error: loading ? null : (settled?.error ?? null),
    loading,
    reload,
  };
}
