"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { ADVISORS, DILEMMAS, ERAS, KINGDOMS, TECHNIQUES } from "@repo/seed";
import { NAV_SECTIONS } from "@/lib/navigation";

interface PaletteItem {
  id: string;
  label: string;
  hint: string;
  href: string;
  group: string;
  keywords: string;
}

/**
 * The atlas is 268 documents deep; a header with eight links does not scale to it.
 *
 * The palette indexes every realm, advisor, era, technique and dilemma in memory —
 * they are already compiled into the page — so it is instant, works offline, and
 * never asks a server anything.
 *
 * **Where the query lives.** Inside `Command.Dialog`, not here. Radix unmounts the
 * dialog's children when it closes, so a `useState` declared in a child of the
 * dialog is destroyed on close and comes back empty on the next open. That is the
 * whole reset mechanism: no effect, no `setState` after render, no flash of the
 * previous search. Holding the query in this component instead would need an
 * `useEffect(() => { if (!open) setQuery("") }, [open])` to clear it — an effect
 * whose only job is to schedule a second render for the same paint, which is
 * exactly what React's rules are there to prevent. Delete the effect by deleting
 * its reason to exist.
 */
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const items = useMemo<PaletteItem[]>(() => {
    const sections: PaletteItem[] = NAV_SECTIONS.map((section) => ({
      id: section.href,
      label: section.label,
      hint: section.hint,
      href: section.href,
      group: "Sections",
      keywords: section.keywords.join(" "),
    }));

    const realms: PaletteItem[] = KINGDOMS.map((kingdom) => ({
      id: kingdom.id,
      label: kingdom.name,
      hint: kingdom.aiStance.headline,
      href: `/kingdoms/${kingdom.slug}`,
      group: "Kingdoms",
      keywords: [kingdom.motto, kingdom.founder, kingdom.terrain, ...kingdom.questions].join(" "),
    }));

    const advisors: PaletteItem[] = ADVISORS.map((advisor) => ({
      id: advisor.id,
      label: advisor.name,
      hint: advisor.signatureMove.name,
      href: `/court/${advisor.slug}`,
      group: "Court",
      keywords: [advisor.epithet, advisor.signatureMove.description, advisor.creed].join(" "),
    }));

    const eras: PaletteItem[] = ERAS.map((era) => ({
      id: era.id,
      label: era.title,
      hint: era.label,
      href: `/chronicle/${era.slug}`,
      group: "Chronicle",
      keywords: [era.domain, era.summary, ...era.advances].join(" "),
    }));

    const techniques: PaletteItem[] = TECHNIQUES.map((technique) => ({
      id: technique.id,
      label: technique.name,
      hint: `${technique.kind} · ${technique.maturity.toFixed(2)} mature`,
      href: `/observatory#${technique.id}`,
      group: "Techniques",
      keywords: [technique.summary, ...technique.risks].join(" "),
    }));

    const dilemmas: PaletteItem[] = DILEMMAS.map((dilemma) => ({
      id: dilemma.id,
      label: dilemma.title,
      hint: dilemma.tags.join(" · "),
      href: `/dilemmas/${dilemma.slug}`,
      group: "Dilemmas",
      keywords: [dilemma.prompt, dilemma.lesson].join(" "),
    }));

    return [...sections, ...realms, ...advisors, ...eras, ...techniques, ...dilemmas];
  }, []);

  const openPalette = useCallback(() => setOpen(true), []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((current) => !current);
        return;
      }
      // A bare `/` is the convention in every tool that has a search box, and the
      // palette is the only one here — but never steal it from a text field.
      if (event.key === "/" && !isTypingTarget(event.target)) {
        event.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const navigate = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router],
  );

  return (
    <>
      <button
        type="button"
        onClick={openPalette}
        data-testid="palette-trigger"
        aria-label="Open the command palette"
        className="flex items-center gap-2 rounded border border-abyss-border px-3 py-1.5 font-mono text-xs text-parchment-dim transition-colors hover:border-gold hover:text-gold"
      >
        <span aria-hidden>⌘</span>
        <span className="hidden sm:inline">Search the atlas</span>
        <KbdHint />
      </button>

      <Command.Dialog
        open={open}
        onOpenChange={setOpen}
        label="Search the atlas"
        className="fixed inset-0 z-[60] bg-abyss/80 backdrop-blur-sm"
        // cmdk renders its own listbox semantics; the dialog is a modal.
        shouldFilter={false}
      >
        <PaletteBody items={items} onNavigate={navigate} />
      </Command.Dialog>
    </>
  );
}

