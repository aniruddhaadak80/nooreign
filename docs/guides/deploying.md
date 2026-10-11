# Deploying

What you get: five deployment targets with their real configuration, the healthcheck
contract, the one variable that must be set at build time, and the order to do things
in.

---

## Before anything: what "deploy" means here

Nooreign is a static-ish Next.js app with **no database, no session, no API key and no
model call**. `docker-compose.yml` says why in eight lines:

> There is NO DATABASE, and that is a design decision rather than an omission. The
> entire atlas … is a committed, versioned TypeScript seed (packages/seed), baked in at
> build time. A deliberation is a pure function of (seed, dilemmaId, optionId) running
> in the browser. There is nothing to persist, nothing to migrate, and no user data to
> lose.

Three consequences for every target:

1. **Scaling is a CDN problem, not an application problem.** Most of the site is
   statically generated; `/council` is the only dynamic route.
2. **The dataset is compile-time.** Changing the seed means a rebuild, not a config
   change.
3. **The Python service is optional.** Leave `NOOREIGN_SERVICE_URL` empty and nothing
   breaks. `fly.toml` calls the reasoning explicitly: *"EMPTY by default. The atlas is
   fully functional without the Python deliberation service."*

## The build

One command, everywhere:

```bash
bun install --frozen-lockfile
bun run build            # turbo build
```

`--frozen-lockfile` is not optional in CI. `.github/workflows/ci.yml`:

> CI must never resolve a new version. If the lockfile is stale relative to
> package.json, the job fails loudly instead of silently installing something different
> from what was reviewed.

`apps/web/next.config.ts` sets `output: "standalone"` only when
`NOOREIGN_STANDALONE === "1"`, and the `Dockerfile` sets it in the builder stage:

> Opt in to Next's standalone output here rather than in next.config.ts: the traced
> bundle is assembled with symlinks, which Windows refuses to create for a
> non-elevated user. Inside the Linux builder that is a non-issue.

So a plain `bun run build` on your laptop does **not** produce standalone output. That
is deliberate and it only matters for Docker.

## The healthcheck

Every target uses the same endpoint, and it is a real HTTP check rather than a process
check.

`GET /api/healthz` returns `status`, `service`, `seed`, `deterministic`, `datasets`
(the `ATLAS_STATS` manifest) and a `timestamp`. The `Dockerfile`'s HEALTHCHECK:

> Exercises the real HTTP surface rather than a process check, so a server that boots
> but cannot serve is still reported unhealthy.

```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD bun --eval "const r = await fetch('http://127.0.0.1:3000/api/healthz'); if (!r.ok) process.exit(1)"
```

`fly.toml` makes the reason for HTTP explicit:

> Fly's health checks are part of routing: a machine failing this is removed from the
> load balancer, so this must test the HTTP surface (/api/healthz), not just that the
> process is alive.

**If you deploy the Python service**, its healthcheck is `GET /healthz` on port 8080 —
the same path name, a different service. `docker-compose.yml` uses stdlib `urllib` for
the container case.

---

## Target 1: Docker (self-hosted, and what everything else runs)

The three-stage `Dockerfile`:

| Stage | Base | What it does |
| --- | --- | --- |
| `deps` | `oven/bun:1.3` | Copies every workspace `package.json` and runs `bun install --frozen-lockfile` |
| `builder` | `oven/bun:1.3` | `bun run build` with `NOOREIGN_STANDALONE=1` |
| `runner` | `oven/bun:1-slim` | Copies `apps/web/.next/standalone` plus `.next/static` and `public`, runs as `bun`, `CMD ["bun", "apps/web/server.js"]` |

Two lines are easy to get wrong when modifying it:

```dockerfile
# .next/static and public are NOT bundled into standalone by design — Next
# expects them to be copied in, or CSS/JS 404 in production.
COPY --from=builder --chown=bun:bun /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=bun:bun /repo/apps/web/public ./apps/web/public
```

And the entrypoint path:

```dockerfile
# The standalone output nests the app under a path mirroring the repo layout, so
# the server entrypoint lives at apps/web/server.js inside it.
CMD ["bun", "apps/web/server.js"]
```

### Build and run

```bash
docker build -t nooreign/web:latest .

# The one build-time variable.
docker build -t nooreign/web:latest --build-arg NEXT_PUBLIC_SITE_URL=https://example.com .

docker run --rm -p 3000:3000 nooreign/web:latest
curl -s http://localhost:3000/api/healthz | jq
```

### The full stack with compose

```bash
docker compose up --build
# web   → http://localhost:3000
# agents → http://localhost:8080/healthz
```

`docker-compose.yml` declares `web.depends_on.agents.condition: service_healthy`, so
`web` waits for the Python service to pass `/healthz` before starting. To run the atlas
**without** the Python service, drop that `depends_on` block and leave
`NOOREIGN_SERVICE_URL` empty.

`NEXT_PUBLIC_SITE_URL` is passed as a **build arg** in compose, with the reason inline:
*"Inlined into the client bundle at build time, so it must be present at BUILD time, not
just at run time."*

---

## Target 2: Vercel

