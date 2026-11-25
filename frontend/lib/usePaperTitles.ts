"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "./api";

const cache = new Map<number, string>();

/** Resolves paper ids to titles (best effort, cached) for evidence links. */
export function usePaperTitles(ids: number[]): Record<number, string> {
  const key = useMemo(() => Array.from(new Set(ids)).sort((a, b) => a - b).join(","), [ids]);
  const [, bump] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const missing = key ? key.split(",").map(Number).filter((id) => !cache.has(id)) : [];
    if (missing.length === 0) return;
    Promise.all(
      missing.map((id) =>
        api
          .getPaper(id)
          .then((p) => cache.set(id, p.title))
          .catch(() => {}),
      ),
    ).then(() => !cancelled && bump((n) => n + 1));
    return () => {
      cancelled = true;
    };
  }, [key]);
  const out: Record<number, string> = {};
  if (key) for (const id of key.split(",").map(Number)) if (cache.has(id)) out[id] = cache.get(id)!;
  return out;
}
