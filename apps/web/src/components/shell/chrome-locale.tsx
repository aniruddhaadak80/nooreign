"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { DEFAULT_LOCALE, LOCALES, translate, type MessageKey } from "@repo/i18n";

/**
 * Locale switching for the chrome.
 *
 * Honest about its scope. This translates the *interface*: the navigation, the
 * skip link, the palette, the verdict and trace labels. It does not translate the
 * philosophy — machine-translating Bentham would be a worse product than leaving
 * him in English, and a reader who needs a translated summary has a language model
 * and a far better one than 100 strings. The menu says so rather than hiding it.
 *
 * **Why `useSyncExternalStore` rather than `useState` + `useEffect`.** The saved
 * preference lives in `localStorage`, which the server cannot read, so the two
 * renders have to disagree at some point — that is unavoidable, it is what
 * "remembered preference" means. What is avoidable is doing it in an effect:
 * an effect that calls `setState` schedules a second render for the *same*
 * paint, and on a header with fourteen nav labels that is a visible flash of the
 * wrong language. React's answer to an external store is `useSyncExternalStore`,
 * which reads the snapshot *during* render, re-renders once after hydration if
 * it moved, and has no effect at all. The rule against `setState` inside
 * `useEffect` is a real one, and the way to satisfy it here is not a suppress
 * comment; it is to stop needing the effect.
 */

const STORAGE_KEY = "nooreign.locale";

/** Which catalogue key stands in for each piece of chrome. */
const NAV_KEYS: Record<string, MessageKey> = {
  "/kingdoms": "nav.kingdoms",
  "/court": "nav.court",
  "/council": "nav.council",
  "/dilemmas": "nav.dilemmas",
  "/chronicle": "nav.chronicle",
  "/observatory": "nav.observatory",
  "/experiments": "nav.experiments",
  "/codex": "nav.codex",
  "/compare": "nav.compare",
  "/engine": "nav.engine",
  "/journal": "nav.journal",
  "/cartographer": "nav.cartographer",
  "/method": "nav.method",
};

/* ------------------------------------------------------------------ *
 * The store
 * ------------------------------------------------------------------ */

/**
 * Cached so `getSnapshot` returns the *same* reference on every call.
 *
 * React compares snapshots with `Object.is` and re-renders whenever they differ;
 * returning a fresh string is safe only because every value here is a primitive,
 * but reading `localStorage` on every call would not be. This caches the read
 * and lets `write` invalidate it.
 */
let snapshot: string | undefined;
const listeners = new Set<() => void>();

function read(): string {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored && LOCALES.some((locale) => locale.code === stored) ? stored : DEFAULT_LOCALE;
}

function getSnapshot(): string {
  snapshot ??= read();
  return snapshot;
}

/** The server always renders English, so the first client render matches it. */
function getServerSnapshot(): string {
  return DEFAULT_LOCALE;
}

function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  // `storage` only fires in *other* tabs, so switching locales in a second tab
  // stays honest too.
  window.addEventListener("storage", onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function write(next: string): void {
  if (!LOCALES.some((locale) => locale.code === next)) return;
  if (snapshot === next) return;
  snapshot = next;
  window.localStorage.setItem(STORAGE_KEY, next);
  for (const listener of listeners) listener();
}

function applyDocument(code: string): void {
  const descriptor = LOCALES.find((locale) => locale.code === code);
  document.documentElement.lang = descriptor?.locale ?? code;
  document.documentElement.dir = descriptor?.dir ?? "ltr";
}

/* ------------------------------------------------------------------ *
 * The hook
 * ------------------------------------------------------------------ */

export interface ChromeLocale {
  code: string;
  dir: "ltr" | "rtl";
  nativeName: string;
  /** Translate one chrome string in the active locale. */
  t: (key: MessageKey) => string;
  /** Translate a nav section by href. */
  navLabel: (href: string) => string;
  setLocale: (code: string) => void;
}

export function useChromeLocale(): ChromeLocale {
  const code = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Attribute-only side effect: `<html lang>` and `<html dir>` have to follow
  // the choice, and React has no state to update. `applyDocument` touches the
  // document, not a component, so nothing here schedules a render.
  useEffect(() => {
    applyDocument(code);
  }, [code]);

  const setLocale = useCallback((next: string) => write(next), []);

  const t = useCallback((key: MessageKey) => translate(code, key), [code]);
  const navLabel = useCallback(
    (href: string) => {
      const key = NAV_KEYS[href];
      return key ? translate(code, key) : href;
    },
    [code],
  );

  const descriptor = LOCALES.find((locale) => locale.code === code);

  return {
    code,
    dir: descriptor?.dir ?? "ltr",
    nativeName: descriptor?.nativeName ?? "English",
    t,
    navLabel,
    setLocale,
  };
}

export { NAV_KEYS };
