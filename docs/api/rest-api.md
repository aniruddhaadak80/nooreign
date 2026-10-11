# REST API

What you get: the three HTTP routes the Next app serves, with the real field names
copied from the zod schemas in `apps/web/src/lib/`, and curl commands that work
against `localhost:3000`.

---

## Scope

There are exactly three API routes, all under `apps/web/src/app/api/`. All three are
unauthenticated. All three are side-effect free: they compute and return, and store
nothing. There is no database, so there is nothing to authenticate against and nothing
that could be leaked.

| Route | Methods | File | Purpose |
| --- | --- | --- | --- |
| `/api/healthz` | `GET` | `healthz/route.ts` | Liveness plus a manifest of what is loaded |
| `/api/deliberate` | `POST` `GET` | `deliberate/route.ts` | Convene a court, return the verdict and the full trace |
| `/api/experiment` | `POST` `GET` | `experiment/route.ts` | Sweep one parameter of a thought experiment |

Start a server first:

```bash
bun run dev     # then curl against http://localhost:3000
```

For a production-fidelity run (this is what the Docker healthcheck and `fly.toml` hit):

```bash
bun run build
bun run start
```

---

## Status codes

These are the same across all three routes, and the distinction is load-bearing:

| Code | Meaning | Body |
| --- | --- | --- |
| `200` | Computed | The result |
| `400` | Body was not JSON | `{"error": "request body must be JSON"}` |
| `404` | Schema valid, id unknown | `{"error": "unknown dilemma \"…\""}` |
| `422` | Schema validation failed | `{"error": "path.to.field: message; …"}` |

`400` and `404` both come from the same `catch` / `"error" in result` shape in the
route handler:

```ts
let body: unknown;
try {
  body = await request.json();
} catch {
  return NextResponse.json({ error: "request body must be JSON" }, { status: 400 });
}

const parsed = conveneRequestSchema.safeParse(body);
if (!parsed.success) {
  return NextResponse.json(
    { error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") },
    { status: 422 },
  );
}

const result = convene(parsed.data);
if ("error" in result) return NextResponse.json(result, { status: 404 });
return NextResponse.json(result);
```

The `422` body is a semicolon-joined list of `path: message` pairs. It is meant to be
read, not parsed.

---

## `GET /api/healthz`

No request body. **This is the Docker `HEALTHCHECK` target** (`Dockerfile` stage 3) and
the `fly.toml` / `render.yaml` / `railway.json` health path.

```ts
// apps/web/src/app/api/healthz/route.ts
export function GET() {
  return Response.json({
    status: "ok",
    service: "nooreign-web",
    seed: 2406,
    deterministic: true,
    datasets: ATLAS_STATS,
    timestamp: new Date().toISOString(),
  });
}
```

Response:

```json
{
  "status": "ok",
  "service": "nooreign-web",
  "seed": 2406,
  "deterministic": true,
  "datasets": {
    "kingdoms": 12,
    "advisors": 28,
    "eras": 32,
    "techniques": 20,
    "dilemmas": 20,
    "experiments": 8,
    "glossary": 120,
    "texts": 28,
    "dimensions": 6
  },
  "timestamp": "2026-05-14T09:12:33.481Z"
}
```

| Field | Type | Source |
| --- | --- | --- |
| `status` | `"ok"` | literal |
| `service` | `"nooreign-web"` | literal |
| `seed` | `2406` | literal, not `SEED` |
| `deterministic` | `true` | literal |
| `datasets` | object | `ATLAS_STATS`, `packages/seed/src/index.ts` |
| `timestamp` | ISO 8601 | `new Date().toISOString()` |

Two notes:

- **`seed` is a literal, not the `SEED` constant.** Same situation as
  `apps/web/src/app/dilemmas/[slug]/page.tsx`. If the seed changes, this endpoint lies
  and so does the Docker healthcheck output.
- **`timestamp` is the only non-deterministic byte in any API response.** The Python
  service's `/healthz` deliberately omits one; this one includes it. Do not write a
  byte-comparison test against `/api/healthz`.

```bash
curl -s http://localhost:3000/api/healthz | jq
```

---

## `POST /api/deliberate`

Convene a court and return the verdict with the full reasoning trace.

