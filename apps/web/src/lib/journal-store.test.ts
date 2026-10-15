import { readFileSync } from "node:fs";
import { describe, expect, it, beforeEach } from "vitest";
import {
  JOURNAL_STORAGE_KEY,
  answeredCount,
  answerFor,
  closeEntry,
  createEntry,
  exportEntryToMarkdown,
  exportFilename,
  hydrateJournal,
  reopenEntry,
  restorePrompt,
  sortedEntries,
  swapPrompt,
  useJournalStore,
  wordCount,
  writeAnswer,
  type JournalEntry,
  type JournalEntryMeta,
  type ServedPrompt,
} from "./journal-store";

/**
 * The journal is the only place in the atlas where a reader supplies their own words, so these
 * tests are mostly about the two claims the page makes out loud: that the words stay in this
 * browser, and that the server and the browser render the same thing first.
 *
 * Nothing here touches a DOM. The store is imported into a bare Node environment precisely so
 * that an accidental `document` or `window` reference at module scope fails here rather than in
 * a server render.
 */

const NOW = 1_767_225_600_000; // 2026-01-01T00:00:00.000Z
const LATER = NOW + 60_000;

const PROMPTS: readonly ServedPrompt[] = [
  { slot: "kingdom-1", kind: "kingdom", text: "What case in your own life makes the motto true?", variant: 0 },
  { slot: "advisor-1", kind: "advisor", text: "Where is Epictetus's move already doing work?", sourceId: "epictetus", variant: 0 },
  { slot: "cost-1", kind: "cost", text: "Which of your enemies have you spent the most words on?", variant: 0 },
];

const META: JournalEntryMeta = {
  dilemmaTitle: "The Paperclip Maximiser",
  kingdomName: "Longview Foundry",
  advisorNames: ["Epictetus", "Immanuel Kant"],
};

const entry = (): JournalEntry => createEntry("d01", PROMPTS, 2406, NOW);

/* ------------------------------------------------------------------ *
 * Keying and creation
 * ------------------------------------------------------------------ */

describe("createEntry", () => {
  it("records the dilemma, the seed it was written against, and when it was opened", () => {
    const created = entry();
    expect(created.dilemmaId).toBe("d01");
    expect(created.seed).toBe(2406);
    expect(created.savedAt).toBe(NOW);
    expect(created.closedAt).toBeNull();
    expect(created.answers).toEqual({});
  });

  it("keeps a sitting per dilemma so two dilemmas cannot overwrite each other", () => {
    const store = useJournalStore.getState();
    store.openEntry("d01", PROMPTS, 2406);
    store.write("d01", "kingdom-1", "the founder's example");
    store.openEntry("d02", PROMPTS, 2406);
    store.write("d02", "kingdom-1", "a different week entirely");

    const entries = useJournalStore.getState().entries;
    expect(Object.keys(entries).sort()).toEqual(["d01", "d02"]);
    expect(answerFor(entries["d01"] as JournalEntry, "kingdom-1")).toBe("the founder's example");
    expect(answerFor(entries["d02"] as JournalEntry, "kingdom-1")).toBe("a different week entirely");
  });

  it("does not restart a sitting that is already in progress", () => {
    const store = useJournalStore.getState();
    store.openEntry("d01", PROMPTS, 2406);
    store.write("d01", "cost-1", "kept");
    const before = useJournalStore.getState().entries["d01"];
    store.openEntry("d01", PROMPTS, 2406);
    expect(useJournalStore.getState().entries["d01"]).toBe(before);
  });

  it("ignores writes to a dilemma that has no sitting", () => {
    useJournalStore.getState().write("never-opened", "kingdom-1", "should not appear");
    expect(useJournalStore.getState().entries).toEqual({});
  });
});

/* ------------------------------------------------------------------ *
 * Answers
 * ------------------------------------------------------------------ */

describe("writeAnswer", () => {
  it("stores an answer against its slot", () => {
    const written = writeAnswer(entry(), "kingdom-1", "The case is my own deadline.", LATER);
    expect(answerFor(written, "kingdom-1")).toBe("The case is my own deadline.");
    expect(written.savedAt).toBe(LATER);
  });

  it("keeps whitespace-only answers out of the record", () => {
    const written = writeAnswer(writeAnswer(entry(), "kingdom-1", "something", NOW), "kingdom-1", "   \n  ", LATER);
    expect(answerFor(written, "kingdom-1")).toBe("");
    expect(written.answers).toEqual({});
  });

  it("treats re-typing the same text as no edit, so savedAt stays put", () => {
    const once = writeAnswer(entry(), "kingdom-1", "unchanged", LATER);
    const twice = writeAnswer(once, "kingdom-1", "unchanged", LATER + 999);
    expect(twice).toBe(once);
    expect(twice.savedAt).toBe(LATER);
  });

  it("counts only the prompts that were actually answered", () => {
    let current = entry();
    current = writeAnswer(current, "kingdom-1", "yes", NOW);
    current = writeAnswer(current, "advisor-1", "  ", NOW);
    current = writeAnswer(current, "cost-1", "the one I keep not paying for", NOW);
    expect(answeredCount(current)).toBe(2);
    expect(wordCount(current.answers["cost-1"] ?? "")).toBe(7);
  });
});

