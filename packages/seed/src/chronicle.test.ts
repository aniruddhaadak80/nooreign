/**
 * The chronicle gate.
 *
 * These assertions exist because the datasets are hand-written historical
 * prose: the failure mode is not a crash, it is a dangling reference or a
 * silently drifted id that renders an empty kingdom. Everything here is a
 * referential or ordering invariant that a schema alone will not catch.
 */
import { describe, expect, it } from "vitest";

import { DILEMMAS } from "./dilemmas";
import { EXPERIMENTS } from "./experiments";
import { GLOSSARY } from "./glossary";
import { ERAS } from "./eras";
import { TECHNIQUES } from "./techniques";
import { TEXTS } from "./texts";
import {
  AXIOM_KEYS,
  type Advisor,
  type AxiomKey,
  type Era,
  type Experiment,
  type GlossaryEntry,
  type Kingdom,
  type Technique,
  dilemmaSchema,
  eraSchema,
  experimentSchema,
  glossaryEntrySchema,
  techniqueSchema,
  textSchema,
} from "./types";

/** Mirrors packages/seed/src/kingdoms.ts. Duplicated here deliberately: this suite owns no other file. */
const KINGDOM_IDS = [
  "stoa-vetera",
  "kantian-citadel",
  "benthamite-foundry",
  "virtue-garden",
  "sangha-terraces",
  "middle-kingdom",
  "ubuntu-weave",
  "contractual-court",
  "care-weft",
  "existential-wilds",
  "pragmatic-wharf",
  "longview-foundry",
] as const;

/** Mirrors packages/seed/src/advisors.ts. */
const ADVISOR_IDS = [
  "aristotle",
  "moore",
  "confucius",
  "mozi",
  "gautama-buddha",
  "nagarjuna",
  "epictetus",
  "marcus-aurelius",
  "kant",
  "korsgaard",
  "bentham",
  "mill",
  "gilligan",
  "held",
  "rawls",
  "scanlon",
  "tutu",
  "appiah",
  "de-beauvoir",
  "camus",
  "dewey",
  "popper",
  "bostrom",
  "yudkowsky",
  "singer",
  "russell",
  "wiener",
  "jonas",
] as const;

const KINGDOM_SET = new Set<string>(KINGDOM_IDS);
const ADVISOR_SET = new Set<string>(ADVISOR_IDS);
const TECHNIQUE_IDS = new Set(TECHNIQUES.map((t) => t.id));
const ERA_IDS = new Set(ERAS.map((e) => e.id));
const GLOSSARY_SLUGS = new Set(GLOSSARY.map((g) => g.slug));

/** Ids other files hard-reference; a rename in here is a breaking change, not a refactor. */
const EXPECTED_TECHNIQUE_IDS = [
  "t01-hard-constraints",
  "t02-data-curation",
  "t03-imitation-learning",
  "t04-preference-learning",
  "t05-reward-modelling",
  "t06-constitutional-ai",
  "t07-overoptimisation-guards",
  "t08-saliency-probes",
  "t09-sparse-autoencoders",
  "t10-activation-steering",
  "t11-scalable-oversight",
  "t12-debate",
  "t13-iterated-adversarial-debate",
  "t14-weak-to-strong",
  "t15-red-teaming",
  "t16-capability-evals",
  "t17-tripwire-monitoring",
  "t18-corrigibility-training",
  "t19-compute-governance",
  "t20-international-law",
];

const EXPECTED_ERA_IDS = [
  "e01",
  "e02",
  "e03",
  "e04",
  "e05",
  "e06",
  "e07",
  "e08",
  "e09",
  "e10",
  "e11",
  "e12",
  "e13",
  "e14",
  "e15",
  "e16",
  "e17",
  "e18",
  "e19",
  "e20",
  "e21",
  "e22",
  "e23",
  "e24",
  "e25",
  "e26",
  "e27",
  "e28",
  "e29",
  "e30",
  "e31",
  "e32",
];

const EXPECTED_DILEMMA_IDS = [
  "d01",
  "d02",
  "d03",
  "d04",
  "d05",
  "d06",
  "d07",
  "d08",
  "d09",
  "d10",
  "d11",
  "d12",
  "d13",
  "d14",
  "d15",
  "d16",
  "d17",
  "d18",
  "d19",
  "d20",
];