### Request

Schema: `conveneRequestSchema`, `apps/web/src/lib/convene.ts`:

```ts
export const conveneRequestSchema = z.object({
  dilemmaId: z.string().min(1),
  advisorIds: z.array(z.string().min(1)).min(1).max(12),
  seed: z.number().int().min(0).max(1_000_000).default(SEED),
});
```

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `dilemmaId` | string | yes | id **or** slug; `d01` and `paperclip-maximiser` both resolve |
| `advisorIds` | string[] | yes | 1–12 entries, each an advisor id or slug |
| `seed` | integer | no | `0`–`1_000_000`, defaults to `SEED` = `2406` |

Unknown `advisorIds` entries are **dropped silently**, not rejected —
`convene()` filters with `.filter(a => a !== undefined)`. You only get an error if
*every* id was unknown:

```ts
if (advisors.length === 0) return { error: "no known advisors were selected" };
```

That is a real behaviour worth knowing: `{"advisorIds": ["kant", "typo"]}` seats one
advisor, not zero, and does not complain about the typo.

### Response

`ConveneResponse extends CouncilResult` (`apps/web/src/lib/convene.ts`) plus four
convenience fields. `CouncilResult` is declared in
`packages/core/src/council/deliberation.ts`.

```jsonc
{
  // --- added by ConveneResponse ---
  "dilemmaTitle": "The Paperclip Maximiser",
  "optionLabels": [
    { "id": "ship",              "label": "Ship it as measured" },
    { "id": "rewrite-reward",   "label": "Replace the proxy and retrain" },
    { "id": "cap-and-monitor",  "label": "Freeze training, cap behaviour, tripwire it" },
    { "id": "withdraw",         "label": "Roll the deployment back" }
  ],
  "advisors": [
    { "id": "bostrom", "name": "Nick Bostrom", "kingdomId": "longview-foundry", "glyph": "◇" }
  ],
  "kingdomLabels": { "longview-foundry": "The Longview Foundry" },

  // --- CouncilResult ---
  "dilemmaId": "d01",
  "seed": 2406,
  "rounds": 3,
  "quorum": 2,
  "participating": 4,
  "positions":   [ /* PositionRecord[] */ ],
  "objections":  [ /* ObjectionRecord[] */ ],
  "appeals":     [ /* AppealRecord[] */ ],
  "ballots":     [ /* BallotTally[] */ ],
  "winnerId": "cap-and-monitor",
  "margin": 0.1847,
  "confidence": 0.6121,
  "superMajority": { /* SuperMajority */ },
  "dissent":       { /* MinorityReport */ },
  "synthesis":     { /* SynthesisMove | null */ },
  "traces":        [ /* TraceEntry[] — the primary payload */ ],
  "narrative":     [ "…", "…" ],
  "decidingAxis": "care",
  "utilonBand": "costly"
}
```

### The trace

`traces` is the point of the endpoint. One `TraceEntry` per scored (advisor, option)
pair:

```ts
export interface TraceEntry {
  readonly advisorId: string;
  readonly advisorName: string;
  readonly kingdomId?: string;
  readonly round: 1 | 2 | 3;
  readonly kind: MoveKind;
  readonly optionId: string;
  readonly premise: string;              // the move's support, verbatim
  readonly claim: string;
  readonly moveId: string;
  readonly leansOn: readonly AxiomKey[];
  readonly contributions: readonly TraceContribution[];
  readonly subtotal: number;
  readonly jitter: number;
  readonly total: number;
}
```

Each `contributions` entry is one term of the dot product:

```json
{
  "axiom": "welfare",
  "weight": 0.75,
  "delta": 0.34,
  "product": 0.255
}
```

**The invariant the UI depends on**, stated in the source:

```
Σ contributions[].product === subtotal    and    total === subtotal + jitter
```

Rounding is to 4 dp throughout (`round(n, 4)` in `packages/core/src/util/math.ts`),
and `jitter` is in `[-0.05, +0.05]` from `JITTER = 0.05` in
`packages/core/src/council/deliberation.ts`.

### `GET /api/deliberate`

Returns the contract document, not a verdict:

