# Deploying to Fly.io

What you get: the exact command sequence for putting the atlas on a Fly machine, what
Fly needs from this repository specifically, the one mistake that happens first, and how
to check the deployment from the outside.

`docs/guides/deploying.md` lists all five targets side by side. This is the long
version of the Fly row.

---

## What Fly needs from this repository

| Thing | Value | Why |
| --- | --- | --- |
| Build context | the **repository root** | the `Dockerfile` sits at the root and copies every workspace `package.json` before it installs anything |
| Builder | `Dockerfile` (`[build] dockerfile = "Dockerfile"`) | the machine runs exactly the image CI built — no second, differently-configured build |
| Build command | `bun run build`, inside the Dockerfile | `turbo build` over the Bun workspace; the runner needs neither `bun` nor the `next` CLI at runtime |
| Runtime port | `PORT=3000` and `HOSTNAME=0.0.0.0` (`[env]`) | required by the standalone server — the Fly proxy cannot reach loopback |
| Health check | `GET /api/healthz` on port 3000 (`[[http_service.checks]]`) | a machine failing this is removed from the load balancer, so it must test the HTTP surface, not the process |
| Region | `bom` (Mumbai) | the atlas is read-heavy and has no persistent state, so region choice is purely latency |
| Scale | `min_machines_running = 0`, `auto_stop_machines = "stop"` | *"a philosophical atlas is not a trading desk, and a stopped machine costs nothing while the content is fully static"* |

### The environment variables, and where each one has to be set

`fly.toml` declares the runtime set in `[env]`, and every one of them is a safe
default or empty:

```toml
[env]
  NODE_ENV = "production"
  NEXT_TELEMETRY_DISABLED = "1"
  HOSTNAME = "0.0.0.0"
  PORT = "3000"
  NOOREIGN_SERVICE_URL = ""          # leave empty
  NEXT_PUBLIC_NOOREIGN_SERVICE_URL = ""   # leave empty
```

There is exactly **one** variable that is not in that list, because it is not a
runtime variable at all:

| Variable | Set where | Why |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | **at build time** | it is inlined into the client bundle, so it is part of the image, not of the machine |