`vercel.json` is committed and declarative:

```json
{
  "framework": "nextjs",
  "rootDirectory": "apps/web",
  "installCommand": "bun install --frozen-lockfile",
  "buildCommand": "bun run build",
  "outputDirectory": ".next",
  "regions": ["iad1", "bom1"],
  "ignoreCommand": "node -e \"['services','crates','docs'].forEach((d) => console.log(d + '/'))\"",
  "headers": [ /* nosniff, SAMEORIGIN, strict-origin-when-cross-origin */ ]
}
```

Two regions: `iad1` (Virginia) and `bom1` (Mumbai). `bom1` is there for the reader base;
the atlas has no database, so region choice is purely latency.

`ignoreCommand` excludes `services/`, `crates/` and `docs/` from the upload. The Python
service cannot be deployed to Vercel this way.

### CI deploy

`.github/workflows/deploy-vercel.yml`, on push to `main`:

| Step | Command |
| --- | --- |
| Pull project config and env | `vercel pull --yes --environment=production --token=$VERCEL_TOKEN` |
| Build | `vercel build --prod --token=$VERCEL_TOKEN` |
| Deploy | `vercel deploy --prebuilt --prod --token=$VERCEL_TOKEN` |

**Prebuilt, not build-in-Vercel**, with the reason stated in the workflow:

> Build here and deploy the prebuilt output, so the artifact we ship is exactly the
> artifact we tested — no second, differently-configured build inside the Vercel
> builder.

Three GitHub secrets, never committed: `VERCEL_TOKEN`, `VERCEL_ORG_ID`,
`VERCEL_PROJECT_ID`. `.env.example` has empty slots for all three.

### Required environment

| Variable | Where | Why |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | build time, inlined into the client bundle | Canonical origin for metadata, canonical URLs and the sitemap |
| `NOOREIGN_SERVICE_URL` | runtime, optional | Leave empty |
| `NEXT_PUBLIC_NOOREIGN_SERVICE_URL` | build time, optional | Leave empty |
| `NEXT_TELEMETRY_DISABLED=1` | runtime | The atlas must not phone home |

---

## Target 3: Fly.io

`fly.toml` builds the **same Dockerfile CI builds**, so the machine runs exactly the
image that was tested.

```bash
fly launch --copy-config --no-deploy
fly secrets set NOOREIGN_SERVICE_URL=...   # only if the agents service is up
fly deploy
```

Configuration highlights:

| Setting | Value | Why |
| --- | --- | --- |
| `primary_region` | `bom` | *"The atlas is read-heavy, static-ish and has no persistent state, so a single small region is enough — and bom keeps round-trip latency low for the largest share of readers"* |
| `min_machines_running` | `0` | *"a philosophical atlas is not a trading desk, and a stopped machine costs nothing while the content is fully static"* |
| `auto_stop_machines` | `stop` | Same reasoning |
| `HOSTNAME` | `0.0.0.0` | *"Required by the standalone server; 0.0.0.0 or the proxy cannot reach it"* |
| `[[vm]]` | `shared-cpu-1x`, `512mb`, `1 cpu` | Six multiplications are not a bottleneck |
| `http_service.concurrency` | soft 200, hard 250 | — |

The `[[http_service.checks]]` block is the `/api/healthz` HTTP check above.

**Add a second region only if origin health demands it.** `fly.toml` is explicit:
*"there is no database to be close to."*

---

## Target 4: Render

`render.yaml` is a blueprint. Render reads it from the repo root
(Infrastructure → Blueprints).

Two services:

| Service | Type | Runtime | Healthcheck |
| --- | --- | --- | --- |
| `nooreign-web` | `web`, `starter` | `docker`, `./Dockerfile` | `/api/healthz` |
| `nooreign-agents` | `worker`, `starter` | `python`, `rootDir: services/agents` | `/healthz` |

**The agents service is a `worker`, not a second `web`**, and the reason is in the file:

> Declared as a `worker` (background service) rather than a second `web` service: it
> serves HTTP on request but holds no inbound traffic of its own, and Render gives
> workers the longer start allowance this service needs. It can be swapped out or left
> sleeping without affecting the atlas.

`nooreign-web` env: `NODE_ENV=production`, `NEXT_TELEMETRY_DISABLED=1`,
`NEXT_PUBLIC_SITE_URL` (`sync: false`, set in the dashboard), `NOOREIGN_SERVICE_URL` and
`NEXT_PUBLIC_NOOREIGN_SERVICE_URL` both empty by default.

`nooreign-agents` starts with `uvicorn app.main:app --host 0.0.0.0 --port 8080` after
`pip install -e ".[dev]"`, and needs `PYTHONPATH=/opt/render/project/src/services/agents`
and `PYTHONUNBUFFERED=1`.

---

## Target 5: Railway

`railway.json` is the smallest of the five:

```json
{
  "build": { "builder": "NIXPACKS", "buildCommand": "bun install --frozen-lockfile && bun run build" },
  "deploy": {
    "startCommand": "bun run start",
    "healthcheckPath": "/api/healthz",
    "healthcheckTimeout": 30,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10,
    "numReplicas": 1
  }
}
```

