# Deploying to Render

What you get: the exact sequence for putting the atlas on Render, what Render needs
from this repository specifically, the one mistake that happens first, and how to
check the deployment from the outside.

`docs/guides/deploying.md` lists all five targets side by side. This is the long
version of the Render row.

---

## What Render needs from this repository

`render.yaml` sits at the repository root and is a **blueprint**: one file that
describes the infrastructure, so the dashboard and the file cannot disagree.
Render reads it when you create a Blueprint (Infrastructure → Blueprints) and on
every push that touches it.

| Thing | Value | Why |
| --- | --- | --- |
| Blueprint file | `render.yaml`, repository root | the default path Render looks for |
| Build context | the **repository root** (`dockerContext: .`) | the `Dockerfile` is at the root and copies every workspace `package.json` before it installs |
| Web runtime | `docker`, `./Dockerfile` | the same image Fly runs and the same image CI builds |
| Web healthcheck | `/api/healthz` | the real HTTP surface, not a process check |
| Python service | `worker`, `rootDir: services/agents` | optional — see below |

### The two services the blueprint creates

| Service | Type | Runtime | Healthcheck | Optional? |
| --- | --- | --- | --- | --- |
| `nooreign-web` | `web`, `starter` | `docker`, `./Dockerfile` | `/api/healthz` | no — this is the atlas |
| `nooreign-agents` | `worker`, `starter` | `python`, `rootDir: services/agents` | `/healthz` | **yes** |

The second one is declared as a `worker` rather than a second `web` service, and
the file says why:

> Declared as a `worker` (background service) rather than a second `web`
> service: it serves HTTP on request but holds no inbound traffic of its own, and
> Render gives workers the longer start allowance this service needs. It can be
> swapped out or left sleeping without affecting the atlas.

You can delete the `nooreign-agents` service from the blueprint entirely and the
atlas still deliberates — every verdict is computed client-side from seed
`2406`. See [ADR 0009](../adr/0009-optional-python-agents-service.md).

### The environment variables

```yaml
envVars:
  - key: NODE_ENV
    value: production
  - key: NEXT_TELEMETRY_DISABLED
    value: "1"
  - key: NEXT_PUBLIC_SITE_URL
    sync: false # set in the dashboard; inlined into the client bundle at build
  - key: NOOREIGN_SERVICE_URL
    value: "" # optional; blank disables live deliberation commentary
  - key: NEXT_PUBLIC_NOOREIGN_SERVICE_URL
    value: ""
```

`NOOREIGN_SERVICE_URL` and `NEXT_PUBLIC_NOOREIGN_SERVICE_URL` stay **empty** by
default. The atlas does not need the Python service, and setting the variable
introduces a dependency you have not tested.

`NEXT_PUBLIC_SITE_URL` is the one that is not a runtime variable. It is
inlined into the client bundle at build time, so it has to be present *when the
image is built*, not when the container starts. Render makes that possible:

> If you set environment variables for a Docker-based service, Render
> automatically translates those values to Docker build arguments (`ARG`) that
> are available during your image's build process.

That is exactly what the `Dockerfile` consumes:

```dockerfile
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
```

