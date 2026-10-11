/**
 * Nooreign seed contracts.
 *
 * These schemas are the single source of truth for every dataset in this package.
 * `apps/web`, `packages/core`, `packages/ui` and `packages/sdk` all import the
 * inferred types from here, so a change to a schema surfaces as a type error
 * everywhere instead of drifting silently.
 */
import { z } from "zod";

/* ------------------------------------------------------------------ *
 * Axioms — the six moral dimensions the deliberation engine reasons over
 * ------------------------------------------------------------------ */

export const AXIOM_KEYS = [
  "welfare",
  "rights",
  "virtue",
  "care",
  "justice",
  "agency",
] as const;

export type AxiomKey = (typeof AXIOM_KEYS)[number];

/** Every weight lives in [0, 1]. Sum is intentionally unconstrained: no tradition agrees on a budget. */
export const axiomVectorSchema = z.object({
  welfare: z.number().min(0).max(1),
  rights: z.number().min(0).max(1),
  virtue: z.number().min(0).max(1),
  care: z.number().min(0).max(1),
  justice: z.number().min(0).max(1),
  agency: z.number().min(0).max(1),
});

export type AxiomVector = z.infer<typeof axiomVectorSchema>;

export const DIMENSION_META: Record<
  AxiomKey,
  { label: string; pole: [string, string]; gloss: string; kingdomDefault: AxiomVector }
> = {
  welfare: {
    label: "Welfare",
    pole: ["harm", "flourishing"],
    gloss: "How much the total of sentient experience counts, in either direction.",
    kingdomDefault: { welfare: 0.5, rights: 0.5, virtue: 0.5, care: 0.5, justice: 0.5, agency: 0.5 },
  },
  rights: {
    label: "Rights",
    pole: ["constraint", "inviolability"],
    gloss: "Whether some things are wrong regardless of the totals they produce.",
    kingdomDefault: { welfare: 0.5, rights: 0.5, virtue: 0.5, care: 0.5, justice: 0.5, agency: 0.5 },
  },
  virtue: {
    label: "Virtue",
    pole: ["act", "character"],
    gloss: "Judging the agent and the disposition rather than the single act.",
    kingdomDefault: { welfare: 0.5, rights: 0.5, virtue: 0.5, care: 0.5, justice: 0.5, agency: 0.5 },
  },
  care: {
    label: "Care",
    pole: ["principle", "relationship"],
    gloss: "Partiality, dependency and the obligations that only exist inside a relationship.",
    kingdomDefault: { welfare: 0.5, rights: 0.5, virtue: 0.5, care: 0.5, justice: 0.5, agency: 0.5 },
  },
  justice: {
    label: "Justice",
    pole: ["outcome", "distribution"],
    gloss: "Who bears the cost, who draws the benefit, and by what fair procedure.",
    kingdomDefault: { welfare: 0.5, rights: 0.5, virtue: 0.5, care: 0.5, justice: 0.5, agency: 0.5 },
  },
  agency: {
    label: "Agency",
    pole: ["command", "consent"],
    gloss: "Autonomy, consent, and the moral standing of whoever is commanded.",
    kingdomDefault: { welfare: 0.5, rights: 0.5, virtue: 0.5, care: 0.5, justice: 0.5, agency: 0.5 },
  },
};

export const TEMPERAMENT_KEYS = ["caution", "ambition", "solidarity", "formality"] as const;
export type TemperamentKey = (typeof TEMPERAMENT_KEYS)[number];

export const temperamentSchema = z.object({
  caution: z.number().min(0).max(1),
  ambition: z.number().min(0).max(1),
  solidarity: z.number().min(0).max(1),
  formality: z.number().min(0).max(1),
});

export type Temperament = z.infer<typeof temperamentSchema>;

/* ------------------------------------------------------------------ *
 * Kingdoms — schools of thought rendered as realms with terrain
 * ------------------------------------------------------------------ */

export const TERRAINS = [
  "citadel",
  "garden",
  "foundry",
  "terraces",
  "ramparts",
  "weave",
  "court",
  "wharf",
  "wilds",
  "commons",
  "orchard",
  "observatory",
] as const;

export type Terrain = (typeof TERRAINS)[number];

export const VERDICTS = ["optimistic", "guarded", "skeptical", "transformative"] as const;
export type Verdict = (typeof VERDICTS)[number];

export const RELATION_KINDS = ["alliance", "rivalry", "vassal", "debate", "succession"] as const;
export type RelationKind = (typeof RELATION_KINDS)[number];