describe("wordCount", () => {
  it("is zero for nothing and ignores leading and trailing space", () => {
    expect(wordCount("")).toBe(0);
    expect(wordCount("   \n\t ")).toBe(0);
    expect(wordCount("  one   two\nthree ")).toBe(3);
  });
});

/* ------------------------------------------------------------------ *
 * The "stuck?" swap
 * ------------------------------------------------------------------ */

describe("swapPrompt", () => {
  it("replaces the question and records which axis question it became", () => {
    const swapped = swapPrompt(entry(), "kingdom-1", "Who is missing from this court's total?", "justice", 1, LATER);
    const prompt = swapped.prompts.find((candidate) => candidate.slot === "kingdom-1");
    expect(prompt?.text).toBe("Who is missing from this court's total?");
    expect(prompt?.axis).toBe("justice");
    expect(prompt?.variant).toBe(1);
    expect(swapped.savedAt).toBe(LATER);
  });

  it("keeps the words the reader already wrote against the old question", () => {
    const answered = writeAnswer(entry(), "kingdom-1", "written before the swap", NOW);
    const swapped = swapPrompt(answered, "kingdom-1", "a different question", "care", 1, LATER);
    expect(answerFor(swapped, "kingdom-1")).toBe("written before the swap");
  });

  it("leaves the other slots untouched", () => {
    const swapped = swapPrompt(entry(), "cost-1", "replaced", "agency", 2, LATER);
    expect(swapped.prompts.filter((prompt) => prompt.axis !== undefined).map((prompt) => prompt.slot)).toEqual([
      "cost-1",
    ]);
  });

  it("puts the engine's own prompt back, axis and all", () => {
    const swapped = swapPrompt(entry(), "kingdom-1", "replaced", "care", 2, LATER);
    const restored = restorePrompt(swapped, "kingdom-1", "the original question", LATER + 1);
    const prompt = restored.prompts.find((candidate) => candidate.slot === "kingdom-1");
    expect(prompt?.text).toBe("the original question");
    expect(prompt?.variant).toBe(0);
    expect(prompt?.axis).toBeUndefined();
    expect("axis" in (prompt as ServedPrompt)).toBe(false);
  });
});

/* ------------------------------------------------------------------ *
 * Closing the sitting
 * ------------------------------------------------------------------ */

describe("close and reopen", () => {
  it("stamps the close once and does not move it on a second press", () => {
    const closed = closeEntry(entry(), LATER);
    expect(closed.closedAt).toBe(LATER);
    expect(closeEntry(closed, LATER + 5_000)).toBe(closed);
  });

  it("reopens without discarding anything written", () => {
    const answered = writeAnswer(entry(), "cost-1", "still here", NOW);
    const reopened = reopenEntry(closeEntry(answered, LATER));
    expect(reopened.closedAt).toBeNull();
    expect(answerFor(reopened, "cost-1")).toBe("still here");
    expect(reopenEntry(reopened)).toBe(reopened);
  });
});

/* ------------------------------------------------------------------ *
 * Ordering and clearing
 * ------------------------------------------------------------------ */

describe("sortedEntries", () => {
  it("puts the most recently written sitting first, breaking ties by dilemma id", () => {
    const entries: Record<string, JournalEntry> = {
      d02: { ...createEntry("d02", PROMPTS, 1, NOW), savedAt: NOW },
      d01: { ...createEntry("d01", PROMPTS, 1, NOW), savedAt: NOW },
      d03: { ...createEntry("d03", PROMPTS, 1, LATER), savedAt: LATER },
    };
    expect(sortedEntries(entries).map((row) => row.dilemmaId)).toEqual(["d03", "d01", "d02"]);
  });

  it("returns an empty list for an empty record", () => {
    expect(sortedEntries({})).toEqual([]);
  });
});

describe("clear", () => {
  it("empties every sitting", () => {
    const store = useJournalStore.getState();
    store.openEntry("d01", PROMPTS, 2406);
    store.openEntry("d02", PROMPTS, 2406);
    useJournalStore.getState().clear();
    expect(useJournalStore.getState().entries).toEqual({});
  });
});

/* ------------------------------------------------------------------ *
 * Export
 * ------------------------------------------------------------------ */