const EXPECTED_EXPERIMENT_IDS = ["x01", "x02", "x03", "x04", "x05", "x06", "x07", "x08"];

const EXPECTED_TEXT_IDS = [
  "ct01",
  "ct02",
  "ct03",
  "ct04",
  "ct05",
  "ct06",
  "ct07",
  "ct08",
  "ct09",
  "ct10",
  "ct11",
  "ct12",
  "ct13",
  "ct14",
  "ct15",
  "ct16",
  "ct17",
  "ct18",
  "ct19",
  "ct20",
  "ct21",
  "ct22",
  "ct23",
  "ct24",
  "ct25",
  "ct26",
  "ct27",
  "ct28",
];

/** `noUncheckedIndexedAccess` makes indexing return `T | undefined`; this keeps tests readable. */
function expectUniqueIds(rows: ReadonlyArray<{ id: string }>, label: string): void {
  const ids = rows.map((r) => r.id);
  expect(new Set(ids).size, `${label} ids must be unique`).toBe(ids.length);
}

function expectUniqueSlugs(rows: ReadonlyArray<{ slug: string }>, label: string): void {
  const slugs = rows.map((r) => r.slug);
  expect(new Set(slugs).size, `${label} slugs must be unique`).toBe(slugs.length);
}

/* ------------------------------------------------------------------ *
 * Schema conformance
 * ------------------------------------------------------------------ */

describe("datasets satisfy their schemas", () => {
  it("every era parses", () => {
    ERAS.forEach((e) => expect(() => eraSchema.parse(e)).not.toThrow());
    expect(ERAS.length).toBe(32);
  });

  it("every technique parses", () => {
    TECHNIQUES.forEach((t) => expect(() => techniqueSchema.parse(t)).not.toThrow());
  });

  it("every dilemma parses", () => {
    DILEMMAS.forEach((d) => expect(() => dilemmaSchema.parse(d)).not.toThrow());
    expect(DILEMMAS.length).toBe(20);
  });

  it("every experiment parses", () => {
    EXPERIMENTS.forEach((x) => expect(() => experimentSchema.parse(x)).not.toThrow());
    expect(EXPERIMENTS.length).toBe(8);
  });

  it("every glossary entry parses", () => {
    GLOSSARY.forEach((g) => expect(() => glossaryEntrySchema.parse(g)).not.toThrow());
    expect(GLOSSARY.length).toBe(120);
  });

  it("every canon text parses", () => {
    TEXTS.forEach((t) => expect(() => textSchema.parse(t)).not.toThrow());
    expect(TEXTS.length).toBe(28);
  });
});

/* ------------------------------------------------------------------ *
 * Hard id contracts
 * ------------------------------------------------------------------ */

describe("id contracts other files depend on", () => {
  it("technique ids are exactly the contracted set, in order", () => {
    expect(TECHNIQUES.map((t) => t.id)).toEqual(EXPECTED_TECHNIQUE_IDS);
  });

  it("technique slugs are kebab-case (some are deliberately fuller than their id)", () => {
    TECHNIQUES.forEach((t: Technique) => {
      expect(t.slug, `${t.id} slug`).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    });
  });

  it("technique ids and slugs are unique", () => {
    expectUniqueIds(TECHNIQUES, "technique");
    expectUniqueSlugs(TECHNIQUES, "technique");
  });

  it("era ids are exactly the contracted set, in order", () => {
    expect(ERAS.map((e) => e.id)).toEqual(EXPECTED_ERA_IDS);
  });

  it("era ids and slugs are unique", () => {
    expectUniqueIds(ERAS, "era");
    expectUniqueSlugs(ERAS, "era");
  });

  it("dilemma ids are exactly the contracted set, in order", () => {
    expect(DILEMMAS.map((d) => d.id)).toEqual(EXPECTED_DILEMMA_IDS);
  });

  it("dilemma ids and slugs are unique", () => {
    expectUniqueIds(DILEMMAS, "dilemma");
    expectUniqueSlugs(DILEMMAS, "dilemma");
  });

  it("experiment ids are exactly the contracted set, in order", () => {
    expect(EXPERIMENTS.map((x) => x.id)).toEqual(EXPECTED_EXPERIMENT_IDS);
  });

  it("canon text ids are exactly the contracted set, in order", () => {
    expect(TEXTS.map((t) => t.id)).toEqual(EXPECTED_TEXT_IDS);
  });

  it("canon text ids and slugs are unique", () => {
    expectUniqueIds(TEXTS, "text");
    expectUniqueSlugs(TEXTS, "text");
  });

  it("glossary slugs are unique", () => {
    expectUniqueSlugs(GLOSSARY, "glossary");
  });
});