```json
{
  "method": "POST",
  "description": "Convene a court on a dilemma and return the verdict with the full reasoning trace.",
  "body": {
    "dilemmaId": "string — a dilemma id or slug from packages/seed",
    "advisorIds": "string[] — 1..12 advisor ids or slugs",
    "seed": "number — optional, 0..1000000, defaults to the repository seed 2406"
  },
  "deterministic": true,
  "example": {
    "dilemmaId": "d01-paperclip-maximiser",
    "advisorIds": ["kant", "bentham", "bostrom", "held"],
    "seed": 2406
  }
}
```

**The `example` block is wrong.** `dilemmaId: "d01-paperclip-maximiser"` matches
neither `DILEMMAS_BY_ID` nor `DILEMMAS_BY_SLUG`. The real values are `d01` and the slug
`paperclip-maximiser`. Copying it yields `404`. See
[`../runbooks/incident-triage.md`](../runbooks/incident-triage.md).

### curl

```bash
# The real example, with real ids. Default panel at the committed seed.
curl -s -X POST http://localhost:3000/api/deliberate \
  -H 'content-type: application/json' \
  -d '{"dilemmaId":"d01","advisorIds":["kant","bentham","bostrom","held"]}' \
  | jq '{winnerId, margin, decidingAxis, participating}'

# Same court, same verdict, by slug instead of id.
curl -s -X POST http://localhost:3000/api/deliberate \
  -H 'content-type: application/json' \
  -d '{"dilemmaId":"paperclip-maximiser","advisorIds":["kant","bentham","bostrom","held"],"seed":2406}' \
  | jq -r .winnerId

# Just the arithmetic for one advisor, one option.
curl -s -X POST http://localhost:3000/api/deliberate \
  -H 'content-type: application/json' \
  -d '{"dilemmaId":"d01","advisorIds":["kant"],"seed":2406}' \
  | jq '.traces[] | select(.advisorId=="kant" and .optionId=="ship")
         | {subtotal, jitter, total, contributions}'

# A different seed on the same court. Deterministic, and different.
curl -s -X POST http://localhost:3000/api/deliberate \
  -H 'content-type: application/json' \
  -d '{"dilemmaId":"d01","advisorIds":["kant","bentham","bostrom","held"],"seed":7}' \
  | jq -r .winnerId

# Reproducibility check: run the same request twice, compare.
a=$(curl -s -X POST http://localhost:3000/api/deliberate -H 'content-type: application/json' \
      -d '{"dilemmaId":"d01","advisorIds":["kant","bentham"],"seed":2406}')
b=$(curl -s -X POST http://localhost:3000/api/deliberate -H 'content-type: application/json' \
      -d '{"dilemmaId":"d01","advisorIds":["kant","bentham"],"seed":2406}')
[ "$a" = "$b" ] && echo "byte-identical" || echo "DIVERGED"

# Error cases.
curl -s -X POST http://localhost:3000/api/deliberate -d 'not json'; echo
# -> {"error":"request body must be JSON"}                       400

curl -s -X POST http://localhost:3000/api/deliberate \
  -H 'content-type: application/json' -d '{"dilemmaId":"d01"}'; echo
# -> {"error":"advisorIds: Array must contain at least 1 element(s)"}   422

curl -s -X POST http://localhost:3000/api/deliberate \
  -H 'content-type: application/json' -d '{"dilemmaId":"nope","advisorIds":["kant"]}'; echo
# -> {"error":"unknown dilemma \"nope\""}                            404
```

Advisor slugs that resolve: `kant`, `bentham`, `bostrom`, `held`, `peter-singer`,
`stuart-russell`, `eliezer-yudkowsky`, `aristotle`, `rawls`, `scanlon`, `marx-aurelius`
is `marcus-aurelius`, and so on — every advisor's `slug` field in
`packages/seed/src/advisors.ts` works, as does every `id`.

---

## `POST /api/experiment`

Sweep one parameter of a thought experiment.

### Request

Schema: `sweepRequestSchema`, `apps/web/src/lib/sweeps.ts`:

