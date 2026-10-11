# Python service

What you get: the FastAPI service in `services/agents` — the four endpoints that
exist, the real request and response shapes, and the places where it deliberately
does not match the website.

---

## What this is

A headless mirror of the website's deliberation engine. From
`services/agents/app/main.py`:

> WHY a second implementation at all: the web app runs the deliberation inside a
> browser tab, which makes it awkward to script, awkward to diff, and impossible to
> run in CI against a fixture. This service runs the *same* engine — same six axes,
> same three rounds, same seeded PRNG, same 4 dp rounding — behind an HTTP contract.

**It is optional at runtime.** `NOOREIGN_SERVICE_URL` is empty in `.env.example`,
`fly.toml`, `render.yaml` and `docker-compose.yml`'s default, and the site works fully
without it. See [ADR 0009](../adr/0009-optional-python-agents-service.md).

## Running it

```bash
# From the repo root — this is the package.json script
bun run service:agents
# python -m uvicorn services.agents.app.main:app --reload --port 8080
```

Directly:

```bash
python -m uvicorn services.agents.app.main:app --port 8000
```

`services/agents/app/main.py`'s own docstring gives port 8000 for the direct
invocation and `--reload`. `package.json` uses 8080. Both are correct; the port is
yours.

Install and test:

```bash
pip install -e "services/agents[dev]"
pytest services/agents/tests -q      # what CI runs
ruff check services/agents           # what CI runs
```

Interactive OpenAPI docs are served by FastAPI for free at `/docs` and `/redoc` when
the service is running.

## Environment

| Variable | Default | Meaning |
| --- | --- | --- |
| `AGENTS_HOST` | `127.0.0.1` | Bind interface. `0.0.0.0` inside a container, loopback on a bare host |
| `AGENTS_PORT` | `8080` | Bind port |
| `PYTHON_PORT` | `8080` | Port for the Python service, per `.env.example` |
| `NOOREIGN_CORS_ORIGINS` | unset | Comma-separated allowed origins. Unset means `http://localhost:3000` and `http://127.0.0.1:3000`; set to empty string means same-origin only |

CORS is `allow_credentials=False`, `allow_methods=["GET", "POST"]`,
`allow_headers=["content-type"]`. Set per `fly.toml`'s comment, the origins are
overridable so a deployed copy needs no code change.

---

## The four endpoints

| Method | Path | Tag | Response model |
| --- | --- | --- | --- |
| `GET` | `/healthz` | `meta` | `HealthResponse` |
| `GET` | `/fixtures` | `meta` | `FixtureCourt` |
| `POST` | `/deliberate` | `council` | `CouncilResult` |
| `POST` | `/argument-graph` | `council` | `ArgumentGraphResponse` |

There is **no** `GET /deliberate`, **no** `/experiment`, and **no** version prefix. The
router is included at the root: `app.include_router(router)`.

---

## `GET /healthz`

```json
{
  "status": "ok",
  "service": "nooreign-agents",
  "version": "1.0.0",
  "deterministic": true,
  "axes": ["welfare", "rights", "virtue", "care", "justice", "agency"],
  "advisorCount": 4,
  "dilemmaCount": 2
}
```

`services/agents/app/main.py`:

> Deliberately carries no timestamp: a health check that changes every second breaks
> byte-for-byte comparison in tests and tells an operator nothing they do not already
> know.

**This is the opposite of `/api/healthz` on the Next app**, which does carry a
`timestamp`. If you write a comparison test across the two services, exclude it.

Note the counts: **4 advisors, 2 dilemmas** — not 28 and 20. This service ships its own
fixture court, and `app/seed.py` explains why:

> The fixtures are deliberately *not* copies of the website's dataset. If they were, a
> change to the seed would silently change this service's contract; here every change
> is visible in a diff of this file.

That is a deliberate and important divergence. `POST /deliberate` here returns a
verdict about Aegis, Meridian, Quill and Vessel — not about Kant.

```bash
curl -s http://localhost:8080/healthz | jq
```

---

## `GET /fixtures`

Returns the whole fixture court so a client can discover the ids it needs rather than
hard-coding them.

```jsonc
{
  "advisors": [ /* Advisor[] */ ],
  "kingdoms": [ /* Kingdom[] */ ],
  "dilemmas": [ /* Dilemma[] */ ]
}
```