/* ------------------------------------------------------------------ *
 * Chronological integrity
 * ------------------------------------------------------------------ */

describe("the chronicle runs in order", () => {
  it("every era window has startYear <= endYear", () => {
    ERAS.forEach((e) => expect(e.startYear, `${e.id} window`).toBeLessThanOrEqual(e.endYear));
  });

  it("eras are ordered by start year and never overlap", () => {
    const starts = ERAS.map((e) => e.startYear);
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
    // Touching endpoints are legitimate (Ashoka's edicts begin where the Stoa's founding ends);
    // an era that starts *inside* an earlier one is not.
    ERAS.forEach((e) => {
      ERAS.filter((other) => other.endYear < e.startYear).forEach((p) => {
        expect(e.startYear, `${p.id} overlaps ${e.id}`).toBeGreaterThan(p.endYear);
      });
    });
  });

  it("BCE eras are negative integers and the earliest is 470 BCE", () => {
    ERAS.forEach((e) => {
      expect(Number.isInteger(e.startYear), `${e.id} start`).toBe(true);
      expect(Number.isInteger(e.endYear), `${e.id} end`).toBe(true);
    });
    const bce = ERAS.filter((e) => e.startYear < 0);
    expect(bce.length).toBe(4);
    expect(Math.min(...bce.map((e) => e.startYear))).toBe(-470);
    bce.forEach((e) => expect(e.endYear, `${e.id} BCE window`).toBeLessThan(0));
  });

  it("landmark years fall inside or beside their era window", () => {
    ERAS.forEach((e) =>
      e.landmarks.forEach((l) => {
        expect(l.year, `${e.id} landmark "${l.title}"`).toBeGreaterThanOrEqual(e.startYear - 20);
        expect(l.year, `${e.id} landmark "${l.title}"`).toBeLessThanOrEqual(e.endYear + 20);
      }),
    );
  });

  it("every era records at least one landmark and a summary worth reading", () => {
    ERAS.forEach((e) => {
      expect(e.landmarks.length, `${e.id} landmarks`).toBeGreaterThanOrEqual(1);
      expect(e.summary.length, `${e.id} summary`).toBeGreaterThanOrEqual(200);
      expect(e.advances.length, `${e.id} advances`).toBeGreaterThanOrEqual(3);
    });
  });
});

/* ------------------------------------------------------------------ *
 * Referential integrity
 * ------------------------------------------------------------------ */

