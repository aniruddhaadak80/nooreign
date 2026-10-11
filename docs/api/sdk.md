# SDK

What you get: the intended shape of `@repo/sdk`, the manifest that exists, what is
missing, and the contract a client has to honour today.

---

## Status, stated up front

**`packages/sdk/src/` does not exist.** The package manifest, the tsconfig, the eslint
config, the vitest config and `node_modules/.bin` are all present. The source is not.

What exists:

```
packages/sdk/
├── eslint.config.mjs
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── node_modules/.bin/        # tsc, vitest — links, not sources
```

This is what `packages/sdk/package.json` declares:

```json
{
  "name": "@repo/sdk",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "description": "Typed clients for the Nooreign web API and the Python deliberation service",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./openapi": "./openapi.json"
  },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "lint": "eslint src --max-warnings=0",
    "test": "vitest run"
  },
  "dependencies": {
    "@repo/core": "workspace:*",
    "@repo/seed": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  }
}
```

Four consequences follow from reading that manifest literally:

1. **`main` points at `./src/index.ts`, which does not exist.** Any workspace package
   that imports `@repo/sdk` fails to resolve. Today none does —
   `apps/web/next.config.ts` lists it in `transpilePackages`, but no route imports it.
2. **`./openapi` maps to `./openapi.json`, which does not exist either.** ADR the
   architecture guide expects it (`docs/guides/architecture.md` → "A text or technique
   over HTTP → `packages/sdk/src/` → `packages/sdk/openapi.json`").
3. **`lint` runs `eslint src`** and `typecheck` runs `tsc --noEmit` over a config with
   no inputs. Both may pass vacuously or fail on the missing directory; **neither has
   been observed here.**
4. **`test` is `vitest run`** over `vitest.config.ts`, with no test files.

`turbo test` runs `test` in every package that defines it, and `@repo/sdk` defines it.

## The dependency rule

`docs/guides/architecture.md` states the contract for this package:

| Package | May import | May not |
| --- | --- | --- |
| `@repo/sdk` | `@repo/core`, `@repo/seed` | `next`, `fetch` at import time |

**`fetch` at import time is the specific prohibition.** Not fetch entirely — fetch at
module scope. A client must be constructible in a Node test runner and in a browser
without touching the network until a method is called. `services/agents` is optional at
runtime, so a client that dials at import would make the whole atlas depend on a
service it is documented not to need.

`@repo/core` and `@repo/seed` are declared and not `zod`, so the SDK consumes types and
does not re-validate them. If it needs validation, that is a reason to add `zod`.

## What the SDK is for

Three jobs, in priority order.

### 1. Typed clients for the two HTTP surfaces

There are **two** surfaces, and they are not interchangeable:

| Surface | Endpoints | Documented in |
| --- | --- | --- |
| Next app | `/api/healthz`, `/api/deliberate`, `/api/experiment` | [`rest-api.md`](rest-api.md) |
| Python service | `/healthz`, `/fixtures`, `/deliberate`, `/argument-graph` | [`python-service.md`](python-service.md) |

They share a path name (`/deliberate`) and nothing else: different fixtures, different
advisors, different response shapes, different error bodies (`{"error"}` versus
`{"detail"}`), and the Python default seed is `0` while the web default is `2406`. A
client that treats them as one is a bug waiting for a reader.

```ts
// The shape this must take, per the import rule above.
export interface NooreignClientOptions {
  /** Absolute base URL. Defaults to same-origin. */
  baseUrl?: string;
  /** Absolute base URL of the Python service. Omit it and the client works without one. */
  serviceUrl?: string;
  fetch?: typeof fetch;   // injected, so tests pass a stub
}
```

`fetch` is **injected**, not imported from a global. That is how the package satisfies
"no `fetch` at import time" and how a test can run without a server.

### 2. Types re-exported from the two runtimes

The response types are not duplicated. `DeliberateResponse` should be the TS
`CouncilResult` plus the four `ConveneResponse` fields, imported from `@repo/core` and
re-declared rather than hand-written:

```ts
import type { CouncilResult } from "@repo/core";

export interface ConveneResponse extends CouncilResult {
  dilemmaTitle: string;
  optionLabels: { id: string; label: string }[];
  advisors: { id: string; name: string; kingdomId: string; glyph: string }[];
  kingdomLabels: Record<string, string>;
}
```

That declaration is **copied verbatim from `apps/web/src/lib/convene.ts`**, and that is
the correct source. If the SDK hand-writes its own version of `CouncilResult`, it
becomes a third contract that nothing validates.

**The Python wire types have no TypeScript source.** `services/agents/app/models.py`
is the only declaration. They must be written by hand, and `Conventions` says that is
acceptable only because the service is optional and the shapes are documented.

### 3. The OpenAPI document

`"./openapi": "./openapi.json"` promises an OpenAPI file. The source for it is
`services/agents/app/models.py`, and `models.py` states why it is shaped the way it is:

> The web app, the Rust reference implementation and this service all have to agree on
> the same six axes, the same four move kinds and the same trace shape, and the cheapest
> way to guarantee that is a single declarative source that a validator, an OpenAPI
> document and a test all read from.

FastAPI generates `/openapi.json` at runtime from those pydantic models. A committed
`openapi.json` would be that document, checked in so consumers do not have to run the
service to read the contract. Nothing generates it today, so a committed copy would
drift — which is why the architecture guide lists it as something a change *updates*
rather than something a script produces.

## The optional-service contract

The SDK's most important behavioural rule, from
[ADR 0009](../adr/0009-optional-python-agents-service.md) and
`docker-compose.yml`:

> If it is down, the atlas degrades to local deliberation; it does not go dark.

So:

- `serviceUrl` is optional. Omitted → every service method throws a typed
  `ServiceNotConfiguredError` rather than returning `undefined`.
- No method may be on the critical path of a render.
- A network failure against the service is an expected condition, not an exception
  path. The Python service's own resolver functions raise `ValueError` for expected
  problems and `main.py` converts those to `422` — the same discipline applies here.

## Errors

Two surfaces, two error shapes, and a client must not blur them:

| Source | Body | Status |
| --- | --- | --- |
| Next app | `{"error": "path: message; …"}` | `400`, `404`, `422` |
| Python service | `{"detail": "..."}` | `422` (and FastAPI's own `422` for schema failures) |

A single `NooreignError` type with a `surface` discriminator is the right shape:

```ts
export type Surface = "web" | "agents";

export class NooreignError extends Error {
  readonly surface: Surface;
  readonly status: number;
  readonly issues: string[];   // the semicolon-joined `path: message` list
}
```

An empty `issues` for a `400` (`"request body must be JSON"` is the whole body) is
correct, not a bug.

## What to build first

In order, each one independently useful:

1. **`deliberate()`** against the Next app. One method, the one thing anyone wants.
2. **`sweep()`** against `/api/experiment`.
3. **`health()`** against `/api/healthz`. The `datasets` field is `ATLAS_STATS` and a
   client can assert against it.
4. **`agentsDeliberate()`** against the Python service, with the fixture ids documented
   in the JSDoc so a caller does not discover at runtime that there is no Kant there.
5. **`fixtures()`** against `/fixtures`, so ids are discoverable rather than hard-coded.
6. The OpenAPI document.

Do **not** start with the Python service. It is optional, it is not running for most
users, and the web surface is the one a reader actually hits.

## Testing it without a server

`vitest run` is the declared test command and CI runs it. The package's dependency rule
— `fetch` injected, never at import — is what makes this possible:

```ts
// Pass a stub; no server, no network, no port.
const client = createNooreignClient({
  baseUrl: "http://localhost:3000",
  fetch: async () => new Response(JSON.stringify(fixture), { status: 200 }),
});
```

Every method should have at least one such test, plus one for each documented error
status. Four statuses and one `has a test` per method is a small, achievable bar.

## Related

- [`rest-api.md`](rest-api.md) — the Next app's three routes, with curl
- [`python-service.md`](python-service.md) — the FastAPI service's four routes
- [`../guides/architecture.md`](../guides/architecture.md) — the dependency table and
  where a wire type belongs
- [ADR 0009](../adr/0009-optional-python-agents-service.md) — why the Python
  service is optional
- [`../guides/contributing-guide.md`](../guides/contributing-guide.md) — the
  contribution path if this is the package you want to fill in