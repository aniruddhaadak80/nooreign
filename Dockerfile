# syntax=docker/dockerfile:1
#
# Nooreign — production image for the Next.js atlas.
#
# Multi-stage so the runner carries neither the toolchain, the workspace
# sources, nor the dev dependencies: only the Next.js `standalone` server and
# the static assets it needs at runtime.
#
# Why Bun for every stage: the repo is a Bun workspace (packageManager
# bun@1.3.14) and `bun install` is an order of magnitude faster than npm here.
# The runner is `-slim` because nothing in a Next.js server needs a full distro.

# --- Stage 1: dependencies --------------------------------------------------
FROM oven/bun:1.3 AS deps
WORKDIR /repo

# Manifests only, so this layer is cached until a dependency actually changes.
# All workspace packages are copied because Bun needs to see every
# package.json in the workspace to resolve `workspace:*` links.
COPY package.json bun.lock ./
COPY apps/web/package.json ./apps/web/
COPY packages/config/package.json ./packages/config/
COPY packages/core/package.json ./packages/core/
COPY packages/i18n/package.json ./packages/i18n/
COPY packages/sdk/package.json ./packages/sdk/
COPY packages/seed/package.json ./packages/seed/
COPY packages/ui/package.json ./packages/ui/

# --frozen-lockfile: the image must install exactly what was reviewed. A stale
# lockfile fails the build rather than silently shipping different versions.
RUN bun install --frozen-lockfile

# --- Stage 2: build ---------------------------------------------------------
FROM oven/bun:1.3 AS builder
WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY . .

# apps/web/next.config.ts sets `output: "standalone"`, so `next build` emits a
# self-contained server under apps/web/.next/standalone that already contains a
# pruned node_modules — no npm, no workspace symlinks and no `next` CLI needed
# at runtime.
#
# The workspace packages reach that bundle because `transpilePackages`
# (["@repo/core","@repo/i18n","@repo/sdk","@repo/seed","@repo/ui"]) tells Next
# to compile those raw TypeScript sources into the app's own chunks rather than
# requiring prebuilt dist/ output from each package. `bun run build` is
# `turbo build`, which runs the packages' build tasks before apps/web's.
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
# Opt in to Next's standalone output here rather than in next.config.ts: the traced
# bundle is assembled with symlinks, which Windows refuses to create for a
# non-elevated user. Inside the Linux builder that is a non-issue, and this image is
# where the slim, dependency-free server actually pays for itself.
ENV NOOREIGN_STANDALONE=1
RUN bun run build

# --- Stage 3: runner --------------------------------------------------------
FROM oven/bun:1-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
# No telemetry: the atlas must not phone home, and it certainly must not from
# inside a production container.
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# The standalone output nests the app under a path mirroring the repo layout, so
# the server entrypoint lives at apps/web/server.js inside it.
COPY --from=builder --chown=bun:bun /repo/apps/web/.next/standalone ./
# .next/static and public are NOT bundled into standalone by design — Next
# expects them to be copied in, or CSS/JS 404 in production.
COPY --from=builder --chown=bun:bun /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=bun:bun /repo/apps/web/public ./apps/web/public

USER bun
EXPOSE 3000

# Exercises the real HTTP surface rather than a process check, so a server that
# boots but cannot serve is still reported unhealthy.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD bun --eval "const r = await fetch('http://127.0.0.1:3000/api/healthz'); if (!r.ok) process.exit(1)"

CMD ["bun", "apps/web/server.js"]