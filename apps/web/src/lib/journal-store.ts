/**
 * The reflective journal's storage layer.
 *
 * WHY this module exists on its own: the journal is the only surface in the atlas where a
 * reader types something that did not come from the seed data, so it is the only surface where
 * "where does this live?" has a real answer. The answer is here — this browser, one
 * `localStorage` key, nowhere else.
 *
 * Two promises this file has to keep, and how it keeps them:
 *
 *  1. **Nothing leaves.** There is no request primitive in this module at all, and
 *     `journal-store.test.ts` reads this file off disk and fails the build if one appears. The
 *     only storage reached is the one handed in by the browser itself.
 *  2. **First paint agrees with the server.** Rehydration is deferred (`skipHydration`) and gated
 *     behind `hasHydrated`, so the first client render is exactly what the server sent and the
 *     saved answers appear one tick later instead of flashing empty and then filling in.
 *
 * Every reducer below is a pure function that takes `now` as an argument, so the tests need
 * neither a clock nor a DOM.
 */
import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import type { PromptKind } from "@repo/core";
import type { AxiomKey } from "@repo/seed";

/** Bump the version only together with a `migrate`; an unreadable journal is thrown away, not parsed. */
export const JOURNAL_STORAGE_KEY = "nooreign.journal.v1";
export const JOURNAL_STORAGE_VERSION = 1;

/* ------------------------------------------------------------------ *
 * Records
 * ------------------------------------------------------------------ */

/**
 * One prompt as it was actually served.
 *
 * `slot` is the id the engine gave the prompt, which never changes; `text` is the question in
 * front of the reader right now. The two diverge when the reader presses "stuck?" and the
 * island swaps in a different question about the axis the dilemma turns on — `axis` records
 * which one and `variant` which of that axis's three.
 */
export interface ServedPrompt {
  readonly slot: string;
  readonly kind: PromptKind;
  readonly text: string;
  /** The advisor or kingdom that pressed, when the prompt came from one. */
  readonly sourceId?: string;
  readonly axis?: AxiomKey;
  /** 0 is the prompt as generated; 1..n are the axis prompts that replaced it. */
  readonly variant: number;
}

export interface JournalEntry {
  readonly dilemmaId: string;
  readonly prompts: readonly ServedPrompt[];
  /** Slot id to the reader's words. Only non-empty answers are kept. */
  readonly answers: Readonly<Record<string, string>>;
  /** The seed the prompts were generated against, so the sitting can be re-derived. */
  readonly seed: number;
  readonly savedAt: number;
  /** When the reader closed the sitting, or `null` while it is still open. */
  readonly closedAt: number | null;
}

/** Everything the markdown export needs that the store deliberately does not hold. */
export interface JournalEntryMeta {
  readonly dilemmaTitle: string;
  readonly kingdomName: string;
  readonly advisorNames: readonly string[];
}

/* ------------------------------------------------------------------ *
 * Pure reducers
 * ------------------------------------------------------------------ */

export function createEntry(
  dilemmaId: string,
  prompts: readonly ServedPrompt[],
  seed: number,
  now: number,
): JournalEntry {
  return { dilemmaId, prompts: [...prompts], answers: {}, seed, savedAt: now, closedAt: null };
}

/** Writing the same text twice is not an edit, and must not move `savedAt`. */
export function writeAnswer(entry: JournalEntry, slot: string, text: string, now: number): JournalEntry {
  if (entry.answers[slot] === text) return entry;
  const answers: Record<string, string> = { ...entry.answers };
  if (text.trim().length === 0) {
    delete answers[slot];
  } else {
    answers[slot] = text;
  }
  return { ...entry, answers, savedAt: now };
}

/**
 * Swap the question behind a slot.
 *
 * The answer is deliberately *not* cleared: swapping a question you cannot answer for one you
 * can should not throw away what you already wrote. Instead the export records which question
 * the words actually answer, and the island labels the swapped slot.
 */
export function swapPrompt(
  entry: JournalEntry,
  slot: string,
  text: string,
  axis: AxiomKey,
  variant: number,
  now: number,
): JournalEntry {
  return {
    ...entry,
    prompts: entry.prompts.map((prompt) =>
      prompt.slot === slot ? { ...prompt, text, axis, variant } : prompt,
    ),
    savedAt: now,
  };
}

