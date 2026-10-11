# ADR 0004 — Deliberation is deterministic and seeded; there is no model call, and there never will be

**Status:** Accepted (2026-05)
**Deciders:** core maintainers
**Applies to:** `packages/core/src/util/rng.ts`, `packages/core/src/council/deliberation.ts`, `packages/core/src/council/voices.ts`, `packages/core/src/experiments/simulator.ts`, `.env.example`, `.github/workflows/ci.yml` (secrets-scan)

---

## Context

The obvious way to build "28 philosophers deliberate on a dilemma" is to prompt a
language model. It would produce better prose, it would handle novel dilemmas
without new data, and it would take an afternoon instead of a month.

It would also destroy every property the project is built on.

**1. A model call is not reproducible.** Temperature 0 is a strong hint, not a
guarantee. Batch composition, kernel selection, model version drift and provider
side-changes all move the output. The landing page promises "the same court
always returns the same verdict". With a model call that promise is a lie with a
disclaimer.

**2. A model call cannot produce a real trace.** Whatever it generates as
"reasoning" is generated *after* the answer, conditioned on the answer. A trace
built that way is a rationalisation. The council page would be showing prose next
to arithmetic that did not produce it, and a careful reader would be right to
distrust both.

**3. A model call cannot be audited across languages.** The Python service and
the Rust crate would have to make the same non-deterministic call with the same
prompt and hope. Parity tests become flaky by construction.

**4. A model call requires a key.** Which means: an `.env` with a secret, a
secret in CI, a rate limit, a bill, a provider outage as a failure mode, and a
copy of `SECURITY.md` explaining that this demo project has a credential to leak.
The repo currently runs a `secrets-scan` job precisely because it holds no
production secrets by design.

There is a subtler cost too. The advisors are **named real people** — Kant,
Bentham, Gilligan, Rawls, Scanlon, de Beauvoir. A model asked to speak as Kant
produces plausible-sounding attributions that no one wrote. Even hedged with "in
the spirit of", that is putting words in a historical figure's mouth at scale.
The seed data's `moves` are hand-written and checkable against the primary text;
generated ones would be neither.

## Decision

**A deliberation is a pure function of its inputs. There is no network call, no
credential, and no wall-clock time anywhere in the verdict path.**

Three commitments make that true:

**(a) All randomness is seeded and keyed on identity.**

```ts
// packages/core/src/util/rng.ts
export function createRng(...parts: readonly (string | number)[]): Rng {
  const joined = parts.map((p) => String(p)).join("\u241f");
  const seed = hashString(joined);        // FNV-1a, 32-bit
  const nextFn = mulberry32(seed);
  // next, range, int, pick, shuffle, gaussian, fork
}
```

`mulberry32` is chosen over a statistically richer generator because it is four
lines with no hidden tables and is trivially portable to Rust and Python — and
portability matters more here than sophistication. The `\u241f` separator stops
`("ab","c")` from colliding with `("a","bc")`.

**(b) Every perturbation is bounded and identity-keyed.** The council's jitter is
the only thing that stops all 28 advisors being perfectly rational, and it is
capped at `JITTER = 0.05`:

```ts
function jitterFor(seed: number, tag: string, advisorId: string, optionId: string): number {
  const rng = createRng(seed, tag, advisorId, optionId);
  return round((rng.next() * 2 - 1) * JITTER, 4);
}
```

Keying on `(seed, round tag, advisorId, optionId)` means the same advisor/option
pair jitters identically even when the rest of the court changes — so a court is
comparable across sessions. The 0.05 bound is a *product* decision, not a numeric
one: a philosopher off by a twentieth of their own confidence is still a
philosopher with a view, and a larger bound would let the seed, not the axioms,
decide verdicts. The experiment simulator uses the same discipline with
`JITTER_BOUND = 0.03`.

**(c) Every tie-break is total.** `decision()` falls through ballot total → mean
score → lowest `risk` → lexicographically smallest `id`. The last step is not a
detail; it is what guarantees two councils with identical numbers produce
identical output. `rankAxes`, `dominantAxiom`, `highlightEras` and
`topologicalOrder` all break ties on `AXIOM_KEYS` index or on `id`, never on
iteration order.

Prose is assembled, not generated. `packages/core/src/council/voices.ts` builds
every line from the advisor's *own* stored text — their `signatureMove`, their
`voice.cadence`, their `voice.tells`, their `moves` — through a pure function.
Unknown placeholders are left verbatim rather than blanked, so a broken template
shows `{foo}` instead of quietly rendering nothing.

## Consequences

**Positive**

- `runCouncil` is deep-equal for identical inputs, forever, on any machine. Two
  readers comparing notes are comparing the same court.
- The trace *is* the computation. `Σ products === subtotal` and
  `total === subtotal + jitter` are invariants the UI can assert, not
  aspirations.
- A verdict change is always traceable to a diff: either an axiom weight moved, a
  move's `weight` moved, or a formula changed. See
  [`docs/runbooks/verdict-regression.md`](../runbooks/verdict-regression.md).
- Cross-language parity is testable, because both sides are pure functions.
- Zero credentials. The `secrets-scan` CI job is a backstop for a condition that
  should never arise.
- The site works offline, on a plane, and in an air-gapped screenshot.
- Prose never misattributes an argument: every sentence is assembled from text a
  maintainer wrote and a reviewer checked.

**Negative**

- **Prose quality is bounded by the seed data.** The narrative is templated. It
  reads well and it will never be surprising in the way a good model is
  surprising. This is the cost of the guarantee, and it is paid in the place
  users notice first.
- **Novel dilemmas need written options.** The engine cannot adjudicate a case
  someone improvised in the query string. Every new dilemma is content work
  (`packages/seed/src/dilemmas.ts`), not a prompt.
- **The traces can only be as good as the hand-written moves.** Four moves per
  advisor is enough to make a deliberation legible and not enough to make it rich.
- **Scaling the corpus is linear in seed size.** Because deliberation happens per
  request in-process, a much larger roster would need memoisation keyed on
  `(dilemmaId, seed, roster hash)`.
- **A deterministic engine is still a biased one.** Determinism removes
  randomness; it does not remove editorial judgement baked into 250 hand-authored
  records. See [`docs/limitations.md`](../limitations.md) — this ADR is about
  reproducibility, and should not be read as a claim about correctness.

## Alternatives considered

| Option | Why rejected |
| --- | --- |
| **LLM-generated verdicts and explanations** | Non-reproducible, untraceable, requires a key, unauditable across languages, and generates misattributions of named historical figures. |
| **LLM for prose only, arithmetic for verdicts** | The compromise that looked best. Rejected because the *prose* is what readers trust most — a narration that reads fluently next to arithmetic it did not produce is worse than terse text that did. The repo chose `voices.ts` instead. |
| **`Math.random()` with a seed stored client-side** | Looks reproducible per user and is not: two users get two different courts, and the share link is meaningless. |
| **No jitter at all** | Every advisor becomes a perfect calculator and the deliberation stops looking like one. Worse: it hides which advisor actually decided the case. The 0.05 cap is the compromise. |
| **A richer PRNG (PCG, xoshiro)** | Better statistical quality, more code to port to Rust and Python. Rejected: nothing here needs the extra bits, and portability is worth more. |
| **Recorded golden outputs checked into CI** | Adopted as a *complement* (regression fixtures), not as the primary mechanism. |