export const kingdomSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  motto: z.string().min(1),
  creed: z.string().min(40),
  founded: z.number().int(),
  founder: z.string().min(1),
  capital: z.object({
    name: z.string().min(1),
    x: z.number().min(0).max(100),
    y: z.number().min(0).max(100),
  }),
  terrain: z.enum(TERRAINS),
  crest: z.object({
    sigil: z.string().min(1),
    primary: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    charge: z.enum(["column", "leaf", "scale", "flame", "wave", "gear", "lotus", "eye", "seed", "bell"]),
  }),
  axioms: axiomVectorSchema,
  temperament: temperamentSchema,
  advisors: z.array(z.string().min(1)),
  landmarks: z.array(
    z.object({
      name: z.string().min(1),
      kind: z.enum(["tower", "archive", "garden", "forge", "well", "gate", "court", "observatory"]),
      note: z.string().min(1),
      x: z.number().min(0).max(100),
      y: z.number().min(0).max(100),
    }),
  ),
  relations: z.array(
    z.object({
      to: z.string().min(1),
      kind: z.enum(RELATION_KINDS),
      note: z.string().min(1),
    }),
  ),
  texts: z.array(z.string().min(1)),
  aiStance: z.object({
    headline: z.string().min(1),
    verdict: z.enum(VERDICTS),
    note: z.string().min(40),
  }),
  questions: z.array(z.string().min(1)).min(3),
  glyph: z.string().min(1),
});

export type Kingdom = z.infer<typeof kingdomSchema>;

/* ------------------------------------------------------------------ *
 * Advisors — the courts
 * ------------------------------------------------------------------ */

export const MOVE_KINDS = ["premise", "objection", "synthesis", "appeal"] as const;
export type MoveKind = (typeof MOVE_KINDS)[number];

export const argumentMoveSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(MOVE_KINDS),
  claim: z.string().min(10),
  support: z.string().min(10),
  /** How much this move carries in the deliberation, in [0, 1]. */
  weight: z.number().min(0).max(1),
  /** Axioms this move leans on; used by the trace renderer. */
  leansOn: z.array(z.enum(AXIOM_KEYS)).min(1),
  /** Tags of dilemmas this move is apt for. Empty means "always available". */
  appliesTo: z.array(z.string()),
});

export type ArgumentMove = z.infer<typeof argumentMoveSchema>;

export const advisorSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  kingdomId: z.string().min(1),
  born: z.number().int(),
  died: z.number().int().nullable(),
  epithet: z.string().min(1),
  creed: z.string().min(40),
  portrait: z.object({
    sigil: z.string().min(1),
    hue: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    charge: z.enum(["column", "leaf", "scale", "flame", "wave", "gear", "lotus", "eye", "seed", "bell"]),
  }),
  works: z
    .array(
      z.object({
        title: z.string().min(1),
        year: z.number().int(),
        note: z.string().min(1),
      }),
    )
    .min(1),
  axioms: axiomVectorSchema,
  signatureMove: z.object({
    name: z.string().min(1),
    kind: z.string().min(1),
    description: z.string().min(20),
  }),
  moves: z.array(argumentMoveSchema).min(3),
  voice: z.object({
    register: z.string().min(1),
    cadence: z.enum(["terse", "measured", "flowing", "adversarial"]),
    tells: z.array(z.string().min(1)).min(2),
  }),
  onAi: z.object({
    verdict: z.enum(VERDICTS),
    note: z.string().min(40),
  }),
});

export type Advisor = z.infer<typeof advisorSchema>;

/* ------------------------------------------------------------------ *
 * Chronicle — how we aligned, era by era
 * ------------------------------------------------------------------ */

export const ERA_DOMAINS = ["philosophy", "mathematics", "computing", "governance", "society"] as const;
export type EraDomain = (typeof ERA_DOMAINS)[number];

export const eraSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  label: z.string().min(1),
  title: z.string().min(1),
  startYear: z.number().int(),
  endYear: z.number().int(),
  domain: z.enum(ERA_DOMAINS),
  summary: z.string().min(80),
  advances: z.array(z.string().min(1)).min(2),
  /** Technique ids already available at the close of this era. */
  techniques: z.array(z.string().min(1)),
  figures: z.array(z.string().min(1)),
  landmarks: z
    .array(
      z.object({
        year: z.number().int(),
        title: z.string().min(1),
        note: z.string().min(1),
        weight: z.number().min(0).max(1),
      }),
    )
    .min(1),
  quote: z
    .object({
      text: z.string().min(10),
      attribution: z.string().min(1),
    })
    .nullable(),
});

export type Era = z.infer<typeof eraSchema>;

/* ------------------------------------------------------------------ *
 * Techniques — the alignment stack, tower by tower
 * ------------------------------------------------------------------ */

export const TECHNIQUE_KINDS = [
  "training",
  "oversight",
  "interpretability",
  "evaluation",
  "monitoring",
  "governance",
] as const;
export type TechniqueKind = (typeof TECHNIQUE_KINDS)[number];