/** Put the engine's own prompt back in front of the reader. */
export function restorePrompt(entry: JournalEntry, slot: string, text: string, now: number): JournalEntry {
  return {
    ...entry,
    // Rebuilt rather than spread so the axis is genuinely gone, not merely shadowed.
    prompts: entry.prompts.map((prompt) =>
      prompt.slot === slot
        ? {
            slot: prompt.slot,
            kind: prompt.kind,
            text,
            variant: 0,
            ...(prompt.sourceId === undefined ? {} : { sourceId: prompt.sourceId }),
          }
        : prompt,
    ),
    savedAt: now,
  };
}

export function closeEntry(entry: JournalEntry, now: number): JournalEntry {
  if (entry.closedAt !== null) return entry;
  return { ...entry, closedAt: now, savedAt: now };
}

export function reopenEntry(entry: JournalEntry): JournalEntry {
  if (entry.closedAt === null) return entry;
  return { ...entry, closedAt: null };
}

export function answerFor(entry: JournalEntry, slot: string): string {
  return entry.answers[slot] ?? "";
}

export function answeredCount(entry: JournalEntry): number {
  return entry.prompts.filter((prompt) => (entry.answers[prompt.slot] ?? "").trim().length > 0).length;
}

export function wordCount(text: string): number {
  const trimmed = text.trim();
  if (trimmed.length === 0) return 0;
  return trimmed.split(/\s+/).filter((word) => word.length > 0).length;
}

/** Newest sitting first; ties broken by id so the order never depends on object key order. */
export function sortedEntries(entries: Readonly<Record<string, JournalEntry>>): JournalEntry[] {
  return Object.values(entries).sort((a, b) => {
    if (b.savedAt !== a.savedAt) return b.savedAt - a.savedAt;
    return a.dilemmaId.localeCompare(b.dilemmaId);
  });
}

function isoOrRaw(value: number): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : String(value);
}

/**
 * The export a reader can keep.
 *
 * Built as a string in the browser and handed to a download; the privacy claim travels with it,
 * because a file that leaves the page should still say where it came from.
 */
export function exportEntryToMarkdown(
  entry: JournalEntry,
  meta: JournalEntryMeta,
  generatedAt: number,
): string {
  const lines: string[] = [
    `# Nooreign journal — ${meta.dilemmaTitle}`,
    "",
    `- Realm: ${meta.kingdomName}`,
    `- Court: ${meta.advisorNames.length > 0 ? meta.advisorNames.join(", ") : "sat alone"}`,
    `- Seed: ${entry.seed} (the same seed produces the same prompts)`,
    `- Last written: ${isoOrRaw(entry.savedAt)}`,
    `- Sitting closed: ${entry.closedAt === null ? "no" : `yes, ${isoOrRaw(entry.closedAt)}`}`,
    `- Exported: ${isoOrRaw(generatedAt)}`,
    "",
    "Written in a browser, in local storage, and never sent to anything.",
    "",
  ];

  entry.prompts.forEach((prompt, index) => {
    const asked = prompt.variant > 0 && prompt.axis !== undefined ? `swapped for the ${prompt.axis} question` : null;
    lines.push(`## ${index + 1}. ${prompt.text}`);
    lines.push("");
    lines.push(`*${prompt.kind}${prompt.sourceId === undefined ? "" : ` · ${prompt.sourceId}`}${asked === null ? "" : ` · ${asked}`}*`);
    lines.push("");
    lines.push(entry.answers[prompt.slot] ?? "_(not answered)_");
    lines.push("");
  });

  lines.push(
    `_${answeredCount(entry)} of ${entry.prompts.length} answered, ${entry.prompts.reduce((sum, prompt) => sum + wordCount(entry.answers[prompt.slot] ?? ""), 0)} words._`,
  );
  return lines.join("\n");
}

