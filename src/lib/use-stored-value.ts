"use client";

import { useCallback, useSyncExternalStore } from "react";

// A JSON value kept in localStorage, shared by every component using the
// same key and kept in sync across tabs. The server (and a browser with
// storage blocked) sees `fallback`, so first paint never mismatches.

const CHANGE_EVENT = "scm-stored-value-change";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function readRaw(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

// useSyncExternalStore needs a stable snapshot, so parsed values are cached
// by their raw string.
const parsedCache = new Map<string, { raw: string; value: unknown }>();

function parse<T>(key: string, raw: string | null, fallback: T): T {
  if (raw === null) return fallback;
  const cached = parsedCache.get(key);
  if (cached && cached.raw === raw) return cached.value as T;
  try {
    const value = JSON.parse(raw) as T;
    parsedCache.set(key, { raw, value });
    return value;
  } catch {
    return fallback;
  }
}

export function useStoredValue<T>(key: string, fallback: T): [T, (next: T) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => parse(key, readRaw(key), fallback),
    () => fallback,
  );

  const setValue = useCallback(
    (next: T) => {
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // Storage blocked (private mode): the choice just isn't remembered.
      }
      window.dispatchEvent(new Event(CHANGE_EVENT));
    },
    [key],
  );

  return [value, setValue];
}
