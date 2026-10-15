"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AxiomKey } from "@repo/seed";
import type { PromptKind } from "@repo/core";
import {
  exportEntryToMarkdown,
  exportFilename,
  hydrateJournal,
  answeredCount,
  wordCount,
  useJournalStore,
  type JournalEntryMeta,
  type ServedPrompt,
} from "@/lib/journal-store";

/** A prompt as the server rendered it. Mirrors `ReflectivePrompt` at the island boundary. */
export interface JournalPrompt {
  readonly id: string;
  readonly kind: PromptKind;
  readonly text: string;
  readonly sourceId?: string;
}

export interface JournalIslandProps {
  readonly dilemmaId: string;
  readonly dilemmaTitle: string;
  readonly kingdomName: string;
  readonly advisorNames: readonly string[];
  /** `reflectivePrompts(...)` — the engine's own questions, in the engine's own order. */
  readonly prompts: readonly JournalPrompt[];
  /** The axis this dilemma actually turns on. */
  readonly pivotAxis: AxiomKey;
  /**
   * `promptsForAxiom(pivotAxis, kingdom)` — three different questions about the one axis this
   * case hinges on. Computed on the server so that "stuck?" needs no engine on the client.
   */
  readonly reserve: readonly string[];
  readonly seed: number;
  /** `closingRitual(advisorIds, winnerId)` — shown once the sitting is closed. */
  readonly closing: readonly string[];
}

const KIND_LABEL: Record<PromptKind, string> = {
  kingdom: "the realm",
  advisor: "an advisor",
  dilemma: "the case",
  revision: "last time",
  cost: "the cost",
};

const AXIS_LABEL: Record<AxiomKey, string> = {
  welfare: "welfare",
  rights: "rights",
  virtue: "virtue",
  care: "care",
  justice: "justice",
  agency: "agency",
};

/**
 * The reflective journal.
 *
 * The engine has already done its part on the server: the prompts, the axis replacements and the
 * closing line are all computed there, so this island holds no philosophy and no arithmetic. What
 * it holds is the reader's words, and those live in one `localStorage` key — nothing here is sent
 * anywhere, and the page says so in the same words the module is written in.
 *
 * Two rendering details are load-bearing. Before `hasHydrated` flips, every answer reads as empty
 * and every textarea is disabled, because the server's HTML has no idea what is in storage and a
 * controlled input that changes value under a reader's fingers loses the first keystroke. After
 * the flip the saved sitting appears whole, which is also why the export is offered from the
 * store rather than from component state.
 */
