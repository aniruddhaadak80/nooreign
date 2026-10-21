# Nooreign — documentation index

What you get: what this repository is, a table of every other document in `docs/`, and three reading orders depending on why you opened it.

---

## What this is

Nooreign is the philosophical atlas of aligning intelligence. Twelve schools of ethical
thought are rendered as kingdoms; twenty-eight named thinkers sit on their courts;
twenty cases about superintelligence are put to those courts; thirty-two eras replay
how humanity got here; twenty alignment techniques are stacked into towers; and eight
classic thought experiments become parameter sweeps with dials.

What makes it unusual is the engine underneath. A verdict is **arithmetic over six
moral axes**, not a language-model opinion. Every advisor is a six-number weight
vector. Every option is a six-number `deltas` vector. The score is a weight-normalised
dot product, rounded to four decimal places, plus a seeded jitter of at most ±0.05.
The trace you read on `/council` **is** the arithmetic that produced the verdict — the
same products, the same rounding, the same seed.

The committed seed is `2406` (`packages/seed/src/index.ts`). Every generated asset,
every sweep, every prompt selection and every search ordering is a pure function of
it. That is the difference between a simulation and an opinion.

Read [`limitations.md`](limitations.md) before you cite anything here.

## The one thing to know first

**A verdict is a fact about the court, not about the world.**

The engine can tell you that `{welfare: 0.92}`-weighted Singer and
`{rights: 0.95}`-weighted Kant split four-to-four on `d01`. It cannot tell you which
four were right, and it is built so that it *cannot* tell you: there is no oracle
behind the six axes to appeal to. Everything else in this repository follows from
that sentence.

---

## The map

### Long-form

| Document | What it is |
| --- | --- |
| [`glossary.md`](glossary.md) | ~70 terms in one line each, alphabetical, with what each does *not* settle |
| [`concepts.md`](concepts.md) | The ten ideas the atlas is built on, with citations and years |
| [`data-sources.md`](data-sources.md) | Where every historical claim comes from, and which entries are paraphrase |
| [`limitations.md`](limitations.md) | What this repository is not, stated bluntly. Read this one twice |

### Guides

| Document | What it is |
| --- | --- |
| [`guides/getting-started.md`](guides/getting-started.md) | Cold clone to running dev server, and the command map |
| [`guides/architecture.md`](guides/architecture.md) | Package graph, request flow, dependency rules |
| [`guides/determinism-and-seeds.md`](guides/determinism-and-seeds.md) | Every stochastic path, the seed `2406`, and how to regenerate |
| [`guides/writing-good-argument-moves.md`](guides/writing-good-argument-moves.md) | How to write an `ArgumentMove` that is attributable to its advisor |
| [`guides/deploying.md`](guides/deploying.md) | Vercel, Docker, Fly, Render, Railway, and the healthcheck contract |
| [`guides/deploying-to-fly.md`](guides/deploying-to-fly.md) | Step by step to a Fly machine: the commands, the app name, the build argument that is not a secret |
| [`guides/deploying-to-render.md`](guides/deploying-to-render.md) | Step by step to a Render blueprint: the commands, the prompt that fails silently, how to verify it |
| [`guides/contributing-guide.md`](guides/contributing-guide.md) | Branching, commits, the determinism rule, review |
| [`guides/adding-a-kingdom.md`](guides/adding-a-kingdom.md) | Authoring a realm |
| [`guides/adding-an-advisor.md`](guides/adding-an-advisor.md) | Authoring a thinker and their axiom vector |
| [`guides/adding-a-dilemma.md`](guides/adding-a-dilemma.md) | Authoring a case and its option deltas |
| [`guides/adding-a-technique.md`](guides/adding-a-technique.md) | Authoring a technique for the observatory |

### Runbooks

| Document | Symptom it starts from |
| --- | --- |
| [`runbooks/incident-triage.md`](runbooks/incident-triage.md) | Something is broken and you do not know where |
| [`runbooks/verdict-regression.md`](runbooks/verdict-regression.md) | A verdict moved and you need to know why |
| [`runbooks/dataset-corruption.md`](runbooks/dataset-corruption.md) | `validateSeed()` reports issues, or a page renders empty |
| [`runbooks/performance.md`](runbooks/performance.md) | The build, a sweep or a render got slow |
| [`runbooks/release.md`](runbooks/release.md) | Cutting a version |