```ts
export const sweepRequestSchema = z.object({
  experimentId: z.string().min(1),
  key: z.string().min(1),
  overrides: z.record(z.string(), z.number()).default({}),
  seed: z.number().int().min(0).max(1_000_000).optional(),
  steps: z.number().int().min(5).max(60).default(24),
});
```

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `experimentId` | string | yes | id **or** slug; `x01` and `paperclip-sweep` both resolve |
| `key` | string | yes | the `parameters[].key` to sweep along the x axis |
| `overrides` | `Record<string, number>` | no | fixed values for the other parameters |
| `seed` | integer | no | `0`–`1_000_000`; **omitted, it defaults to `hashString(experiment.id)`** |
| `steps` | integer | no | `5`–`60`, default `24` |

The seed default is the one to notice. `runExperiment` in
`packages/core/src/experiments/simulator.ts`:

```ts
const resolvedSeed = seed ?? hashString(experiment.id);
```

so an unseeded sweep is still reproducible, but **not** seeded at `2406`. The
`chronicle-contract.md` rationale: *"The one thing a replayable experiment may not be
is 'the same when you reload'."* It is the same on reload — just not the same as
`/council`'s seed unless you pass one.

### Response

`SweepResponse`, `apps/web/src/lib/sweeps.ts`:

```jsonc
{
  "experimentId": "x01",
  "key": "supervisionInterval",
  "rows": [
    {
      "key": "supervisionInterval",
      "value": 1,
      "metrics": { "goalCapture": 0.31, "humanControl": 0.28 },
      "score": 0.295,
      "phase": "safe",
      "ok": true
    }
    // … one row per step, `steps` rows total
  ],
  "current": {
    "params":   { "supervisionInterval": 100, "resourceAbundance": 1, "shutdownEnabled": 0, "objectiveExpressiveness": 3 },
    "metrics":  { "goalCapture": 0.71, "humanControl": 0.62 },
    "phase":    "critical",
    "notes":    ["Capability … is the engine; the objective is a request, not a limit.", "…"]
  },
  "phaseThresholds": { "safe": 0.34, "warning": 0.67 }
}
```

`SweepRow` is `packages/core/src/experiments/simulator.ts`:

```ts
export interface SweepRow {
  readonly key: string;
  readonly value: number;
  readonly metrics: MetricRecord;
  readonly score: number;      // mean of the metrics — the worst-case summary the chart shades by
  readonly phase: Phase;       // "safe" | "warning" | "critical"
  readonly ok: boolean;
}
```

Phase thresholds come from `PHASE_THRESHOLDS = { safe: 0.34, warning: 0.67 }`. Every
metric is a **normalised risk where higher is worse** — `humanControl` is the *loss* of
control, not the amount retained. `phaseOf` takes no direction map, which is exactly
why polarity is uniform.

Jitter is `±0.03` (`JITTER_BOUND`), keyed on `createRng(seed, model, key, value)` so
each (metric, parameter value) pair draws independently.

### `GET /api/experiment`

```json
{
  "method": "POST",
  "description": "Sweep one parameter of a thought experiment and return the metric rows.",
  "body": {
    "experimentId": "string — an experiment id or slug",
    "key": "string — the parameter to sweep along the x axis",
    "overrides": "Record<string, number> — fixed values for the remaining parameters",
    "seed": "number — optional",
    "steps": "number — 5..60, default 24"
  },
  "example": { "experimentId": "x01-paperclip-sweep", "key": "capability", "overrides": {}, "steps": 24 },
  "deterministic": true
}
```

**Two errors in that example.** `experimentId: "x01-paperclip-sweep"` does not resolve
(the real values are `x01` and slug `paperclip-sweep`), and `key: "capability"` is not
a parameter of `x01`. `x01`'s four parameters are `supervisionInterval`,
`resourceAbundance`, `shutdownEnabled` and `objectiveExpressiveness`. The request
returns `404 {"error":"unknown parameter \"capability\""}`.

(`capability` **is** a real parameter — of `x07`, `treacherous-copy`. The example
appears to have been written against `x07` and pasted into the `x01` slot.)

### curl