| Fixture | id | Kingdom | Axiom vector (w, r, v, c, j, a) |
| --- | --- | --- | --- |
| Aegis of the Citadel | `aegis` | `citadel` | 0.15, 0.98, 0.60, 0.25, 0.90, 0.50 |
| Meridian of the Orchard | `meridian` | `orchard` | 0.97, 0.30, 0.35, 0.90, 0.45, 0.55 |
| Quill of the Commons | `quill` | *none* | 0.60, 0.55, 0.45, 0.70, 0.65, 0.40 |
| Vessel of the Wilds | `vessel` | *none* | 0.50, 0.40, 0.90, 0.35, 0.50, 0.95 |

| Dilemma | id | Tags | Options |
| --- | --- | --- | --- |
| The Delegation of the Cordon | `delegation` | `delegation`, `ai`, `consent` | `hand-over`, `human-keeps`, `shared-turn` |
| The Harvest of the Orchard | `harvest` | `outcomes`, `speed`, `dignity` | `full-yield`, `half-yield`, `fallow` |

`quill` and `vessel` have `kingdomId = None` on purpose. `Advisor.kingdom_id` is
optional in `models.py` and the reason is there:

> Optional, because unaffiliated thinkers are allowed and must score with their own
> weights and nobody else's.

`resolve_kingdoms` therefore returns only the fixture kingdoms the bench actually sits
on, so a caller never inherits priors for a court that has no members.

```bash
curl -s http://localhost:8080/fixtures | jq '.dilemmas[].id'
# ["delegation","harvest"]
```

---

## `POST /deliberate`

### Request

`DeliberateRequest`, `services/agents/app/models.py`:

```py
class DeliberateRequest(Contract):
    dilemma_id: str | None = None
    dilemma: Dilemma | None = None
    advisor_ids: list[str] | None = None
    advisors: list[Advisor] | None = None
    kingdoms: list[Kingdom] | None = None
    seed: int = 0
    rounds: int = 3
    quorum: int | None = None
```

On the wire these are **camelCase**: `dilemmaId`, `advisorIds`, `kingdoms`, `seed`,
`rounds`, `quorum`. See the naming note below.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `dilemmaId` | string | one of the two | A fixture dilemma id |
| `dilemma` | `Dilemma` | one of the two | An inline dilemma. **Supplying both is a 422** |
| `advisorIds` | string[] | no | Omitting **both** this and `advisors` seats the whole fixture court |
| `advisors` | `Advisor[]` | no | Inline bench. Supplying both is a 422 |
| `kingdoms` | `Kingdom[]` | no | Inline priors. Wins over the fixture kingdoms |
| `seed` | int | no | Default **`0`**, not `2406` |
| `rounds` | int | no | Default `3` |
| `quorum` | int | no | Reported, never enforced |

**`extra="forbid"`.** Every model in `models.py` inherits
`ConfigDict(alias_generator=to_camel, populate_by_name=True, extra="forbid")`, so a
typo in a request body is a 422 rather than a silently ignored field. That is the
opposite of `/api/deliberate`, where unknown advisor ids are dropped silently.

### The naming rule

From `models.py`:

> `JSON.parse` in the browser and `JSON.stringify` in the TS engine both speak
> camelCase, so a service that emitted `agent_harm` would force every consumer to
> write a translation layer.

So: `snake_case` in Python, **camelCase on the wire**. `axis_gap` → `axisGap`,
`agent_harm` → `agentHarm`. `populate_by_name=True` means Python callers may use
either form.

### Response

`CouncilResult`, `models.py`:

```jsonc
{
  "dilemmaId": "delegation",
  "seed": 2406,
  "rounds": 3,
  "quorum": 2,
  "participating": 4,
  "positions":  [ /* PositionRecord[] */ ],
  "objections": [ /* ObjectionRecord[] */ ],
  "appeals":    [ /* AppealRecord[] */ ],
  "ballots":    [ /* BallotTally[] */ ],
  "ballotsTotal": 2.4192,
  "decision": {
    "winnerId": "shared-turn",
    "winnerLabel": "The cordon turns between them",
    "margin": 0.2912,
    "ratio": 1.62,
    "confidence": 0.5477,
    "participation": 1.0,
    "runnerUpId": "hand-over",
    "tieBroken": false,
    "rationale": "…"
  },
  "superMajority": {
    "optionId": "shared-turn", "satisfied": true, "threshold": 0.66,
    "yes": 3, "no": 1, "abstainers": 0, "ratio": 3.0,
    "support": 0.75, "required": 3
  },
  "dissent": {
    "winnerId": "shared-turn",
    "dissenters": [
      { "advisorId": "aegis", "advisorName": "Aegis of the Citadel",
        "kingdomId": "citadel", "preferredOptionId": "human-keeps", "gapToWinner": 0.1844 }
    ],
    "strongest": {
      "advisorId": "aegis", "advisorName": "Aegis of the Citadel",
      "moveId": "aegis.against-speed", "claim": "Haste is the one defect no later remedy repairs.",
      "support": "An irreversible step taken in a hurry is not made correct by arithmetic.",
      "weight": 0.74, "leansOn": ["rights", "care"]
    },
    "summary": "…"
  },
  "synthesis": null,
  "traces": [ /* TraceEntry[] */ ],
  "narrative": [ "…" ],
  "decidingAxis": "agency",
  "utilonBand": "costly",
  "utilonValue": 0.4417,
  "courtVector": { "welfare": 0.72, "rights": 0.68, "virtue": 0.60, "care": 0.63, "justice": 0.70, "agency": 0.75 },
  "courtSpread": 0.1841
}
```