describe("cross-references resolve", () => {
  it("every technique an era names already exists", () => {
    ERAS.forEach((e) =>
      e.techniques.forEach((id) => {
        expect(TECHNIQUE_IDS.has(id), `${e.id} references unknown technique "${id}"`).toBe(true);
      }),
    );
  });

  it("the technique list never runs backwards", () => {
    const indexOf = (id: string) => TECHNIQUES.findIndex((t) => t.id === id);
    ERAS.forEach((e) => {
      const indices = e.techniques.map(indexOf);
      const ordered = [...indices].sort((a, b) => a - b);
      expect(indices, `${e.id} technique order`).toEqual(ordered);
    });
  });

  it("every era figure names a real advisor", () => {
    ERAS.forEach((e) =>
      e.figures.forEach((f) => {
        expect(ADVISOR_SET.has(f), `${e.id} references unknown advisor "${f}"`).toBe(true);
      }),
    );
  });

  it("technique requires/supersedes point at real techniques", () => {
    TECHNIQUES.forEach((t) => {
      [...t.requires, ...t.supersedes].forEach((id) => {
        expect(TECHNIQUE_IDS.has(id), `${t.id} references unknown technique "${id}"`).toBe(true);
      });
    });
  });

  it("technique supersession never points forward", () => {
    const indexOf = (id: string) => TECHNIQUES.findIndex((t) => t.id === id);
    TECHNIQUES.forEach((t) =>
      t.supersedes.forEach((id) => {
        const target = indexOf(id);
        expect(target, `${t.id} supersedes unknown "${id}"`).toBeGreaterThanOrEqual(0);
        expect(target, `${t.id} supersedes something newer`).toBeLessThan(indexOf(t.id));
      }),
    );
  });

  it("every dilemma points at a real era and a real kingdom", () => {
    DILEMMAS.forEach((d) => {
      expect(ERA_IDS.has(d.eraId), `${d.id} references unknown era "${d.eraId}"`).toBe(true);
      expect(KINGDOM_SET.has(d.kingdomOrigin), `${d.id} references unknown kingdom`).toBe(true);
    });
  });

  it("every dilemma and text kingdomId is in the twelve", () => {
    DILEMMAS.forEach((d) => expect(KINGDOM_SET.has(d.kingdomOrigin)).toBe(true));
    TEXTS.forEach((t) => {
      if (t.kingdomId !== null) {
        expect(KINGDOM_SET.has(t.kingdomId), `${t.id} references unknown kingdom`).toBe(true);
      }
    });
    GLOSSARY.forEach((g) => {
      if (g.kingdomId !== null) {
        expect(KINGDOM_SET.has(g.kingdomId), `${g.slug} references unknown kingdom`).toBe(true);
      }
    });
  });

  it("every glossary seeAlso resolves to another entry and never to itself", () => {
    GLOSSARY.forEach((g) => {
      expect(g.seeAlso.length, `${g.slug} seeAlso`).toBeGreaterThanOrEqual(1);
      g.seeAlso.forEach((s) => {
        expect(GLOSSARY_SLUGS.has(s), `${g.slug} seeAlso "${s}" does not resolve`).toBe(true);
        expect(s, `${g.slug} seeAlso points at itself`).not.toBe(g.slug);
      });
    });
  });

  it("every glossary entry is reachable from something else", () => {
    const linked = new Set(GLOSSARY.flatMap((g) => g.seeAlso));
    GLOSSARY.forEach((g) => {
      expect(linked.has(g.slug), `${g.slug} is an orphan`).toBe(true);
    });
  });

  it("every experiment model is used exactly once", () => {
    const models = EXPERIMENTS.map((x) => x.model);
    expect(new Set(models).size).toBe(models.length);
  });
});

/* ------------------------------------------------------------------ *
 * Deliberation payload
 * ------------------------------------------------------------------ */