export function JournalIsland({
  dilemmaId,
  dilemmaTitle,
  kingdomName,
  advisorNames,
  prompts,
  pivotAxis,
  reserve,
  seed,
  closing,
}: JournalIslandProps) {
  const entry = useJournalStore((state) => state.entries[dilemmaId]);
  const hasHydrated = useJournalStore((state) => state.hasHydrated);
  const openEntry = useJournalStore((state) => state.openEntry);
  const write = useJournalStore((state) => state.write);
  const swap = useJournalStore((state) => state.swap);
  const restore = useJournalStore((state) => state.restore);
  const close = useJournalStore((state) => state.close);
  const reopen = useJournalStore((state) => state.reopen);
  const clearAll = useJournalStore((state) => state.clear);

  const [status, setStatus] = useState<string>("");
  const [confirmingErase, setConfirmingErase] = useState(false);

  /** The engine's prompts, expressed in the shape the store keeps. Stable across renders. */
  const servedFromProps = useMemo<readonly ServedPrompt[]>(
    () =>
      prompts.map((prompt) => ({
        slot: prompt.id,
        kind: prompt.kind,
        text: prompt.text,
        variant: 0,
        ...(prompt.sourceId === undefined ? {} : { sourceId: prompt.sourceId }),
      })),
    [prompts],
  );

  useEffect(() => {
    let cancelled = false;
    void hydrateJournal().then(() => {
      if (!cancelled) openEntry(dilemmaId, servedFromProps, seed);
    });
    return () => {
      cancelled = true;
    };
  }, [dilemmaId, openEntry, seed, servedFromProps]);

  // Until storage has been read the entry does not exist, and the prompts shown are the ones
  // the server sent — which is exactly what should be on screen anyway.
  const served = entry?.prompts ?? servedFromProps;
  const closed = entry !== undefined && entry.closedAt !== null;
  const answered = entry === undefined ? 0 : answeredCount(entry);
  const words = entry === undefined
    ? 0
    : served.reduce((sum, prompt) => sum + wordCount(entry.answers[prompt.slot] ?? ""), 0);

  const originalText = useCallback(
    (slot: string): string | undefined => prompts.find((prompt) => prompt.id === slot)?.text,
    [prompts],
  );

  const onStuck = useCallback(
    (prompt: ServedPrompt) => {
      const next = prompt.variant + 1;
      if (next > reserve.length) {
        const original = originalText(prompt.slot);
        if (original === undefined) return;
        restore(dilemmaId, prompt.slot, original);
        setStatus("That was the last question in reserve; the engine's own prompt is back in front of you.");
        return;
      }
      const replacement = reserve[next - 1];
      if (replacement === undefined) return;
      swap(dilemmaId, prompt.slot, replacement, pivotAxis, next);
      setStatus(`Prompt replaced with a ${AXIS_LABEL[pivotAxis]} question, ${next} of ${reserve.length}.`);
    },
    [dilemmaId, originalText, pivotAxis, reserve, restore, swap],
  );

  const onRestore = useCallback(
    (prompt: ServedPrompt) => {
      const original = originalText(prompt.slot);
      if (original === undefined) return;
      restore(dilemmaId, prompt.slot, original);
      setStatus("Prompt restored to the one the engine generated.");
    },
    [dilemmaId, originalText, restore],
  );

  const download = useCallback(() => {
    const current = useJournalStore.getState().entries[dilemmaId];
    if (current === undefined) {
      setStatus("Nothing to export yet — write something first.");
      return;
    }
    const meta: JournalEntryMeta = { dilemmaTitle, kingdomName, advisorNames };
    const generatedAt = Date.now();
    const markdown = exportEntryToMarkdown(current, meta, generatedAt);
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = exportFilename(dilemmaId, generatedAt);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    // Revoked on the next tick: browsers cancel an in-flight download whose object URL is
    // released synchronously, and the file has to survive long enough to be picked up.
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    setStatus(`Exported ${exportFilename(dilemmaId, generatedAt)}.`);
  }, [advisorNames, dilemmaId, dilemmaTitle, kingdomName]);

  const onErase = useCallback(() => {
    clearAll();
    setConfirmingErase(false);
    openEntry(dilemmaId, servedFromProps, seed);
    setStatus("Every sitting in this browser has been erased.");
  }, [clearAll, dilemmaId, openEntry, seed, servedFromProps]);

  const announceRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (status.length > 0) announceRef.current?.scrollIntoView({ block: "nearest" });
  }, [status]);

  return (
    <section className="mt-10 flex flex-col gap-8" aria-labelledby="journal-sitting">
      <h2 id="journal-sitting" className="eyebrow">
        The sitting
      </h2>

      {/* ------------------------------- toolbar ------------------------------ */}
      <div className="plate rounded-realm flex flex-wrap items-center gap-3 p-4">
        <p className="tabular mr-auto font-mono text-[11px] text-parchment-dim">
          {answered} of {served.length} answered · {words} words ·{" "}
          {hasHydrated ? "read from this browser" : "reading this browser…"}
        </p>

        <button
          type="button"
          onClick={download}
          data-testid="journal-export"
          className="rounded-realm border border-abyss-border px-4 py-2 font-mono text-xs uppercase tracking-[0.16em] text-parchment transition-colors hover:border-gold hover:text-gold"
        >
          Export as markdown
        </button>

        {closed ? (
          <button
            type="button"
            onClick={() => {
              reopen(dilemmaId);
              setStatus("Sitting reopened.");
            }}
            className="rounded-realm border border-abyss-border px-4 py-2 font-mono text-xs uppercase tracking-[0.16em] text-parchment transition-colors hover:border-gold hover:text-gold"
          >
            Reopen
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              close(dilemmaId);
              setStatus("Sitting closed.");
            }}
            data-testid="journal-close"
            className="rounded-realm bg-gold px-4 py-2 font-mono text-xs uppercase tracking-[0.16em] text-ink transition-opacity hover:opacity-90"
          >
            Close the sitting
          </button>
        )}

        {confirmingErase ? (
          <span className="flex flex-wrap items-center gap-2 text-xs text-crimson">
            Erase every sitting in this browser?
            <button
              type="button"
              onClick={onErase}
              data-testid="journal-clear"
              className="rounded-realm border border-crimson/70 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-crimson hover:bg-crimson/10"
            >
              Erase
            </button>
            <button
              type="button"
              onClick={() => setConfirmingErase(false)}
              className="rounded-realm border border-abyss-border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-parchment-dim hover:text-parchment"
            >
              Keep them
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingErase(true)}
            className="rounded-realm border border-abyss-border px-4 py-2 font-mono text-xs uppercase tracking-[0.16em] text-parchment-dim transition-colors hover:border-crimson hover:text-crimson"
          >
            Erase
          </button>
        )}
      </div>

      <p ref={announceRef} role="status" aria-live="polite" className="min-h-5 text-xs text-verdigris">
        {status}
      </p>

      {/* --------------------------- closing ritual --------------------------- */}
      {closed ? (
        <blockquote
          data-testid="journal-closing"
          className="plate rounded-realm border-l-2 border-gold/70 p-6"
          aria-live="polite"
        >
          {closing.map((line) => (
            <p key={line} className="serif text-lg leading-relaxed text-parchment">
              {line}
            </p>
          ))}
          <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.16em] text-parchment-dim/70">
            Closed and kept in this browser. Nothing about it was sent anywhere.
          </p>
        </blockquote>
      ) : null}

      {/* ------------------------------- prompts ------------------------------ */}
      <ol className="flex flex-col gap-6" data-testid="journal-prompts">
        {served.map((prompt, index) => {
          const answer = entry?.answers[prompt.slot] ?? "";
          const swapped = prompt.variant > 0 && prompt.axis !== undefined;
          const axis = prompt.axis ?? pivotAxis;
          const textId = `journal-prompt-${prompt.slot}`;
          const fieldId = `journal-answer-${prompt.slot}`;
          return (
            <li key={prompt.slot}>
              <article
                className="plate rounded-realm p-6"
                data-testid="journal-prompt"
                data-slot={prompt.slot}
                data-variant={prompt.variant}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h3 className="font-mono text-[10px] uppercase tracking-[0.16em] text-gold">
                    {index + 1} · {prompt.kind} · asked by {KIND_LABEL[prompt.kind]}
                    {prompt.sourceId === undefined ? "" : `: ${prompt.sourceId}`}
                  </h3>
                  {swapped ? (
                    <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-indigo-glow">
                      swapped for a {AXIS_LABEL[axis]} question
                    </span>
                  ) : null}
                </div>

                <p id={textId} className="serif mt-3 text-xl leading-snug text-parchment">
                  {prompt.text}
                </p>

                <label htmlFor={fieldId} className="sr-only">
                  Your answer to prompt {index + 1}
                </label>
                <textarea
                  id={fieldId}
                  aria-describedby={textId}
                  data-testid="journal-answer"
                  rows={4}
                  value={answer}
                  disabled={!hasHydrated || closed}
                  onChange={(event) => write(dilemmaId, prompt.slot, event.target.value)}
                  placeholder={hasHydrated ? "Write it in one sentence. Then write the sentence you would defend twice." : "Reading your saved answers…"}
                  className="mt-4 w-full resize-y rounded-realm border border-abyss-border bg-abyss/70 px-4 py-3 text-sm leading-relaxed text-parchment placeholder:text-parchment-dim/40 focus:border-gold focus:outline-none disabled:opacity-60"
                />

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    aria-pressed={swapped}
                    aria-label={`Stuck on prompt ${index + 1}? Swap in a ${AXIS_LABEL[axis]} question`}
                    onClick={() => onStuck(prompt)}
                    data-testid="journal-stuck"
                    className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                      swapped
                        ? "border-indigo-glow bg-indigo-glow/15 text-parchment"
                        : "border-abyss-border text-parchment-dim/70 hover:border-parchment-dim hover:text-parchment"
                    }`}
                  >
                    stuck?
                  </button>

                  {swapped ? (
                    <button
                      type="button"
                      onClick={() => onRestore(prompt)}
                      className="rounded-full border border-abyss-border px-3 py-1.5 text-xs text-parchment-dim/70 transition-colors hover:border-parchment-dim hover:text-parchment"
                    >
                      put the original back
                    </button>
                  ) : null}

                  <span className="tabular font-mono text-[10px] text-parchment-dim/60">
                    {swapped
                      ? `showing ${prompt.variant} of ${reserve.length} on ${axis}`
                      : `${reserve.length} ${AXIS_LABEL[pivotAxis]} questions in reserve`}
                    {answer.trim().length > 0 && swapped ? " · your words kept" : ""}
                  </span>
                </div>
              </article>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