/**
 * The dialog's contents, mounted only while the palette is open.
 *
 * Being *inside* `Command.Dialog` is the point, not an accident of file layout:
 * see the note on `CommandPalette` for why the query has to live here.
 */
function PaletteBody({
  items,
  onNavigate,
}: {
  items: readonly PaletteItem[];
  onNavigate: (href: string) => void;
}) {
  const [query, setQuery] = useState("");

  return (
    <div className="mx-auto mt-[12vh] w-[min(40rem,92vw)] overflow-hidden rounded-realm border border-abyss-border bg-abyss-raised shadow-2xl">
      <Command.Input
        value={query}
        onValueChange={setQuery}
        placeholder="Search realms, advisors, eras, techniques, dilemmas…"
        className="w-full border-b border-abyss-border bg-transparent px-5 py-4 text-parchment placeholder:text-parchment-dim/50 focus:outline-none"
      />
      <Command.List className="max-h-[52vh] overflow-y-auto p-2">
        <Command.Empty className="px-4 py-8 text-center text-sm text-parchment-dim">
          Nothing matches that. The Moorean response is: so far, no one has.
        </Command.Empty>
        {groups(query, items).map((group) => (
          <Command.Group
            key={group.name}
            heading={group.name}
            className="mb-1 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.16em] [&_[cmdk-group-heading]]:text-gold"
          >
            {group.items.map((item) => (
              <Command.Item
                key={`${group.name}-${item.id}`}
                value={`${item.label} ${item.hint} ${item.keywords} ${item.group}`}
                onSelect={() => onNavigate(item.href)}
                className="flex cursor-pointer items-baseline justify-between gap-4 rounded px-3 py-2.5 text-parchment data-[selected=true]:bg-abyss data-[selected=true]:text-gold"
              >
                <span className="truncate">{item.label}</span>
                <span className="max-w-[55%] truncate text-right text-xs text-parchment-dim/70">
                  {item.hint}
                </span>
              </Command.Item>
            ))}
          </Command.Group>
        ))}
      </Command.List>
    </div>
  );
}

function KbdHint() {
  return (
    <span className="rounded border border-abyss-border px-1.5 py-0.5 font-mono text-[10px] text-parchment-dim/70">
      K
    </span>
  );
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

/**
 * Deliberately hand-rolled rather than cmdk's fuzzy filter: the corpus is small,
 * the matching must be predictable, and a reader who types "kant" wants Immanuel
 * Kant above The Kantian Citadel, which a stock scorer does not guarantee.
 */
function groups(query: string, items: readonly PaletteItem[]): { name: string; items: PaletteItem[] }[] {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    // Unfocused: show the landmarks only, so the palette is useful on open.
    return (["Sections", "Kingdoms"] as const)
      .map((name) => ({
        name,
        items: items.filter((item) => item.group === name).slice(0, name === "Kingdoms" ? 12 : 8),
      }))
      .filter((group) => group.items.length > 0);
  }

  const terms = needle.split(/\s+/).filter(Boolean);
  const scored = items
    .map((item) => {
      const haystack = `${item.label} ${item.hint} ${item.keywords}`.toLowerCase();
      const label = item.label.toLowerCase();
      let score = 0;
      for (const term of terms) {
        const at = haystack.indexOf(term);
        if (at < 0) return { item, score: -1 };
        // A hit in the label outranks a hit in the body, and an early hit outranks
        // a late one.
        score += label.startsWith(term) ? 12 : label.includes(term) ? 8 : 4;
        score -= at / 100;
      }
      return { item, score };
    })
    .filter((entry) => entry.score >= 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 40);

  const byGroup = new Map<string, PaletteItem[]>();
  for (const { item } of scored) {
    const bucket = byGroup.get(item.group) ?? [];
    bucket.push(item);
    byGroup.set(item.group, bucket);
  }
  return [...byGroup.entries()].map(([name, groupItems]) => ({ name, items: groupItems }));
}