`bun run start` is `turbo start`, which runs `start` in `apps/web`. **One replica is
correct** — there is no mutable state, so horizontal scaling buys nothing and costs
money.

---

## Comparison

| | Vercel | Docker | Fly | Render | Railway |
| --- | --- | --- | --- | --- | --- |
| Build | `vercel build` | `Dockerfile` | `Dockerfile` | `Dockerfile` | Nixpacks |
| Root | `apps/web` | repo | repo | repo | repo |
| Port | managed | `3000` | `3000` | managed | managed |
| Scale to zero | yes | n/a | `min_machines_running = 0` | worker sleeps | no |
| Healthcheck | managed | `HEALTHCHECK` | `[[http_service.checks]]` | `healthCheckPath` | `healthcheckPath` |
| Python service | **not deployed** | via compose | separate Fly app | second service | separate service |
| Deploy trigger | push to `main` | manual | `fly deploy` | `autoDeploy` | dashboard |

---

## Environment reference

From `.env.example`. Every value is a safe default or empty.

| Variable | Default | Used by |
| --- | --- | --- |
| `NODE_ENV` | `development` | Next |
| `NEXT_PUBLIC_SITE_URL` | `https://nooreign.dev` | **build time** |
| `NOOREIGN_SERVICE_URL` | *(empty)* | Next → Python service, runtime |
| `NEXT_PUBLIC_NOOREIGN_SERVICE_URL` | *(empty)* | browser → Python service, CORS only |
| `PYTHON_PORT` | `8080` | Python service |
| `AGENTS_HOST` | `127.0.0.1` | Python service bind interface. `0.0.0.0` in a container |
| `AGENTS_PORT` | `8080` | Python service bind port |
| `RUST_LOG` | `info` | `crates/engine` only. ADR 0008 calls it *"a deliberate marker that this crate is a different world"* |
| `CI` | `false` | Disable dev-only affordances |
| `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `VERCEL_TOKEN` | *(empty)* | CI only, from secrets |
| `GITHUB_TOKEN` | *(empty)* | Release automation |
| `NOOREIGN_CORS_ORIGINS` | *(unset)* | Python service only, not in `.env.example` |

```bash
cp .env.example .env.local
```

`.env*` files are git-ignored; the template is committed and holds no secrets. CI has a
secrets scan that greps full history for credential-shaped strings.

---

## Pre-deploy checklist

```bash
bun run typecheck
bun run lint
bun run test
bun run build
# or:
bun run verify
```

Then, in order:

1. **Regenerate committed assets** if you touched anything that renders one:

   ```bash
   bun run assets
   bun run diagrams
   git status        # anything modified here must be committed, or asset-check fails
   ```

2. **Confirm the healthcheck** locally:

   ```bash
   bun run build && bun run start
   curl -s http://localhost:3000/api/healthz | jq
   ```

3. **Set `NEXT_PUBLIC_SITE_URL`** to the real origin. It is inlined at build time, so
   setting it after the build does nothing.

4. **Leave `NOOREIGN_SERVICE_URL` empty** unless you are deploying the Python service
   too. The atlas does not need it and setting it introduces a dependency you have not
   tested.

5. **If you changed the seed**, grep for the literals before you push — see
   [`determinism-and-seeds.md`](determinism-and-seeds.md):

   ```bash
   rg -n '2406' packages/ apps/ .github/ docs/
   ```

6. **Check the CI gates you will hit**: `typecheck`, `lint`, `test`, `build` on
   ubuntu **and** windows, then Playwright, the LOC floor, pytest, ruff, cargo, and
   the secrets scan. Full list in [`../runbooks/release.md`](../runbooks/release.md).

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Container boots, every route 404s | `.next/static` or `public` not copied into the runner | Check both `COPY` lines in the `Dockerfile` |
| Fly machine unhealthy | `HOSTNAME` not `0.0.0.0` | Set it; the proxy cannot reach loopback |
| Wrong canonical URL / OG image | `NEXT_PUBLIC_SITE_URL` set after the build | Set it at build time |
| `502` from a proxy, container healthy | `PORT` mismatch | `PORT=3000` and `HOSTNAME=0.0.0.0` |
| Python service reachable but the site ignores it | `NOOREIGN_SERVICE_URL` set at runtime on a build-time-only var | It is a runtime var; check it is set on the **server**, not only in the build env |
| CSS missing in the Docker image | `public/` not copied | See the `Dockerfile` comment |

## Related

- [`../runbooks/release.md`](../runbooks/release.md) — the tag, CI and artefact flow
- [`../runbooks/incident-triage.md`](../runbooks/incident-triage.md) — when the deployed
  site misbehaves
- [`../api/python-service.md`](../api/python-service.md) — the optional service
- [`../api/rest-api.md`](../api/rest-api.md) — `/api/healthz` in full
- [ADR 0009](../adr/0009-optional-python-agents-service.md) — why the Python
  service is optional at runtime
- [`../diagrams/deploy-pipeline.mmd`](../diagrams/deploy-pipeline.mmd) — the pipeline as
  a diagram