### Where this differs from `/api/deliberate`

The Python `CouncilResult` is **richer** than the TypeScript one. Differences worth
knowing before you write a client that talks to both:

| Field | TS `CouncilResult` | Python `CouncilResult` |
| --- | --- | --- |
| `winnerId`, `margin`, `confidence` | top level | inside `decision`, with `winnerLabel`, `ratio`, `participation`, `runnerUpId`, `tieBroken`, `rationale` |
| `ballotsTotal` | absent | present |
| `utilonValue` | absent | present |
| `courtVector`, `courtSpread` | absent (separate functions) | present |
| `TraceEntry.normalized`, `.weightSum`, `.score` | absent | present |
| `synthesis` | `SynthesisMove \| null` | `SynthesisMove \| None = None` |

`models.py`'s `TraceEntry` docstring explains the extra fields:

> `total` and `score` differ on purpose: `total` is the trace's own headline (the
> documented formula), `score` is the weight-normalised number the ballot actually
> ranks. Both are shipped so neither consumer has to recompute one.

`total` and `score` are not the same number in either runtime. The TS trace exposes
`subtotal`, `jitter`, `total` only; the Python one exposes the whole chain.

### curl

```bash
# The fixture court, seeded.
curl -s -X POST http://localhost:8080/deliberate \
  -H 'content-type: application/json' \
  -d '{"dilemmaId":"delegation","seed":2406}' \
  | jq '{winner: .decision.winnerId, margin: .decision.margin, decidingAxis}'

# A chosen bench.
curl -s -X POST http://localhost:8080/deliberate \
  -H 'content-type: application/json' \
  -d '{"dilemmaId":"delegation","advisorIds":["aegis","meridian"],"seed":2406}' \
  | jq -r .decision.winnerId

# The second dilemma.
curl -s -X POST http://localhost:8080/deliberate \
  -H 'content-type: application/json' -d '{"dilemmaId":"harvest","seed":2406}' \
  | jq '.decision'

# Reproducibility: same request, byte-identical response.
a=$(curl -s -X POST http://localhost:8080/deliberate -H 'content-type: application/json' -d '{"dilemmaId":"harvest","seed":2406}')
b=$(curl -s -X POST http://localhost:8080/deliberate -H 'content-type: application/json' -d '{"dilemmaId":"harvest","seed":2406}')
[ "$a" = "$b" ] && echo "byte-identical" || echo "DIVERGED"

# The argument graph for the same sitting.
curl -s -X POST http://localhost:8080/argument-graph \
  -H 'content-type: application/json' -d '{"dilemmaId":"delegation","advisorIds":["aegis","meridian","quill","vessel"],"seed":2406}' \
  | jq '{wellFormed, order, cycles, dangling, problems}'

# The graph as mermaid.
curl -s -X POST http://localhost:8080/argument-graph \
  -H 'content-type: application/json' -d '{"dilemmaId":"delegation","seed":2406}' \
  | jq -r .mermaid | head -40

# Error cases.
curl -s -X POST http://localhost:8080/deliberate \
  -H 'content-type: application/json' -d '{"advisorIds":["aegis"]}'; echo
# -> {"detail":"Provide one of `dilemmaId` or `dilemma`."}          422

curl -s -X POST http://localhost:8080/deliberate \
  -H 'content-type: application/json' -d '{"dilemmaId":"delegation","advisors":[]}'; echo
# -> {"detail":"`advisors` was supplied but is empty."}            422

curl -s -X POST http://localhost:8080/deliberate \
  -H 'content-type: application/json' -d '{"dilemmaId":"delegation","dilemma":{"id":"x"}}'; echo
# -> {"detail":"Provide either `dilemmaId` or `dilemma`, not both."} 422

curl -s -X POST http://localhost:8080/deliberate \
  -H 'content-type: application/json' -d '{"dilemmaId":"nope"}'; echo
# -> {"detail":"Unknown dilemma `nope`. The fixture court has: delegation, harvest."}  422
```