### API reference

| Document | Surface |
| --- | --- |
| [`api/web-routes.md`](api/web-routes.md) | Every route file under `apps/web/src/app`, params and data source |
| [`api/rest-api.md`](api/rest-api.md) | `/api/healthz`, `/api/deliberate`, `/api/experiment` with real JSON |
| [`api/core-modules.md`](api/core-modules.md) | Every export group in `packages/core` |
| [`api/python-service.md`](api/python-service.md) | `services/agents` — the FastAPI service that exists |
| [`api/rust-crate.md`](api/rust-crate.md) | `crates/engine` — the reference implementation, and what is not there yet |
| [`api/sdk.md`](api/sdk.md) | `packages/sdk` — the typed client package |

### Architecture decision records

| ADR | Decision |
| --- | --- |
| [`adr/0001`](adr/0001-turborepo-raw-typescript-packages.md) | Turborepo, and packages ship raw `.ts` rather than `dist` |
| [`adr/0002`](adr/0002-six-axis-axiom-vector.md) | The six-axis vector is the only thing that makes an advisor vote |
| [`adr/0003`](adr/0003-no-database-typed-seed-data.md) | No database; the dataset is a typed constant |
| [`adr/0004`](adr/0004-deterministic-seeded-deliberation.md) | Deliberation is deterministic and seeded; no model call, ever |
| [`adr/0005`](adr/0005-nextjs-15-not-16.md) | Next.js 15, not 16 |
| [`adr/0006`](adr/0006-tailwind-v4-theme-tokens.md) | Tailwind v4 theme tokens |
| [`adr/0007`](adr/0007-choosing-the-six-axis-names.md) | How the six axis names were chosen |
| [`adr/0008`](adr/0008-rust-reference-engine-parity.md) | `crates/engine` is a parity oracle, not a speed path |
| [`adr/0009`](adr/0009-optional-python-agents-service.md) | The Python service is optional at runtime |
| [`adr/0010`](adr/0010-bce-year-integer-convention.md) | Years are signed integers; `-399` is 399 BCE |

### Diagrams

14 mermaid sources under [`diagrams/`](diagrams/), rendered to SVG in
[`images/generated/`](images/generated/). Regenerate with `bun run diagrams`.

The three worth opening first:

| Diagram | Answers |
| --- | --- |
| [`system-architecture.mmd`](diagrams/system-architecture.mmd) | What talks to what |
| [`deliberation-loop.mmd`](diagrams/deliberation-loop.mmd) | What happens inside `runCouncil` |
| [`deploy-pipeline.mmd`](diagrams/deploy-pipeline.mmd) | How a commit becomes a URL |

---

## Reading orders

### If you are a curious visitor

1. [`glossary.md`](glossary.md) — the vocabulary, before anything else
2. [`concepts.md`](concepts.md) — the ten ideas, with the papers they came from
3. [`data-sources.md`](data-sources.md) — how you can check every claim here
4. [`limitations.md`](limitations.md) — what this is not
5. [`guides/architecture.md`](guides/architecture.md) — only if you want to build on it

### If you are a contributor

1. [`guides/getting-started.md`](guides/getting-started.md)
2. [`guides/architecture.md`](guides/architecture.md)
3. [`guides/determinism-and-seeds.md`](guides/determinism-and-seeds.md) — **read this before your first PR**; the determinism rule is the one that gets PRs held
4. [`guides/contributing-guide.md`](guides/contributing-guide.md)
5. The `adding-a-*` guide for whatever you are adding
6. [`api/core-modules.md`](api/core-modules.md) — so you know what already exists

### If you are doing alignment research

1. [`limitations.md`](limitations.md) — **first, before anything else**, or you will
   cite this as evidence
2. [`concepts.md`](concepts.md)
3. [`data-sources.md`](data-sources.md) — the citation trail, with paraphrases flagged
4. [`glossary.md`](glossary.md)
5. [`guides/determinism-and-seeds.md`](guides/determinism-and-seeds.md) — so you can
   re-run a verdict yourself
6. [`runbooks/verdict-regression.md`](runbooks/verdict-regression.md) — how to bisect
   a change that moved a verdict