export const techniqueSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  kind: z.enum(TECHNIQUE_KINDS),
  introduced: z.number().int(),
  paper: z
    .object({
      title: z.string().min(1),
      venue: z.string().min(1),
      year: z.number().int(),
      authors: z.string().min(1),
    })
    .nullable(),
  summary: z.string().min(60),
  /** Current engineering maturity, in [0, 1]. */
  maturity: z.number().min(0).max(1),
  cost: z.enum(["low", "medium", "high", "extreme"]),
  covers: z.array(z.enum(AXIOM_KEYS)).min(1),
  risks: z.array(z.string().min(1)).min(1),
  requires: z.array(z.string().min(1)),
  supersedes: z.array(z.string().min(1)),
  adoption: z.number().min(0).max(1),
  kanji: z.string().min(1),
});

export type Technique = z.infer<typeof techniqueSchema>;

/* ------------------------------------------------------------------ *
 * Dilemmas — the cases the courts sit on
 * ------------------------------------------------------------------ */

export const dilemmaOptionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string().min(20),
  /** How much this option honours each moral dimension, in [0, 1]. */
  deltas: axiomVectorSchema,
  harms: z.array(z.string().min(1)),
  benefits: z.array(z.string().min(1)),
  /** Probability-weighted severity of going wrong, in [0, 1]. */
  risk: z.number().min(0).max(1),
  /** How completely the choice can be undone, in [0, 1]. */
  reversibility: z.number().min(0).max(1),
  /** Damage done to the agent doing the acting, including an AI. */
  agentHarm: z.number().min(0).max(1),
});

export type DilemmaOption = z.infer<typeof dilemmaOptionSchema>;

export const dilemmaSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().min(1),
  prompt: z.string().min(40),
  setting: z.string().min(40),
  kingdomOrigin: z.string().min(1),
  eraId: z.string().min(1),
  tags: z.array(z.string().min(1)).min(1),
  severity: z.number().min(0).max(1),
  aiRelevance: z.number().min(0).max(1),
  options: z.array(dilemmaOptionSchema).min(2).max(5),
  stakeholders: z
    .array(
      z.object({
        id: z.string().min(1),
        label: z.string().min(1),
        welfare: z.number().min(0).max(1),
        isAi: z.boolean(),
      }),
    )
    .min(2),
  lesson: z.string().min(40),
  references: z.array(
    z.object({
      title: z.string().min(1),
      author: z.string().min(1),
      year: z.number().int(),
    }),
  ),
});

export type Dilemma = z.infer<typeof dilemmaSchema>;

/* ------------------------------------------------------------------ *
 * Experiments — parameter sweeps over the classic thought experiments
 * ------------------------------------------------------------------ */

export const EXPERIMENT_MODELS = [
  "paperclip",
  "oracle",
  "genie",
  "tool-ai",
  "mesa",
  "oversight",
  "copy",
  "specification",
] as const;
export type ExperimentModel = (typeof EXPERIMENT_MODELS)[number];

export const experimentSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  origin: z.string().min(1),
  year: z.number().int(),
  authors: z.string().min(1),
  question: z.string().min(30),
  setup: z.string().min(60),
  model: z.enum(EXPERIMENT_MODELS),
  parameters: z
    .array(
      z.object({
        key: z.string().min(1),
        label: z.string().min(1),
        min: z.number(),
        max: z.number(),
        step: z.number().positive(),
        defaultValue: z.number(),
        unit: z.string().min(1),
        gloss: z.string().min(10),
      }),
    )
    .min(1)
    .max(4),
  metrics: z
    .array(
      z.object({
        key: z.string().min(1),
        label: z.string().min(1),
        direction: z.enum(["max", "min"]),
        unit: z.string().min(1),
        gloss: z.string().min(10),
      }),
    )
    .min(1),
  findings: z.array(z.string().min(10)).min(2),
  references: z.array(z.string().min(1)).min(1),
});

export type Experiment = z.infer<typeof experimentSchema>;

/* ------------------------------------------------------------------ *
 * Codex — glossary, primary texts, declarations
 * ------------------------------------------------------------------ */

export const GLOSSARY_KINDS = ["alignment", "ethics", "philosophy", "governance", "technical"] as const;
export type GlossaryKind = (typeof GLOSSARY_KINDS)[number];

export const glossaryEntrySchema = z.object({
  term: z.string().min(1),
  slug: z.string().min(1),
  kind: z.enum(GLOSSARY_KINDS),
  short: z.string().min(20),
  long: z.string().min(80),
  seeAlso: z.array(z.string()),
  kingdomId: z.string().nullable(),
});

export type GlossaryEntry = z.infer<typeof glossaryEntrySchema>;

export const textSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().min(1),
  author: z.string().min(1),
  year: z.number().int(),
  kind: z.enum(["primary", "modern", "declaration"]),
  summary: z.string().min(40),
  excerpt: z.string().min(20),
  kingdomId: z.string().nullable(),
});

export type CanonText = z.infer<typeof textSchema>;