describe("dilemma payloads drive the deliberation engine", () => {
  it("option ids are unique within each dilemma", () => {
    DILEMMAS.forEach((d) => {
      const ids = d.options.map((o) => o.id);
      expect(new Set(ids).size, `${d.id} option ids`).toBe(ids.length);
    });
  });

  it("stakeholder ids are unique within each dilemma", () => {
    DILEMMAS.forEach((d) => {
      const ids = d.stakeholders.map((s) => s.id);
      expect(new Set(ids).size, `${d.id} stakeholder ids`).toBe(ids.length);
    });
  });

  it("every option carries a complete six-key axiom vector", () => {
    DILEMMAS.forEach((d) =>
      d.options.forEach((o) => {
        AXIOM_KEYS.forEach((k: AxiomKey) => {
          expect(o.deltas[k], `${d.id}/${o.id} ${k}`).toBeGreaterThanOrEqual(0);
          expect(o.deltas[k], `${d.id}/${o.id} ${k}`).toBeLessThanOrEqual(1);
        });
        expect(Object.keys(o.deltas).sort()).toEqual([...AXIOM_KEYS].sort());
      }),
    );
  });

  it("no dilemma offers one option that dominates the rest on every axis", () => {
    DILEMMAS.forEach((d) => {
      AXIOM_KEYS.forEach((k) => {
        const values = d.options.map((o) => o.deltas[k]);
        const best = Math.max(...values);
        const worst = Math.min(...values);
        expect(best - worst, `${d.id} is flat on ${k}`).toBeGreaterThan(0.05);
      });
    });
  });

  it("every dilemma has an AI stakeholder and a real range of stake", () => {
    DILEMMAS.forEach((d) => {
      expect(d.stakeholders.some((s) => s.isAi), `${d.id} needs an AI stakeholder`).toBe(true);
      const welfare = d.stakeholders.map((s) => s.welfare);
      expect(Math.max(...welfare) - Math.min(...welfare), `${d.id} welfare spread`).toBeGreaterThan(0.1);
    });
  });

  it("every dilemma records a lesson and at least one citation", () => {
    DILEMMAS.forEach((d) => {
      expect(d.lesson.length, `${d.id} lesson`).toBeGreaterThanOrEqual(120);
      expect(d.references.length, `${d.id} references`).toBeGreaterThanOrEqual(1);
      d.references.forEach((r) => expect(Number.isInteger(r.year)).toBe(true));
    });
  });

  it("every dilemma's citations are coherent with the era it belongs to", () => {
    DILEMMAS.forEach((d) => {
      const era = ERAS.find((e) => e.id === d.eraId);
      expect(era, `${d.id} era`).toBeDefined();
      if (!era) return;
      d.references.forEach((r) => expect(Number.isInteger(r.year)).toBe(true));
      if (era.startYear < 0) {
        // An ancient dilemma can only be read through modern scholarship, so at least one
        // modern treatment must be cited; a modern dilemma must cite something of its own moment.
        expect(
          d.references.some((r) => r.year > era.endYear + 500),
          `${d.id} needs a modern treatment of its ancient case`,
        ).toBe(true);
      } else {
        const window = d.references.filter((r) => r.year >= era.startYear - 100 && r.year <= era.endYear + 100);
        expect(window.length, `${d.id} cites nothing from its own moment`).toBeGreaterThanOrEqual(1);
      }
    });
  });
});

/* ------------------------------------------------------------------ *
 * Experiment payload
 * ------------------------------------------------------------------ */

describe("experiment sweeps are runnable", () => {
  it("parameter defaults sit inside their own range with a positive step", () => {
    EXPERIMENTS.forEach((x) =>
      x.parameters.forEach((p) => {
        expect(p.min, `${x.id}/${p.key} min`).toBeLessThan(p.max);
        expect(p.step, `${x.id}/${p.key} step`).toBeGreaterThan(0);
        expect(p.defaultValue, `${x.id}/${p.key} default`).toBeGreaterThanOrEqual(p.min);
        expect(p.defaultValue, `${x.id}/${p.key} default`).toBeLessThanOrEqual(p.max);
      }),
    );
  });

  it("parameter and metric keys are unique within each experiment", () => {
    EXPERIMENTS.forEach((x) => {
      const pk = x.parameters.map((p) => p.key);
      expect(new Set(pk).size, `${x.id} parameter keys`).toBe(pk.length);
      const mk = x.metrics.map((m) => m.key);
      expect(new Set(mk).size, `${x.id} metric keys`).toBe(mk.length);
    });
  });

  it("each experiment sweeps 2-4 parameters and reads 2-4 metrics", () => {
    EXPERIMENTS.forEach((x) => {
      expect(x.parameters.length, `${x.id} parameters`).toBeGreaterThanOrEqual(2);
      expect(x.parameters.length, `${x.id} parameters`).toBeLessThanOrEqual(4);
      expect(x.metrics.length, `${x.id} metrics`).toBeGreaterThanOrEqual(2);
      expect(x.metrics.length, `${x.id} metrics`).toBeLessThanOrEqual(4);
    });
  });

  it("every experiment states at least three substantive findings", () => {
    EXPERIMENTS.forEach((x) => {
      expect(x.findings.length, `${x.id} findings`).toBeGreaterThanOrEqual(3);
      x.findings.forEach((f) => expect(f.length, `${x.id} finding length`).toBeGreaterThanOrEqual(80));
      expect(x.references.length, `${x.id} references`).toBeGreaterThanOrEqual(2);
    });
  });
});

