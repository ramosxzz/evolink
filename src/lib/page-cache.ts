"use client";

import { useCallback, useState, type SetStateAction } from "react";

// In-memory cache for page data. Pages start from the last value they had,
// so switching tabs shows content right away instead of a full skeleton,
// then refresh in the background. Cleared on sign-out (full reload).
const store = new Map<string, unknown>();

export const peekCache = <T,>(key: string) => store.get(key) as T | undefined;
export const writeCache = <T,>(key: string, value: T) => { store.set(key, value); };
export const hasCache = (key: string) => store.has(key);

/** useState whose value survives unmounting, keyed by `key`. */
export function useCached<T>(key: string, initial: T) {
  const [state, setState] = useState<{ key: string; value: T }>(() => ({ key, value: store.has(key) ? (store.get(key) as T) : initial }));
  const value = state.key === key ? state.value : store.has(key) ? (store.get(key) as T) : initial;
  const set = useCallback((next: SetStateAction<T>) => {
    setState(current => {
      const previous = current.key === key ? current.value : store.has(key) ? (store.get(key) as T) : initial;
      const resolved = typeof next === "function" ? (next as (value: T) => T)(previous) : next;
      store.set(key, resolved);
      return { key, value: resolved };
    });
    // `initial` is only a fallback for the first read; it does not change the setter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return [value, set] as const;
}