`fly.toml` has no `[build.args]` section, so out of the box the image is built
with an empty `NEXT_PUBLIC_SITE_URL`. Set it anyway — every target asks for it,
and it is the obvious home for the canonical origin — but do not assume that
setting it is what makes the deployed site claim your origin. It is not: the
canonical origin is a literal in the source. Read
[the second trap](#the-second-trap-the-canonical-origin-is-in-the-source-not-the-environment)
before you deploy.

`NOOREIGN_SERVICE_URL` and `NEXT_PUBLIC_NOOREIGN_SERVICE_URL` stay **empty**
unless you are deploying the optional Python service as well. Leaving them empty
is not a missing feature: deliberation is computed in the browser from
`packages/core`, and the Python service only adds live commentary. See
[ADR 0009](../adr/0009-optional-python-agents-service.md).

---

## The commands, in order

### 1. Install the CLI and sign in

```bash
curl -L https://fly.io/install.sh | sh
fly auth login
```

`fly auth login` opens a browser. `fly auth token` prints a token if you would
rather authenticate a CI job non-interactively.

### 2. Create the app from the committed `fly.toml`

```bash
fly launch --copy-config --no-deploy
```

`--copy-config` means *"use the `fly.toml` that is already in this repository"*
instead of letting Fly generate one — the committed file already encodes the
region, the health check and the scale-to-zero policy. `--no-deploy` stops
before the first build, so you can fix the app name first (see below).

### 3. Give the image its canonical origin

```bash
fly deploy --build-arg NEXT_PUBLIC_SITE_URL=https://<app>.fly.dev
```

`--build-arg` is passed straight through to the Docker build, and the
`Dockerfile` consumes it:

```dockerfile
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
```

The alternative is to commit a `[build.args]` section, which every subsequent
deploy then inherits:

```toml
[build]
  dockerfile = "Dockerfile"

  [build.args]
    NEXT_PUBLIC_SITE_URL = "https://<app>.fly.dev"
```

What that value actually controls is worth knowing before you rely on it: the
application does not read it. The canonical origin is a literal in the source.
See [the second trap](#the-second-trap-the-canonical-origin-is-in-the-source-not-the-environment).

### 4. Deploy

```bash
fly deploy
```

The first deploy builds the image on a Fly builder VM, so it takes minutes. The
build log is the same `bun install --frozen-lockfile` → `bun run build` the CI
runs, from the same `Dockerfile`.

### 5. Watch it come up

```bash
fly status
fly logs
fly machine list
```

`fly status` shows the machine in its region; `fly logs` streams the Next.js
server's stdout. The machine goes to `stopped` after `auto_stop_machines` kicks
in, which is correct and not a fault.

### 6. (Optional) the Python deliberation service

Only if you are deploying `services/agents` as well, and only once it is up:

```bash
fly secrets set NOOREIGN_SERVICE_URL=https://<agents-app>.fly.dev
```

Secrets are runtime values. Setting one triggers a restart of the machine, not
a rebuild.

---

## The one thing that goes wrong first

**`app = "nooreign"` is a global name on Fly, and it is almost certainly taken.**

`fly launch --copy-config --no-deploy` reads the `app` key straight out of the
committed `fly.toml`:

```toml
app = "nooreign"
```

Fly app names are unique across the whole platform, not per-account. If the name
is taken, step 2 fails immediately:

```
Error: could not create app "nooreign"
```

**How to recognise it:** the failure is at `fly launch`, before anything is
built, and the message names the app.

**The fix** is to give yourself a name and tell `fly.toml` about it:

```bash
fly apps create <your-app-name>
```

then edit the one line in `fly.toml`:

```toml
app = "<your-app-name>"
```

Keep the rest of the file untouched — the region, the health check and the
scale-to-zero policy are all correct as committed. Do **not** run `fly launch`
without `--copy-config`: that overwrites the committed configuration with a
generated one, and you lose every decision in the file.

### The second trap: the canonical origin is in the source, not the environment

`fly secrets set NEXT_PUBLIC_SITE_URL=https://…` is the intuitive command and
it does **nothing** for this variable. Fly's own documentation is explicit:

> Likewise, application environment variables and secrets are not available to
> builds.

The value would land in the machine's environment, long after the client bundle
was already built. `--build-arg` does reach the build — the `Dockerfile`
consumes it, as shown above — but **the application never reads it.** The
canonical origin is a literal, in four places:

| File | What it sets |
| --- | --- |
| `apps/web/src/app/layout.tsx` | `metadataBase` and `openGraph.url` |
| `apps/web/src/app/sitemap.ts` | `SITE` — every URL in the sitemap |
| `apps/web/src/app/robots.ts` | `SITE` — the sitemap URL in `robots.txt` |
| `apps/web/src/app/og/route.tsx` | the origin printed on the Open Graph image |

All four say `https://nooreign.vercel.app`.

**How to recognise it:** the site works, the health check is green, and every
canonical URL, Open Graph tag and sitemap entry still points at
`https://nooreign.vercel.app`. The sitemap is the fastest check, because it is
generated at build time from that same literal:

```bash
curl -s https://<app>.fly.dev/sitemap.xml | head -3
```

**The fix** is to change the four literals to your origin and redeploy. The
rule is written out in `sitemap.ts`: *"Canonical origin. Must agree with
`metadataBase` in `layout.tsx`."* `NEXT_PUBLIC_SITE_URL` is the variable that
ought to hold this value — wiring it up is a one-line change per file, and a
natural follow-up — but as the repository stands today the literal is the
source of truth, and a deployment guide that said otherwise would be lying to
you.

---

## Verify the deployment

### The healthcheck

```bash
curl -s https://<app>.fly.dev/api/healthz | jq
```

```json
{
  "status": "ok",
  "service": "nooreign-web",
  "seed": 2406,
  "deterministic": true,
  "datasets": { "...": "..." },
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```

Three fields are worth reading rather than skimming:

- `status` is `"ok"` — the route answered, so the machine is serving HTTP and
  not just running a process.
- `seed` is `2406` — the same seed the local build has. If it is anything else,
  the image is not the one you think it is.
- `datasets` is the `ATLAS_STATS` manifest — the counts of kingdoms, advisors,
  dilemmas, eras and techniques that were actually compiled into the bundle.

### A static route

`/kingdoms` is prerendered at build time (`○` in the Next build output), so it
is served by the image and never touches a database:

```bash
curl -sI https://<app>.fly.dev/kingdoms | head -1
```

`HTTP/2 200` is the answer. A `404` here with a working `/api/healthz` means
the standalone output is missing its static assets — the `COPY` lines for
`.next/static` and `public` in the `Dockerfile`.

### The canonical origin

```bash
curl -s https://<app>.fly.dev/sitemap.xml | head -3
curl -s https://<app>.fly.dev/kingdoms | grep -o 'rel="canonical"[^>]*' | head -1
```

Both should name your origin. If they name `https://nooreign.vercel.app`, the
image is fine and the *source* is not — see
[the second trap](#the-second-trap-the-canonical-origin-is-in-the-source-not-the-environment).

### The dynamic route

`/council` is server-rendered on demand (`ƒ` in the Next build output, unlike
`/kingdoms`'s `○`), so it is the honest end-to-end check: it exercises the
standalone server rather than a file the build wrote.

```bash
curl -sI https://<app>.fly.dev/council | head -1
```

`HTTP/2 200` is the answer. A `200` here means the workspace packages were
bundled correctly — they ship raw TypeScript and are compiled by
`transpilePackages`, not copied as `dist/`.

---

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `could not create app "nooreign"` | the app name is taken | `fly apps create <name>`, update `app` in `fly.toml` |
| Machine unhealthy, `502` from the proxy | `HOSTNAME` is not `0.0.0.0` | it is in `fly.toml`'s `[env]`; check you did not run `fly launch` without `--copy-config` |
| Canonical URL and OG tags point at `nooreign.vercel.app` | the origin is a literal in four source files, not the environment | edit `layout.tsx`, `sitemap.ts`, `robots.ts` and `og/route.tsx`, then redeploy |
| `NEXT_PUBLIC_SITE_URL` set as a secret has no effect | Fly does not expose secrets to builds | `fly deploy --build-arg NEXT_PUBLIC_SITE_URL=https://<app>.fly.dev` — and see the origin trap above |
| Every route 404s but `/api/healthz` is green | `.next/static` or `public` not copied into the runner | check both `COPY` lines in the `Dockerfile` |
| First request is slow, later ones are fast | `min_machines_running = 0` and `auto_stop_machines = "stop"` | expected; raise `min_machines_running` to `1` if you want a warm machine |
| `bun install` fails in the build | the lockfile is stale relative to `package.json` | `bun install` locally, commit `bun.lock`, deploy again |

---

## Related

- [`deploying.md`](deploying.md) — all five targets, the healthcheck contract, the
  environment reference
- [`determinism-and-seeds.md`](determinism-and-seeds.md) — why the deployed seed must
  be `2406`, and what to grep before you push
- [ADR 0009](../adr/0009-optional-python-agents-service.md) — why the Python service
  is optional at runtime
- [`../runbooks/release.md`](../runbooks/release.md) — the release flow
- [`../runbooks/incident-triage.md`](../runbooks/incident-triage.md) — when the
  deployed site misbehaves
