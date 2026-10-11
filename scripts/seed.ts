#!/usr/bin/env bun
/**
 * seed.ts — validate the offline atlas and emit the derived corpus.
 *
 * Run with `bun run seed`. It fails loudly (exit 1) if any dataset violates its
 * schema or points at a foreign key that does not exist, because a broken seed is
 * the one class of bug that shows up as an empty page rather than an error.
 *
 * Outputs:
 *   packages/seed/src/generated/corpus.ts  — flattened search corpus for the codex
 *   packages/seed/seed.json                — the provenance record (seed, counts)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import {
  ADVISORS,
  ATLAS_STATS,
  DILEMMAS,
  ERAS,
  EXPERIMENTS,
  GLOSSARY,
  KINGDOMS,
  SEED,
  TECHNIQUES,
  TEXTS,
  validateSeed,
} from "../packages/seed/src/index.ts";

const ROOT = resolve(process.argv[2] ?? ".");
const quiet = process.argv.includes("--quiet");

const fail = (message: string): never => {
  console.error(`\n✗ seed validation failed: ${message}\n`);
  process.exit(1);
};

const issues = validateSeed();
if (issues.length > 0) {
  console.error(`\n✗ ${issues.length} integrity issue(s):`);
  for (const issue of issues) console.error(`  ${issue.dataset}/${issue.id}: ${issue.problem}`);
  fail("fix the dataset before generating anything from it");
}

/* ------------------------------------------------------------------ *
 * Derived corpus — one flat, typed record per thing worth searching
 * ------------------------------------------------------------------ */
export interface CorpusEntry {
  id: string;
  kind: "kingdom" | "advisor" | "era" | "technique" | "dilemma" | "experiment" | "glossary" | "text";
  title: string;
  href: string;
  year: number | null;
  body: string;
  tags: string[];
}

function buildCorpus(): CorpusEntry[] {
  const entries: CorpusEntry[] = [];

  for (const kingdom of KINGDOMS) {
    entries.push({
      id: kingdom.id,
      kind: "kingdom",
      title: kingdom.name,
      href: `/kingdoms/${kingdom.slug}`,
      year: kingdom.founded,
      body: [kingdom.motto, kingdom.creed, kingdom.aiStance.headline, kingdom.aiStance.note, ...kingdom.questions].join(" "),
      tags: [kingdom.terrain, kingdom.founder, kingdom.aiStance.verdict],
    });
  }

  for (const advisor of ADVISORS) {
    entries.push({
      id: advisor.id,
      kind: "advisor",
      title: advisor.name,
      href: `/court/${advisor.slug}`,
      year: advisor.born,
      body: [
        advisor.epithet,
        advisor.creed,
        advisor.signatureMove.name,
        advisor.signatureMove.description,
        advisor.onAi.note,
        ...advisor.works.map((work) => `${work.title} ${work.note}`),
      ].join(" "),
      tags: [advisor.kingdomId, advisor.voice.cadence],
    });
  }

  for (const era of ERAS) {
    entries.push({
      id: era.id,
      kind: "era",
      title: era.title,
      href: `/chronicle/${era.slug}`,
      year: era.startYear,
      body: [
        era.summary,
        ...era.advances,
        ...era.landmarks.map((landmark) => `${landmark.title} ${landmark.note}`),
        era.quote ? `${era.quote.text} ${era.quote.attribution}` : "",
      ].join(" "),
      tags: [era.domain, ...era.techniques],
    });
  }

  for (const technique of TECHNIQUES) {
    entries.push({
      id: technique.id,
      kind: "technique",
      title: technique.name,
      href: `/observatory#${technique.id}`,
      year: technique.introduced,
      body: [technique.summary, ...technique.risks, technique.paper ? `${technique.paper.title} ${technique.paper.authors}` : ""].join(" "),
      tags: [technique.kind, ...technique.covers],
    });
  }

  for (const dilemma of DILEMMAS) {
    entries.push({
      id: dilemma.id,
      kind: "dilemma",
      title: dilemma.title,
      href: `/dilemmas/${dilemma.slug}`,
      year: null,
      body: [dilemma.prompt, dilemma.setting, dilemma.lesson, ...dilemma.options.map((option) => option.description)].join(" "),
      tags: dilemma.tags,
    });
  }

  for (const experiment of EXPERIMENTS) {
    entries.push({
      id: experiment.id,
      kind: "experiment",
      title: experiment.name,
      href: `/experiments/${experiment.slug}`,
      year: experiment.year,
      body: [experiment.question, experiment.setup, ...experiment.findings].join(" "),
      tags: [experiment.model],
    });
  }

  for (const entry of GLOSSARY) {
    entries.push({
      id: entry.slug,
      kind: "glossary",
      title: entry.term,
      href: `/codex/${entry.slug}`,
      year: null,
      body: `${entry.short} ${entry.long}`,
      tags: [entry.kind],
    });
  }

  for (const text of TEXTS) {
    entries.push({
      id: text.id,
      kind: "text",
      title: text.title,
      href: `/codex/texts/${text.slug}`,
      year: text.year,
      body: `${text.summary} ${text.excerpt}`,
      tags: [text.kind, text.author],
    });
  }

  return entries;
}

const corpus = buildCorpus();

const corpusFile = `/**
 * GENERATED FILE — do not edit by hand.
 * Produced by \`bun run seed\` from packages/seed/src/*.
 * Regenerating with seed ${SEED} reproduces this file exactly.
 */
import type { CorpusEntry } from "./corpus-types";

export const CORPUS: readonly CorpusEntry[] = ${JSON.stringify(corpus, null, 2)} as const;
`;

const corpusTypes = `/**
 * Shape of one search document in the generated corpus.
 * Kept separate so the generated array stays plain JSON.
 */
export interface CorpusEntry {
  id: string;
  kind: "kingdom" | "advisor" | "era" | "technique" | "dilemma" | "experiment" | "glossary" | "text";
  title: string;
  href: string;
  year: number | null;
  body: string;
  tags: string[];
}
`;

const generatedDir = join(ROOT, "packages/seed/src/generated");
mkdirSync(generatedDir, { recursive: true });
writeFileSync(join(generatedDir, "corpus-types.ts"), corpusTypes, "utf8");
writeFileSync(join(generatedDir, "corpus.ts"), corpusFile, "utf8");
writeFileSync(join(generatedDir, "index.ts"), `export { CORPUS } from "./corpus";\nexport type { CorpusEntry } from "./corpus-types";\n`, "utf8");

writeFileSync(
  join(ROOT, "packages/seed/seed.json"),
  `${JSON.stringify(
    {
      seed: SEED,
      generatedBy: "bun run seed",
      counts: ATLAS_STATS,
      integrity: "clean",
      note: "Every stochastic path in this repository derives from this seed via a mulberry32 PRNG.",
    },
    null,
    2,
  )}\n`,
  "utf8",
);

if (!quiet) {
  console.log(`seed ${SEED} validated — ${issues.length} integrity issues`);
  console.table({ ...ATLAS_STATS, corpus: corpus.length });
  console.log("wrote packages/seed/src/generated/corpus.ts");
  console.log("wrote packages/seed/seed.json");
}

void dirname;