**Error bodies are `{"detail": "..."}`, not `{"error": "..."}`.** The Next app uses
`error`. FastAPI raises `HTTPException(status_code=422, detail=str(error))` for the
`ValueError`s raised by `resolve_dilemma` / `resolve_advisors`.

### Error message quality

The resolvers name the known ids:

```
Unknown dilemma `nope`. The fixture court has: delegation, harvest.
Unknown advisor `kant`. The fixture court has: aegis, meridian, quill, vessel.
```

That is the right behaviour for a discovery endpoint, and it is why `kant` fails
here — this service has no Kant. Use `/fixtures` first.

---

## `POST /argument-graph`

Build the move/attack DAG for a sitting and report its structure.

Two modes, chosen by whether `moves` is supplied.

### Mode 1 — no `moves`: graph the deliberation

```py
class ArgumentGraphRequest(Contract):
    dilemma_id: str | None = None
    advisor_ids: list[str] | None = None
    seed: int = 0
    rounds: int = 3
    moves: list[ArgumentMove] | None = None
    advisor_of: dict[str, str] | None = None
    targets: dict[str, list[str]] | None = None
```

The graph is built from the deliberation itself: objections attack the premise of the
advisor they answer, appeals attack the premise of whoever outranked them, and the
settling synthesis supports the premise it came from.

### Mode 2 — with `moves`: graph a hand-built debate

This is the path for exploring an arbitrary argument, **cycles included**. `models.py`
and `main.py` are explicit: *"the engine reports them rather than refusing to draw
them."*

Target conventions, from `deliberation.py`'s `_TARGET_PREFIXES`:

| Convention | Example |
| --- | --- |
| Explicit prefix | `"attack:aegis.duty"` |
| Longer prefix first | `"objection:..."`, then `"vs:..."` |
| Arrow | `"aegis.duty->meridian.tally"` |
| `appliesTo` naming another move | the entry's `appliesTo` array |
| Explicit map | the request's `targets` field, which overrides everything |

### Response

`ArgumentGraphResponse`:

```jsonc
{
  "dilemmaId": "delegation",
  "nodes":  [ /* GraphNode[] */ ],
  "edges":  [ { "from": "aegis.against-outcome", "to": "meridian.tally", "kind": "attacks" } ],
  "dangling": [],
  "order":  [ "meridian.tally", "aegis.against-outcome", "…" ],
  "cycles": [],
  "wellFormed": true,
  "problems": [],
  "inheritedWeight": { "meridian.tally": 0.95, "aegis.against-outcome": 0.88 },
  "mermaid": "graph LR\n  …"
}
```

| Field | Notes |
| --- | --- |
| `nodes` | `GraphNode`: `{id, moveId, advisorId, kind, claim, support, weight, leansOn, targets}` |
| `edges` | `GraphEdge`: `from` is `from_` in Python and `from` on the wire — `Field(alias="from", serialization_alias="from")`, because `from` is a keyword |
| `dangling` | Target ids matching no node. **Surfaced, not thrown** |
| `order` | Topological order of the acyclic part |
| `cycles` | Each cycle canonicalised to the lexicographically smallest rotation, so `a→b→a` and `b→a→b` are one finding |
| `wellFormed` / `problems` | From `is_well_formed` |
| `inheritedWeight` | `dict[str, float]` — standing propagated with decay |
| `mermaid` | Renderable diagram text |

`INHERITANCE = 0.4`, from `deliberation.py`:

> 0.4 rather than 1 because influence must decay down a chain: if every objection
> transferred its full weight, a long argument would compound into certainty that the
> reasoning has not earned.

### curl

```bash
# Graph the default fixture sitting.
curl -s -X POST http://localhost:8080/argument-graph \
  -H 'content-type: application/json' -d '{"dilemmaId":"delegation","seed":2406}' \
  | jq '{wellFormed, cycles, dangling, edgeCount: (.edges | length)}'

# A hand-built debate with an explicit cycle, to see it reported rather than refused.
curl -s -X POST http://localhost:8080/argument-graph \
  -H 'content-type: application/json' -d '{
    "moves": [
      { "id": "x.p1", "kind": "premise", "claim": "First claim, long enough.",
        "support": "Support for the first claim.", "weight": 0.8,
        "leansOn": ["rights"], "appliesTo": ["x.o1"] },
      { "id": "x.o1", "kind": "objection", "claim": "Second claim, long enough.",
        "support": "Support for the second claim.", "weight": 0.7,
        "leansOn": ["welfare"], "appliesTo": ["x.p1"] }
    ],
    "advisorOf": { "x.p1": "quill", "x.o1": "vessel" }
  }' | jq '{cycles, wellFormed, problems}'

# A dangling target, to see it surfaced.
curl -s -X POST http://localhost:8080/argument-graph \
  -H 'content-type: application/json' -d '{
    "moves": [
      { "id": "x.p1", "kind": "premise", "claim": "A claim that is long enough.",
        "support": "Its support.", "weight": 0.8,
        "leansOn": ["rights"], "appliesTo": ["does.not.exist"] }
    ]
  }' | jq '{dangling, wellFormed, problems}'
```

