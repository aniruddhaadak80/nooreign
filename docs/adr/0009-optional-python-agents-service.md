# ADR 0009 — The Python `services/agents` service exists for headless deliberation and is optional at runtime

**Status:** Accepted (2026-05, planned implementation)
**Deciders:** core maintainers
**Applies to:** `services/agents/**`, `.env.example`, `turbo.json` (`globalEnv`), `Dockerfile`, `package.json` (`service:agents`)

---

## Context

The atlas is complete in a browser. `packages/core` is pure TypeScript, the data
is a compiled constant, and `runCouncil` needs nothing external. A reader who
clones the repo and runs `bun dev` gets every page.

So why does a Python service exist at all?

There are three genuine use cases, and one non-use-case that is worth stating
first.

**The non-use-case: performance.** Council deliberation is six multiplications per
advisor per option, twenty-eight times. It is not a workload that needs a
different process. Anyone proposing the Python service because "the engine is too
slow in the browser" has not measured, and if someone does measure and finds it
true, the answer is memoisation, not a second runtime.

**The genuine use cases:**

1. **Headless batch deliberation.** Generating the committed artefacts
   (`scripts/gen-assets.mjs`, `scripts/gen-diagrams.mjs`) runs thousands of
   councils. A Python service is a reasonable host for a long-running batch job
   with a progress log, and it is a *different* host from the request that serves
   a page.
2. **A network boundary for third-party consumers.** The `packages/sdk` client
   exists so that something outside this repository — a notebook, a teaching tool,
   a paper's appendix — can convene a court without embedding the seed data. That
   consumer needs an HTTP API, and a FastAPI service with an OpenAPI document is
   the cheapest way to produce a typed, documented one.
3. **Independent verification of the contracts.** `services/agents/app/models.py`
   re-declares every wire type in pydantic, with `extra="forbid"` so a typo in a
   request becomes a 422 rather than a silently ignored field:

```python
class Contract(BaseModel):
    """`populate_by_name` keeps Python callers able to use snake_case while the
    serialised form stays camelCase; `extra="forbid"` turns a typo in a request
    body into a 422 instead of a silently ignored field."""

    model_config = ConfigDict(
        alias_generator=to_camel, populate_by_name=True, extra="forbid"
    )
```

The reason this file matters is the comment at its top: the web app, the Rust
reference and this service all have to agree on the same six axes, the same four
move kinds and the same trace shape. A declarative contract that a validator, an
OpenAPI document and a test all read from is the cheapest way to keep them
agreeing.

**And the constraint that makes it all safe:** the app must be fully functional
with `NOOREIGN_SERVICE_URL` empty. `.env.example` says so explicitly, and that is
the standing acceptance test for this ADR.

## Decision

`services/agents` is a FastAPI application that is **optional at runtime and
required at review time.**

- **Optional at runtime.** `NOOREIGN_SERVICE_URL` ships empty. Every route in
  `apps/web` renders without it. There is no `await` on a service call anywhere in
  the render path, and there must never be one on a path that produces content.
- **Required at review time.** Its CI job is not optional:
  `pytest services/agents/tests -q` then `ruff check services/agents`. The
  contracts are reviewed even though the service is not depended on.
- **The contracts are the deliverable.** `app/models.py` is a single declarative
  source that a validator, an OpenAPI document and a test all read from. If a
  field changes there, the TypeScript types and the parity fixtures are expected to
  change with it, and `packages/sdk/openapi.json` is expected to be regenerated.
- **Three endpoints**, matching the three use cases: `/healthz`,
  `/deliberate`, `/argument-graph`. The argument-graph endpoint is the
  interesting one — `ArgumentGraphRequest` accepts explicit `moves`,
  `advisor_of` and `targets`, so a caller (or a test) can explore a hand-built
  debate including cycles, which the fixture court cannot produce.
- **Not in the Docker image.** The `Dockerfile` has three stages and the service is
  not among them. In a compose deployment it is a second container
  (`NOOREIGN_SERVICE_URL=http://agents:8080`), not a layer.
- **Not in the turbo task graph.** `turbo.json` lists
  `["NODE_ENV", "NOOREIGN_SERVICE_URL", "NEXT_PUBLIC_NOOREIGN_SERVICE_URL"]` in
  `globalEnv` so that a change to the URL invalidates the app's cache — but there
  is no `dev` or `build` task for the service, because it is not part of the build.

**Named trade-off:** maintaining a second implementation of the deliberation
arithmetic in Python is real work, and the honest justification is that it is a
*contract mirror plus an oracle*, not a production engine. If the Python engine is
ever allowed to become the source of truth for a verdict the website shows, this
ADR has been violated.

## Consequences

**Positive**

- A cold clone with no services running is complete. This is the property most
  worth protecting and it is now explicit in `.env.example`.
- The wire contract has exactly one authoritative declaration. Adding `weightSum`
  and `normalized` to `TraceEntry` (as `models.py` already does, alongside
  `total` and `score`) is a change in one file plus a regenerated OpenAPI document.
- `extra="forbid"` turns consumer typos into 422s instead of silently dropped
  fields, which is the failure mode that hurts most in an SDK.
- The camelCase alias generator means `JSON.parse` in the browser and
  `json.dumps` in Python speak the same wire format with no translation layer in
  any consumer.
- Third-party consumers get a typed, documented HTTP API without importing a
  private workspace package.
- The Python contracts act as a second review of the TypeScript types: if the two
  disagree about what a trace is, one of them is wrong and both get flagged.

**Negative**

- **Two implementations of the same arithmetic.** Divergence is possible and the
  parity fixtures are the only defence. This is the cost, accepted knowingly.
- **The service can rot unnoticed.** Nothing in the app calls it, so a broken
  endpoint fails CI only if a test covers it. Coverage discipline is required.
- **A second language in a TypeScript monorepo.** Every contributor now has to know
  what `pyproject.toml`, `ruff` and `pytest` are. Onboarding gets one step longer.
- **An OpenAPI document that can drift** from `app/models.py`. `packages/sdk` exports
  `./openapi` → `./openapi.json`, and nothing regenerates it automatically yet.
- **Deceptive ergonomics.** A reader who sees a `service:agents` script and a
  docker-compose hint may reasonably conclude the app needs it. The
  `.env.example` comment is the counterweight, and it has to be kept.

## Alternatives considered

| Option | Why rejected |
| --- | --- |
| **No Python service at all** | Genuinely defensible — nothing in the product needs it. Rejected because the headless-batch and third-party-consumer use cases are real, and because the pydantic contracts are a useful second review of the wire types. Revisit if neither use case is exercised. |
| **A Next.js Route Handler as the only API** | Would be the single implementation, and it would put a network round-trip on the path of a page that should be static. Rejected because the same reasoning that produced [ADR 0003](0003-no-database-typed-seed-data.md) applies: the static path must not depend on a server. |
| **Make the service required** | Would break the zero-credential, zero-service promise and turn every content PR into a two-service local setup. |
| **A Rust HTTP service instead of Python** | Better performance and one fewer high-level language. Rejected because the parity role is already taken by `crates/engine` ([ADR 0008](0008-rust-reference-engine-parity.md)); a second low-level implementation would add a second toolchain for no new capability. |
| **Generate the TypeScript types from the OpenAPI document** | The right long-term direction and it removes the drift. Deferred: it needs a generator in the build path, which conflicts with the no-build-step decision until the pipeline can afford one. |