/** A filename that sorts by date and cannot contain anything awkward. */
export function exportFilename(dilemmaId: string, generatedAt: number): string {
  const date = new Date(generatedAt);
  const stamp = Number.isFinite(date.getTime())
    ? date.toISOString().slice(0, 10)
    : String(generatedAt);
  const safe = dilemmaId.replace(/[^a-z0-9-]+/gi, "-").toLowerCase();
  return `nooreign-journal-${safe}-${stamp}.md`;
}

/* ------------------------------------------------------------------ *
 * Store
 * ------------------------------------------------------------------ */

export interface JournalState {
  readonly entries: Readonly<Record<string, JournalEntry>>;
  /** False on the server and on the first client render; true once storage has been read. */
  readonly hasHydrated: boolean;
  /** Start a sitting, or return the one already in progress for this dilemma. */
  openEntry: (dilemmaId: string, prompts: readonly ServedPrompt[], seed: number) => void;
  write: (dilemmaId: string, slot: string, text: string) => void;
  swap: (dilemmaId: string, slot: string, text: string, axis: AxiomKey, variant: number) => void;
  restore: (dilemmaId: string, slot: string, text: string) => void;
  close: (dilemmaId: string) => void;
  reopen: (dilemmaId: string) => void;
  clear: () => void;
  markHydrated: () => void;
}

/** Stands in wherever there is no browser, so importing this module is safe on a server. */
const inertStorage: StateStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

function readableStorage(): StateStorage {
  if (typeof window === "undefined") return inertStorage;
  try {
    return window.localStorage;
  } catch {
    // Blocked by a strict privacy setting. The journal degrades to this session's memory
    // rather than throwing, because refusing to render a page over a storage policy is worse.
    return inertStorage;
  }
}

type PersistedJournal = Pick<JournalState, "entries">;

const now = (): number => Date.now();

export const useJournalStore = create<JournalState>()(
  persist<JournalState, [], [], PersistedJournal>(
    (set) => ({
      entries: {},
      hasHydrated: false,

      openEntry: (dilemmaId, prompts, seed) =>
        set((state) => {
          const existing = state.entries[dilemmaId];
          if (existing !== undefined) return state;
          return { entries: { ...state.entries, [dilemmaId]: createEntry(dilemmaId, prompts, seed, now()) } };
        }),

      write: (dilemmaId, slot, text) =>
        set((state) => {
          const existing = state.entries[dilemmaId];
          if (existing === undefined) return state;
          return { entries: { ...state.entries, [dilemmaId]: writeAnswer(existing, slot, text, now()) } };
        }),

      swap: (dilemmaId, slot, text, axis, variant) =>
        set((state) => {
          const existing = state.entries[dilemmaId];
          if (existing === undefined) return state;
          return {
            entries: { ...state.entries, [dilemmaId]: swapPrompt(existing, slot, text, axis, variant, now()) },
          };
        }),

      restore: (dilemmaId, slot, text) =>
        set((state) => {
          const existing = state.entries[dilemmaId];
          if (existing === undefined) return state;
          return { entries: { ...state.entries, [dilemmaId]: restorePrompt(existing, slot, text, now()) } };
        }),

      close: (dilemmaId) =>
        set((state) => {
          const existing = state.entries[dilemmaId];
          if (existing === undefined) return state;
          return { entries: { ...state.entries, [dilemmaId]: closeEntry(existing, now()) } };
        }),

      reopen: (dilemmaId) =>
        set((state) => {
          const existing = state.entries[dilemmaId];
          if (existing === undefined) return state;
          return { entries: { ...state.entries, [dilemmaId]: reopenEntry(existing) } };
        }),

      clear: () => set({ entries: {} }),

      markHydrated: () => set({ hasHydrated: true }),
    }),
    {
      name: JOURNAL_STORAGE_KEY,
      version: JOURNAL_STORAGE_VERSION,
      storage: createJSONStorage<PersistedJournal>(readableStorage),
      // Nothing is read during render, so the server's HTML and the first client render agree.
      skipHydration: true,
      partialize: (state) => ({ entries: state.entries }),
      onRehydrateStorage: () => (state) => {
        state?.markHydrated();
      },
    },
  ),
);

/** Called once from the island's mount effect; safe to call again. */
export async function hydrateJournal(): Promise<void> {
  await useJournalStore.persist.rehydrate();
}