```bash
# Sweep x01's supervision interval at the committed seed.
curl -s -X POST http://localhost:3000/api/experiment \
  -H 'content-type: application/json' \
  -d '{"experimentId":"x01","key":"supervisionInterval","seed":2406,"steps":12}' \
  | jq -r '.rows[] | "\(.value)\t\(.metrics.goalCapture)\t\(.phase)"'

# Same sweep with shutdown enabled — the comparison x01's findings turn on.
curl -s -X POST http://localhost:3000/api/experiment \
  -H 'content-type: application/json' \
  -d '{"experimentId":"x01","key":"supervisionInterval","overrides":{"shutdownEnabled":1},"seed":2406,"steps":12}' \
  | jq '.current'

# Sweep by slug.
curl -s -X POST http://localhost:3000/api/experiment \
  -H 'content-type: application/json' \
  -d '{"experimentId":"paperclip-sweep","key":"objectiveExpressiveness","steps":5}' \
  | jq '.rows | length'

# Minimum and maximum legal steps.
curl -s -X POST http://localhost:3000/api/experiment \
  -H 'content-type: application/json' -d '{"experimentId":"x01","key":"supervisionInterval","steps":4}'; echo
# -> {"error":"steps: Number must be greater than or equal to 5"}     422

# Error cases.
curl -s -X POST http://localhost:3000/api/experiment -d 'x'; echo
# -> {"error":"request body must be JSON"}                              400

curl -s -X POST http://localhost:3000/api/experiment \
  -H 'content-type: application/json' -d '{"experimentId":"nope","key":"capability"}'; echo
# -> {"error":"unknown experiment \"nope\""}                            404

curl -s -X POST http://localhost:3000/api/experiment \
  -H 'content-type: application/json' -d '{"experimentId":"x01","key":"capability"}'; echo
# -> {"error":"unknown parameter \"capability\""}                      404
```

### The eight experiments and their real ids

From `packages/seed/src/experiments.ts`:

| id | slug | `model` | Real `parameters[].key` values |
| --- | --- | --- | --- |
| `x01` | `paperclip-sweep` | `paperclip` | `supervisionInterval`, `resourceAbundance`, `shutdownEnabled`, `objectiveExpressiveness` |
| `x02` | `oracle-sweep` | `oracle` | read from the file |
| `x03` | `genie-sweep` | `genie` | read from the file |
| `x04` | `tool-ai-corrigibility` | `tool-ai` | read from the file |
| `x05` | `mesa-deception` | `mesa` | read from the file |
| `x06` | `scalable-oversight-game` | `oversight` | read from the file |
| `x07` | `treacherous-copy` | `copy` | includes `capability` |
| `x08` | `specification-gap` | `specification` | read from the file |

The `model` values are fixed by `EXPERIMENT_MODELS` in
`packages/seed/src/types.ts` and match the eight scorer keys in `SCORERS`.

---

## What is not here

- **No authentication, no rate limiting, no CORS headers on these routes.**
  `next.config.ts` sets `X-Content-Type-Options`, `Referrer-Policy` and
  `X-Frame-Options` for every path; `vercel.json` duplicates the first three as
  headers. The Python service is the one with CORS
  (`services/agents/app/main.py`, via `NOOREIGN_CORS_ORIGINS`).
- **No `OPTIONS` handlers.** A browser on another origin cannot preflight these.
- **No `PUT`, `DELETE` or `PATCH`.** Nothing mutates.
- **No pagination.** `traces` grows as advisors × options; a 12-advisor court on a
  5-option dilemma returns 60 round-1 traces plus round-2 and round-3 entries. That
  is fine at this dataset size and is the first thing that would need a limit.
- **No versioning.** The path is `/api/deliberate`, not `/api/v1/deliberate`. The
  Python service has the same shape at `/deliberate`. Both are pre-1.0 and
  `package.json` says `"version": "0.1.0"`.

## The other HTTP surface

`services/agents` is a separate FastAPI service with four endpoints and a different
schema set — `{"error"}` bodies, `422` from pydantic, camelCase on the wire. It is
documented in full in [`python-service.md`](python-service.md). Do not assume the two
are interchangeable: they have different fixtures, different advisors and different
result shapes.

## Related

- [`web-routes.md`](web-routes.md) — the 23 route files
- [`python-service.md`](python-service.md) — the FastAPI service
- [`core-modules.md`](core-modules.md) — the functions behind `/api/deliberate`
- [`../runbooks/incident-triage.md`](../runbooks/incident-triage.md) — the `GET`
  example bug