`sync: false` is what makes Render *ask* you for the value when the service is
first created, instead of storing a placeholder in the file. Render's blueprint
reference is explicit that it is a one-time prompt: *"Render ignores `sync:
false` during later updates."* So you answer it once, and the answer sticks.

**But the application does not read the variable.** The canonical origin is a
literal in the source, in four places:

| File | What it sets |
| --- | --- |
| `apps/web/src/app/layout.tsx` | `metadataBase` and `openGraph.url` |
| `apps/web/src/app/sitemap.ts` | `SITE` — every URL in the sitemap |
| `apps/web/src/app/robots.ts` | `SITE` — the sitemap URL in `robots.txt` |
| `apps/web/src/app/og/route.tsx` | the origin printed on the Open Graph image |

All four say `https://nooreign.vercel.app`. So the value you type at the prompt
reaches the image and stops there. Read
[the one thing that goes wrong first](#the-one-thing-that-goes-wrong-first)
before you assume the prompt is what makes the site claim your origin.

---

## The commands, in order

### 1. Prove the image builds before Render ever sees it

Render builds the same `Dockerfile` that CI builds, so a local build is a
complete rehearsal:

```bash
bun install --frozen-lockfile
docker build -t nooreign/web:latest .
docker run --rm -p 3000:3000 nooreign/web:latest
curl -s http://localhost:3000/api/healthz | jq
```

If that `curl` answers, Render's build will answer too.

### 2. Install the CLI and sign in

```bash
curl -fsSL https://raw.githubusercontent.com/render-oss/cli/refs/heads/main/bin/install.sh | sh
render login
```

`render login` opens a browser and stores a token in `~/.render/`.

### 3. Validate the blueprint

```bash
render blueprints validate render.yaml
```

This is a pure schema and semantics check — no API key, no network call to
Render — and it is the same check Render runs before a Blueprint sync. It
catches the things that are easy to get wrong in a YAML file: a misspelled
`buildCommand`, a duplicated service name, a `fromService` that points at a
service that does not exist. A green run here is a strong signal that the sync
will succeed.

> The `blueprints validate` subcommand needs Render CLI v2.7.0 or later. Run
> `render --version`; on an older CLI use `render help` to see what your
> version supports.

### 4. Create the Blueprint

In the Render dashboard: **New → Blueprint**, connect the repository, pick the
branch, leave the *Blueprint Path* at `render.yaml` (the default), review the
list of resources Render says it will create, and press **Deploy Blueprint**.

At this point Render asks for the one value it cannot take from the file:

```
NEXT_PUBLIC_SITE_URL  →  https://<your-site>.onrender.com
```

Answer it with the **full origin, including the scheme**. It does not change
the canonical URLs on its own — see
[the one thing that goes wrong first](#the-one-thing-that-goes-wrong-first) —
but it is the value the image records, and it is what every other target asks
for too.

### 5. Watch the first deploy

Both services build. `nooreign-web` builds the Docker image — `bun install
--frozen-lockfile` then `bun run build` inside the builder stage — and
`nooreign-agents` runs `pip install -e ".[dev]"` in `services/agents`.

To see what Render is doing:

```bash
render services            # every service and datastore in the workspace
render deploys list        # every deploy, and which one failed
```

`render deploys list` with no argument lists the deploys of the workspace; pass
a service id to narrow it. Selecting a deploy shows its logs, and the same logs
are in the dashboard under the service.

### 6. (Optional) the Python service

`nooreign-agents` starts with `uvicorn app.main:app --host 0.0.0.0 --port
8080` and needs `PYTHONPATH=/opt/render/project/src/services/agents` and
`PYTHONUNBUFFERED=1`, both of which the blueprint sets. Its healthcheck is
`GET /healthz` — the same path name as the web service's `/api/healthz`, a
different service.

Point the atlas at it only once it is actually up:

```bash
render services            # find the nooreign-agents service id
```

and set `NOOREIGN_SERVICE_URL` on `nooreign-web` to its URL. Leave it empty
otherwise.

---

## The one thing that goes wrong first

**The `NEXT_PUBLIC_SITE_URL` prompt, because nothing fails when you get it
wrong.**

`render.yaml` marks it `sync: false`, so Render asks for it when the service
is created. The build then succeeds, the deploy succeeds, the healthcheck goes
green, and the site is live — with the wrong origin baked into the client
bundle.

And on this repository it is wrong *whatever you type*, because the
application does not read the variable. The canonical origin is a literal in
four source files:

| File | What it sets |
| --- | --- |
| `apps/web/src/app/layout.tsx` | `metadataBase` and `openGraph.url` |
| `apps/web/src/app/sitemap.ts` | `SITE` — every URL in the sitemap |
| `apps/web/src/app/robots.ts` | `SITE` — the sitemap URL in `robots.txt` |
| `apps/web/src/app/og/route.tsx` | the origin printed on the Open Graph image |

All four say `https://nooreign.vercel.app`.

**How to recognise it:** the site works, but the canonical URL, the Open Graph
tags and the sitemap still point at `https://nooreign.vercel.app`. The sitemap
is the fastest check, because it is generated at build time from that same
literal:

```bash
curl -s https://<your-site>.onrender.com/sitemap.xml | head -3
```

A sitemap whose `<loc>` entries point at `nooreign.vercel.app` is this bug. So
is a page whose `<link rel="canonical">` does not match the URL in the address
bar, and an Open Graph card whose image says `nooreign.vercel.app` in the
corner.

**The fix** is to change the four literals to your origin and redeploy. The
rule is written out in `sitemap.ts`: *"Canonical origin. Must agree with
`metadataBase` in `layout.tsx`."* `NEXT_PUBLIC_SITE_URL` is the variable that
ought to hold this value — wiring it up is a one-line change per file, and a
natural follow-up — but as the repository stands today the literal is the
source of truth, and a deployment guide that said otherwise would be lying to
you.

If you do change the literal, note that the change is a **source** change, so
it needs a rebuild, not a restart:

```bash
render deploys create <service-id>
```

### The second thing: the Python worker failing

The blueprint creates `nooreign-agents` whether or not you want it. If its
deploy fails — a Python dependency that does not resolve, say — the atlas is
unaffected: `nooreign-web` is a separate service, and every verdict is computed
in the browser. Either fix the worker or delete it from the blueprint; the
`NOOREIGN_SERVICE_URL` variable on the web service stays empty either way.

---

## Verify the deployment

### The healthcheck

```bash
curl -s https://<your-site>.onrender.com/api/healthz | jq
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

`status` is `"ok"`, so the service is serving HTTP and not merely running a
process. `seed` is `2406` — the same seed the local build has; if it is
anything else, the image is not the one you think it is. `datasets` is the
`ATLAS_STATS` manifest: the counts of kingdoms, advisors, dilemmas, eras and
techniques that were actually compiled into the bundle.

### A static route

`/kingdoms` is prerendered at build time (`○` in the Next build output), so it
is served straight out of the image:

```bash
curl -sI https://<your-site>.onrender.com/kingdoms | head -1
```

`HTTP/2 200` is the answer. A `404` here with a working `/api/healthz` means
the standalone output is missing its static assets — the `COPY` lines for
`.next/static` and `public` in the `Dockerfile`.

### The canonical origin

```bash
curl -s https://<your-site>.onrender.com/sitemap.xml | head -3
curl -s https://<your-site>.onrender.com/kingdoms | grep -o 'rel="canonical"[^>]*' | head -1
```

Both should name your origin. If they name `https://nooreign.vercel.app`, the
image is fine and the *source* is not — see
[the one thing that goes wrong first](#the-one-thing-that-goes-wrong-first).

### The dynamic route

`/council` is server-rendered on demand (`ƒ` in the Next build output, unlike
`/kingdoms`'s `○`), so it is the honest end-to-end check: it exercises the
standalone server rather than a file the build wrote.

```bash
curl -sI https://<your-site>.onrender.com/council | head -1
```

`HTTP/2 200` is the answer. A `200` here means the workspace packages were
bundled correctly — they ship raw TypeScript and are compiled by
`transpilePackages`, not copied as `dist/`.

### The optional service, if you deployed it

```bash
curl -s https://<agents-service>.onrender.com/healthz | jq
```

---

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Canonical URL, OG tags and sitemap point at `nooreign.vercel.app` | the origin is a literal in four source files, not the environment | edit `layout.tsx`, `sitemap.ts`, `robots.ts` and `og/route.tsx`, then redeploy |
| Every route 404s but `/api/healthz` is green | `.next/static` or `public` not copied into the runner | check both `COPY` lines in the `Dockerfile` |
| `nooreign-agents` deploy fails | the Python service is broken | the atlas does not need it — fix it or delete it from the blueprint |
| `render blueprints validate` fails | a schema or semantic error in `render.yaml` | the error names the line; the command's exit code is non-zero |
| First request takes ~30 seconds | Render's free instances sleep and cold-start | expected on the free plan; the `starter` plan does not sleep |
| Build succeeds, site shows the wrong dataset | the image was built before the seed changed | rebuild: `render deploys create <service-id>` (or push a commit — `autoDeploy: true`) |

---

## Related

- [`deploying.md`](deploying.md) — all five targets, the healthcheck contract, the
  environment reference
- [`deploying-to-fly.md`](deploying-to-fly.md) — the same image, a different platform
- [`determinism-and-seeds.md`](determinism-and-seeds.md) — why the deployed seed must
  be `2406`, and what to grep before you push
- [ADR 0009](../adr/0009-optional-python-agents-service.md) — why the Python service
  is optional at runtime
- [`../runbooks/release.md`](../runbooks/release.md) — the release flow
- [`../runbooks/incident-triage.md`](../runbooks/incident-triage.md) — when the
  deployed site misbehaves
