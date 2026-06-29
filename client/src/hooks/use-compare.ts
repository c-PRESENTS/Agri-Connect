import { useEffect, useState, useCallback } from "react";

const KEY = "agriconnect-compare-list";
const MAX = 4;

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(v) ? v.slice(0, MAX) : [];
  } catch {
    return [];
  }
}

function write(ids: string[]) {
  localStorage.setItem(KEY, JSON.stringify(ids));
  window.dispatchEvent(new CustomEvent("compare-changed", { detail: ids }));
}

export function useCompare() {
  const [ids, setIds] = useState<string[]>(read);

  useEffect(() => {
    const handler = (e: Event) => setIds((e as CustomEvent).detail);
    window.addEventListener("compare-changed", handler);
    return () => window.removeEventListener("compare-changed", handler);
  }, []);

  const toggle = useCallback((id: string) => {
    const cur = read();
    const next = cur.includes(id)
      ? cur.filter(x => x !== id)
      : cur.length >= MAX
        ? cur
        : [...cur, id];
    write(next);
    return next.includes(id);
  }, []);

  const remove = useCallback((id: string) => {
    write(read().filter(x => x !== id));
  }, []);

  const clear = useCallback(() => write([]), []);

  return { ids, toggle, remove, clear, isFull: ids.length >= MAX, max: MAX };
}
