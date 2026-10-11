# services/agents — the deliberation service

The Nooreign council engine, headless.

**Read this first:** the website does not need this service. `apps/web` runs the same deliberation
in-process via `@repo/core`, and a cold clone of the repository is fully explorable with nothing
running. This service exists for three other reasons: batch work over thousands of sittings, callers
who would rather not install Node, and a second implementation that disagrees with the first when
someone changes a formula and forgets.

---

## Why a second implementation exists

The Python here is a deliberate mirror of `packages/core/src/council/`, not a wrapper around it. A
wrapper would be easier to keep correct and would prove nothing; a mirror that has to agree with a
separately-written reference is the thing that catches drift.

The two are pinned against each other in three places:

| Concern | TypeScript (reference) | Python (mirror) |
|---|---|---|
| PRNG | `packages/core/src/util/rng.ts` — `mulberry32` | `app/deliberation.py` — `Mulberry32` |
| Synthesis threshold | `consensus.ts` — `close = margin < CLOSE_MARGIN` | `app/deliberation.py` — same direction |
| Trace arithmetic | `Σ products === subtotal`, `total = subtotal + jitter` | identical invariant, asserted in tests |

The PRNG streams are asserted to be **bit-identical**: `mulberry32(0)` in TypeScript and `Mulberry32(0)`
here produce the same 64-bit doubles, which is what makes cross-language determinism meaningful rather
than merely plausible.

The Rust crate in `crates/engine` is the third implementation, used to generate parity fixtures.

## Running it

```bash
# From the repository root — the service is imported as services.agents.app.*
pip install -e "services/agents[dev]"
python -m uvicorn services.agents.app.main:app --reload --port 8080

# Or with Docker
docker compose up --build      # brings up web + agents together
```

Then:

```bash
curl -s localhost:8080/healthz | jq
curl -s localhost:8080/openapi.json | jq '.paths | keys'
```

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/healthz` | Liveness, the six axes, and the fixture court's size |
| `GET` | `/fixtures` | The self-contained court this service ships with |
| `POST` | `/deliberate` | Convene a court; returns the verdict **and every trace** |
| `POST` | `/argument-graph` | Build the move/attack DAG, with cycles and dangling targets surfaced |

### POST /deliberate

Either name a fixture dilemma or post one inline — never both.

```bash
curl -s -X POST localhost:8080/deliberate \
  -H 'content-type: application/json' \
  -d '{"dilemmaId":"delegation","advisorIds":["aegis","quill"],"seed":2406}' | jq '.decision'
```

```jsonc
{
  "dilemmaId": "delegation",
  "seed": 2406,
  "participating": 2,
  "decision": {
    "winnerId": "shared-turn",
    "winnerLabel": "The cordon turns between them",
    "margin": 0.2456,
    "confidence": 0.4976,
    "rationale": "The cordon turns between them carried 39.8% of the court's conviction…"
  },
  "ballots": [{ "optionId": "shared-turn", "total": 1.5092, "share": 0.398, "votes": 2 }],
  "traces": [
    {
      "advisorId": "aegis",
      "optionId": "hand-over",
      "round": 1,
      "contributions": [{ "axiom": "welfare", "weight": 0.165, "delta": 0.86, "product": 0.1419 }],
      "subtotal": 1.5922,
      "normalized": 0.4766,
      "jitter": 0.0146,
      "total": 1.6068,
      "score": 0.4912
    }
  ]
}
```

`total` and `score` differ on purpose: `total` is the raw dot product the trace documents, `score` is
the weight-normalised number the ballot ranks, and `jitter` moves both. Both are shipped so a consumer
never has to recompute one.

The wire format is **camelCase**, matching the website's `/api/deliberate`, so a client written against
one works against the other unchanged.

### POST /argument-graph

```bash
curl -s -X POST localhost:8080/argument-graph \
  -H 'content-type: application/json' \
  -d '{"dilemmaId":"delegation","seed":2406}' | jq '{wellFormed, mermaid}'
```

Move targets are passed as a separate `targets` map (`{"move-id": ["target-id"]}`), not as a field on
the move. Cycles and dangling targets are **reported, not thrown**: an argument aimed at a premise that
isn't there is a finding about the debate, not a server error.

## The fixtures are not the website's data

`app/seed.py` ships four advisors, two kingdoms and two dilemmas — invented ones (Aegis of the Citadel,
Meridian of the Orchard, Quill of the Commons, Vessel of the Wilds), not copies of the twelve kingdoms.

That is deliberate. If these were copies, a change to `packages/seed` would silently change this
service's contract; here every difference is visible in a diff of one file. Four advisors is enough to
exercise every branch — a kingdom-weighted bench, a lopsided profile, a dissent, an appeal, a cycle.

## Tests

```bash
python -m pytest services/agents/tests -q     # 173 tests
python -m ruff check services/agents
```

`tests/test_deliberation.py` covers the engine with hand-computed values (the Aegis trace is worked
through by hand in the test file's comments). `tests/test_api.py` covers the HTTP surface: routing,
validation, status codes, the camelCase contract, and the trace invariants over the wire.

## Configuration

| Variable | Default | Meaning |
|---|---|---|
| `AGENTS_HOST` | `0.0.0.0` | Bind address |
| `AGENTS_PORT` | `8080` | Port |
| `NOOREIGN_CORS_ORIGINS` | `*` in development | Comma-separated allowed origins |

There is no database, no API key and no outbound network call anywhere in this service.
