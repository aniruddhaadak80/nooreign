export interface NavSection {
  href: string;
  label: string;
  /** One line explaining what the section is, used by the command palette. */
  hint: string;
  keywords: string[];
}

/**
 * The atlas is organised as a journey: where the realms are, who sits in them,
 * what the hard cases are, and how we got here. Order here is order in the header.
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    href: "/kingdoms",
    label: "Kingdoms",
    hint: "Twelve schools of thought as realms you can walk",
    keywords: ["realm", "school", "ethic", "doctrine", "terrain", "crest"],
  },
  {
    href: "/court",
    label: "Court",
    hint: "Twenty-eight advisors and their signature moves",
    keywords: ["advisor", "philosopher", "argument", "voices", "council"],
  },
  {
    href: "/council",
    label: "Council",
    hint: "Convene a court on a dilemma and read the reasoning trace",
    keywords: ["deliberate", "verdict", "trace", "ballot", "consensus"],
  },
  {
    href: "/dilemmas",
    label: "Dilemmas",
    hint: "Twenty cases where the calculus breaks down",
    keywords: ["trolley", "paperclip", "oracle", "genie", "uploads", "choice"],
  },
  {
    href: "/chronicle",
    label: "Chronicle",
    hint: "How we aligned, from Socrates to frontier reasoning",
    keywords: ["history", "timeline", "era", "asilomar", "rlhf", "milestone"],
  },
  {
    href: "/observatory",
    label: "Observatory",
    hint: "The alignment stack as towers, with what is still missing",
    keywords: ["technique", "rlhf", "interpretability", "oversight", "maturity", "gap"],
  },
  {
    href: "/experiments",
    label: "Experiments",
    hint: "Parameter sweeps over the classic thought experiments",
    keywords: ["oracle", "paperclip", "mesa", "deception", "simulation", "sweep"],
  },
  {
    href: "/codex",
    label: "Codex",
    hint: "Glossary, canon texts, and the method behind the atlas",
    keywords: ["glossary", "terms", "texts", "kant", "bentham", "definitions"],
  },
  {
    href: "/compare",
    label: "Realm by realm",
    hint: "The same dilemma before twelve separate courts, one per kingdom",
    keywords: ["compare", "split", "disagreement", "each realm", "verdicts", "unanimity"],
  },
  {
    href: "/engine",
    label: "The engine",
    hint: "What each case is about before anyone argues about it",
    keywords: ["pivot axis", "costed", "fairness", "utilon", "isolation", "shape of a case"],
  },
  {
    href: "/journal",
    label: "Journal",
    hint: "Write your own reflections against the prompts; nothing leaves your browser",
    keywords: ["reflect", "writing", "prompt", "sit", "ritual", "private", "diary"],
  },
  {
    href: "/cartographer",
    label: "Cartographer",
    hint: "The argument graph of a sitting, drawn as a directed acyclic diagram",
    keywords: ["graph", "dag", "moves", "support", "attack", "mermaid", "argument"],
  },
];

export const NAV_BY_HREF: ReadonlyMap<string, NavSection> = new Map(NAV_SECTIONS.map((s) => [s.href, s]));