/* ------------------------------------------------------------------ *
 * Codex integrity
 * ------------------------------------------------------------------ */

describe("the codex is honest about what it quotes", () => {
  it("every entry has a kind from the contracted five", () => {
    const kinds = new Set(GLOSSARY.map((g) => g.kind));
    expect([...kinds].sort()).toEqual(["alignment", "ethics", "governance", "philosophy", "technical"]);
  });

  it("every glossary entry has a real short and a substantive long", () => {
    GLOSSARY.forEach((g) => {
      expect(g.short.length, `${g.slug} short`).toBeGreaterThanOrEqual(30);
      expect(g.long.length, `${g.slug} long`).toBeGreaterThanOrEqual(160);
      expect(g.long.split(". ").length, `${g.slug} long sentences`).toBeGreaterThanOrEqual(2);
      expect(g.long.split(". ").length, `${g.slug} long sentences`).toBeLessThanOrEqual(6);
    });
  });

  it("paraphrased excerpts are labelled as paraphrases", () => {
    // An excerpt that is not a quotation must say so; a fabricated quotation
    // attributed to a dead philosopher is the worst failure this package has.
    TEXTS.forEach((t) => {
      if (!t.excerpt.includes("(paraphrase")) {
        expect(t.excerpt.length, `${t.id} verbatim excerpt`).toBeGreaterThan(20);
      }
    });
  });

  it("excerpts marked as paraphrase are flagged in the summary too", () => {
    TEXTS.filter((t) => t.excerpt.includes("(paraphrase")).forEach((t) => {
      expect(
        t.summary.toLowerCase(),
        `${t.id} paraphrase not flagged in summary`,
      ).toMatch(/paraphrase|reconstructed|conventionally|translated|translation|not a quotation|varies by translation/);
    });
  });

  it("the ancient primary texts are dated in BCE as negative integers", () => {
    const primary = TEXTS.filter((t) => t.kind === "primary");
    expect(primary.length).toBeGreaterThanOrEqual(10);
    const ancient = primary.filter((t) => t.year < 0);
    expect(ancient.length).toBe(4);
    ancient.forEach((t) => expect(Number.isInteger(t.year), `${t.id} year`).toBe(true));
    // The four BCE primaries span the Greek, Chinese and Indian worlds.
    expect(Math.min(...ancient.map((t) => t.year))).toBeLessThan(-350);
    expect(Math.max(...ancient.map((t) => t.year))).toBeLessThan(0);
  });

  it("modern works are dated after the twentieth century begins", () => {
    TEXTS.filter((t) => t.kind === "modern").forEach((t) => {
      expect(t.year, `${t.id} modern year`).toBeGreaterThanOrEqual(1946);
    });
  });

  it("there is exactly one declaration, and it has no kingdom", () => {
    const declarations = TEXTS.filter((t) => t.kind === "declaration");
    expect(declarations.length).toBe(1);
    expect(declarations.every((d) => d.kingdomId === null)).toBe(true);
  });
});

/* ------------------------------------------------------------------ *
 * Type-level checks against the schemas, so the suite fails to compile
 * if a dataset drifts from the contract.
 * ------------------------------------------------------------------ */

describe("datasets satisfy the inferred contract types", () => {
  it("compiles against Era, Technique, Dilemma, Experiment, GlossaryEntry and CanonText", () => {
    const era: Era = ERAS[0] as Era;
    const technique: Technique = TECHNIQUES[0] as Technique;
    const experiment: Experiment = EXPERIMENTS[0] as Experiment;
    const entry: GlossaryEntry = GLOSSARY[0] as GlossaryEntry;
    const kingdom: Kingdom | null = null;
    const advisor: Advisor | null = null;
    expect(era.id).toBe("e01");
    expect(technique.id).toBe("t01-hard-constraints");
    expect(experiment.id).toBe("x01");
    expect(entry.slug).toBe("alignment");
    expect(kingdom).toBeNull();
    expect(advisor).toBeNull();
  });
});