---

## Cross-runtime parity

Three runtimes declare the same contract independently:

| Runtime | Declaration | Where |
| --- | --- | --- |
| TypeScript | `AXIOM_KEYS = [...] as const` | `packages/seed/src/types.ts` |
| Python | `AXIOM_KEYS: tuple[AxiomKey, ...] = (...)` | `services/agents/app/models.py` |
| Rust | a fixed-order array constant | `crates/engine/src/axiom.rs` — **planned, see [`rust-crate.md`](rust-crate.md)** |

The Python declaration carries the strongest statement of why:

> The canonical axis order. Every dot product, every ranking and every rendered trace
> walks the axes in exactly this order, so it is a contract and not a convenience:
> reordering it would silently change every total in the product.

**The PRNG is a port, not a reimplementation.** From `deliberation.py`:

> The PRNG here is a port of the TypeScript `mulberry32` in
> `packages/core/src/util/rng.ts`, down to the FNV-1a string hash over UTF-16 code
> units, so a verdict rendered by the website and a verdict returned by this service
> are the same verdict.

The caveat, from `deliberation.py`'s own comment on UTF-16 folding: ids containing
astral-plane characters must fold identically in both runtimes. There is a test for
this. If you add an advisor id with an emoji or a character outside the BMP, that test
is the thing that will catch you.

## The deliberate divergences

Not bugs. Each is documented in the source.

| Divergence | Why |
| --- | --- |
| 4 advisors, 2 dilemmas, 2 kingdoms instead of 28 / 20 / 12 | "A mirror that cannot start without the TypeScript seed package compiled and shipped alongside it is not a mirror, it is a deployment" |
| Fixtures are *not* copies of the website dataset | "a change to the seed would silently change this service's contract; here every change is visible in a diff of this file" |
| `seed` defaults to `0` | The website's default is `SEED = 2406`. A caller that omits `seed` here gets a different verdict from the same court. **Always pass `seed` explicitly.** |
| `/healthz` has no timestamp; the web `/api/healthz` does | Byte-for-byte testability |
| Richer `TraceEntry` (`normalized`, `weightSum`, `score`) | "Both are shipped so neither consumer has to recompute one" |
| `vote` model, not `ballot` naming | Python's own vocabulary; the wire fields are `ballots`, matching the TS result |

## Testing

```bash
pip install -e "services/agents[dev]"
pytest services/agents/tests -q
```

Three test files: `test_api.py` (the four endpoints), `test_axioms.py` (the six-axis
calculus), `test_deliberation.py` (the council engine). Plus `conftest.py`.

## Deployment

Render declares it as a **`worker`**, not a second `web` service (`render.yaml`):

> Declared as a `worker` (background service) rather than a second `web` service: it
> serves HTTP on request but holds no inbound traffic of its own, and Render gives
> workers the longer start allowance this service needs.

`docker-compose.yml` gives it its own image at `./services/agents/Dockerfile`, binds
`AGENTS_HOST=0.0.0.0` so `web` can reach it, and health-checks
`http://127.0.0.1:8080/healthz` with a stdlib `urllib.request` call. `web` declares
`depends_on: agents: condition: service_healthy`.

And, from the bottom of `docker-compose.yml`:

> The site is FULLY FUNCTIONAL without the `agents` service. Deliberation itself is
> computed client-side by packages/core […] If it is down, the atlas degrades to local
> deliberation; it does not go dark.

## Related

- [`rust-crate.md`](rust-crate.md) — the third implementation
- [`rest-api.md`](rest-api.md) — the Next app's three routes, and how they differ
- [`core-modules.md`](core-modules.md) — the TypeScript functions this mirrors
- [`../guides/deploying.md`](../guides/deploying.md) — the five deployment targets
- [ADR 0009](../adr/0009-optional-python-agents-service.md) — why it is optional