describe("exportEntryToMarkdown", () => {
  it("carries the sitting, the answers and the seed", () => {
    const written = writeAnswer(entry(), "kingdom-1", "My own deadline, not the founder's.", LATER);
    const markdown = exportEntryToMarkdown(written, META, LATER);

    expect(markdown).toContain("# Nooreign journal — The Paperclip Maximiser");
    expect(markdown).toContain("- Realm: Longview Foundry");
    expect(markdown).toContain("- Court: Epictetus, Immanuel Kant");
    expect(markdown).toContain("- Seed: 2406");
    expect(markdown).toContain("My own deadline, not the founder's.");
    expect(markdown).toContain("_(not answered)_");
    expect(markdown).toContain("1 of 3 answered, 6 words.");
    // One heading per served prompt, in the order they were served.
    expect(markdown.match(/^## \d+\./gm)?.length).toBe(3);
  });

  it("says out loud where the words came from", () => {
    expect(exportEntryToMarkdown(entry(), META, NOW)).toContain(
      "Written in a browser, in local storage, and never sent to anything.",
    );
  });

  it("marks which question a swapped answer actually answers", () => {
    const answered = writeAnswer(entry(), "kingdom-1", "answered the other one", NOW);
    const swapped = swapPrompt(answered, "kingdom-1", "the justice question", "justice", 1, LATER);
    expect(exportEntryToMarkdown(swapped, META, LATER)).toContain("swapped for the justice question");
  });

  it("reports a sitting that was closed", () => {
    expect(exportEntryToMarkdown(closeEntry(entry(), LATER), META, LATER)).toContain(
      "- Sitting closed: yes, 2026-01-01T00:01:00.000Z",
    );
  });

  it("names the court it sat with when nobody was seated", () => {
    expect(
      exportEntryToMarkdown(entry(), { dilemmaTitle: "Alone", kingdomName: "Wilds", advisorNames: [] }, NOW),
    ).toContain("- Court: sat alone");
  });
});

describe("exportFilename", () => {
  it("is a safe, dated markdown filename", () => {
    expect(exportFilename("d01", NOW)).toBe("nooreign-journal-d01-2026-01-01.md");
    expect(exportFilename("The Paperclip/2", NOW)).toBe("nooreign-journal-the-paperclip-2-2026-01-01.md");
  });
});

/* ------------------------------------------------------------------ *
 * Hydration: the server and the browser must agree on first paint
 * ------------------------------------------------------------------ */

describe("hydration", () => {
  it("starts un-hydrated so the first client render matches the server's HTML", () => {
    expect(useJournalStore.getState().hasHydrated).toBe(false);
    expect(useJournalStore.persist.hasHydrated()).toBe(false);
  });

  it("flips the guard once rehydration has run", async () => {
    await hydrateJournal();
    expect(useJournalStore.getState().hasHydrated).toBe(true);
  });

  it("survives being re-hydrated more than once", async () => {
    const store = useJournalStore.getState();
    store.openEntry("d01", PROMPTS, 2406);
    store.write("d01", "kingdom-1", "first pass");
    await hydrateJournal();
    await hydrateJournal();
    expect(answerFor(useJournalStore.getState().entries["d01"] as JournalEntry, "kingdom-1")).toBe(
      "first pass",
    );
  });

  it("keeps the guard out of the persisted payload", () => {
    // `hasHydrated` is a render guard, not a fact about the reader's writing; persisting it
    // would mean a stale `true` could render answers before storage has been read.
    expect(Object.keys(useJournalStore.getState()).includes("entries")).toBe(true);
    expect(JOURNAL_STORAGE_KEY.startsWith("nooreign.journal.")).toBe(true);
  });
});

/* ------------------------------------------------------------------ *
 * The privacy claim, checked against the source rather than the promise
 * ------------------------------------------------------------------ */

describe("the promise that nothing is transmitted", () => {
  const source = readFileSync(new URL("./journal-store.ts", import.meta.url), "utf8");

  it("contains no request primitive at all", () => {
    for (const pattern of [
      /fetch\s*\(/,
      /XMLHttpRequest/,
      /sendBeacon/,
      /EventSource/,
      /WebSocket/,
      /importScripts/,
      /\bnavigator\b/,
      /\bhttps?:\/\//,
    ]) {
      expect(source, `journal-store.ts must not contain ${pattern}`).not.toMatch(pattern);
    }
  });

  it("reaches only the browser's own storage", () => {
    const storageReads = source.match(/localStorage/g) ?? [];
    expect(storageReads.length).toBeGreaterThan(0);
    expect(storageReads.every((read) => read === "localStorage")).toBe(true);
  });

  it("names one storage key, so a reader can find and erase the lot", () => {
    expect(JOURNAL_STORAGE_KEY).toBe("nooreign.journal.v1");
  });
});

beforeEach(() => {
  useJournalStore.setState({ entries: {}, hasHydrated: false });
});
