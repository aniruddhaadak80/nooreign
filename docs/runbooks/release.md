# Release

What you get: the tag-to-artefact flow, the four gates that will stop you, and the
exact commands for a dry run.

---

## The flow

```
develop  ──PR──▶  develop  ──merge──▶  main  ──tag vX.Y.Z──▶  Release workflow
                                                                  │
                                          build + assets + docs + seed + images
                                                                  │
                                          nooreign-X.Y.Z.tar.gz  (+ .sha256)
```

| Step | Trigger | Workflow |
| --- | --- | --- |
| Every push and PR to `main` or `develop` | CI, asset-check | `ci.yml`, `asset-check.yml` |
| Merge to `main` | Vercel production deploy | `deploy-vercel.yml` |
| Push a `v*` tag | Release build and publish | `release.yml` |

**The tag is the release.** `release.yml` triggers on `push: tags: ["v*"]`, or on a
manual `workflow_dispatch` with a `tag` input.

---

## The four gates

Fix these before you tag. Each one has bitten before.

### Gate 1 — the tag must match `package.json`

```yaml
- name: Verify the tag matches package.json
  run: |
    expected="v$(jq -r '.version' package.json)"
    if [ "${expected}" != "${{ steps.tag.outputs.tag }}" ]; then
      ::error::Tag … does not match package.json version
    fi
```

So the version bump and the tag are **the same change**. Bump `package.json` in the
PR that merges to `main`, then tag that commit.

```bash
# The check, locally
jq -r '.version' package.json       # 0.1.0
git tag --list 'v*'
```

### Gate 2 — the tag must be valid semver

```yaml
if ! [[ "$tag" =~ ^v[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$ ]]; then
  ::error::Tag ${tag} is not a valid semver tag (expected v1.2.3[-rc.1]).
```

`vMAJOR.MINOR.PATCH[-prerelease]`. Nothing else passes. And a dispatched release must
point at an **existing tag** — the workflow re-fetches tags and calls `git rev-parse`
on it, so a release can never describe code nobody can check out.

### Gate 3 — everything CI runs, green

```bash
bun run verify     # typecheck && lint && test && build
```

Plus the jobs that are not in `verify`:

```bash
bun run e2e:install && bun run test:e2e        # Playwright
bun run loc --json | jq '.totalLines'          # the scale floor
pytest services/agents/tests -q                # Python
ruff check services/agents                     # Python lint
bun run crate:engine                           # Rust — currently fails, crates/ is empty
cargo clippy --manifest-path crates/engine/Cargo.toml -- -D warnings
```

**The rust job is a known red.** `crates/` is an empty directory. See
[`incident-triage.md`](incident-triage.md) §5 for the two honest fixes.

### Gate 4 — committed assets match their generators

```yaml
- name: Regenerate assets
  run: bun run assets
- name: Fail if committed assets drifted
  run: git diff --exit-code
```

```bash
bun run assets
bun run diagrams
git status
# anything modified here must be committed BEFORE tagging
```

---

## Cutting a release

### 1. Start clean

```bash
git checkout main
git pull --ff-only
git status                     # must be clean
bun run verify
```

### 2. Bump the version

```bash
jq '.version = "0.2.0"' package.json > tmp && mv tmp package.json
git diff package.json
```

Commit and PR through `develop` like any other change. CI runs on the PR.

### 3. Update `CHANGELOG.md`

The release workflow generates notes from commit subjects between tags, but
`CHANGELOG.md` is a committed file and the artefact includes it:

```dockerfile
cp LICENSE README.md CHANGELOG.md "${staging}/"
```

### 4. Merge to `main`

`deploy-vercel.yml` fires on push to `main`. Confirm the deploy before tagging — the
release workflow builds the same artefact and there is no reason to release code that
was not deployed.

### 5. Tag

```bash
git tag -a v0.2.0 -m "Release v0.2.0"
git push origin v0.2.0
```

Pushing the tag is what triggers `release.yml`. Ask before pushing — it is the
irreversible step.

### 6. Watch it

The workflow does, in order:

| Step | What |
| --- | --- |
| Resolve the tag | Validates existence and the semver shape; writes the step summary |
| Verify against `package.json` | Gate 1 |
| Install | `bun install --frozen-lockfile` |
| Build | `bun run build` |
| Generate assets | `bun run assets` |
| Collect payload | `release/nooreign-X.Y.Z/{docs, images, seed, LICENSE, README.md, CHANGELOG.md, BUILD_INFO.txt}` |
| Upload artefact | `nooreign-X.Y.Z.tar.gz` + `.sha256`, 30-day retention |
| Publish | `gh release create` with generated notes, only on a push or when `dry_run: false` |

### 7. Verify the artefact

```bash
gh release download v0.2.0 --pattern 'nooreign-0.2.0.tar.gz*'
sha256sum -c nooreign-0.2.0.tar.gz.sha256

tar -tzf nooreign-0.2.0.tar.gz | head -40
cat release/nooreign-0.2.0/BUILD_INFO.txt 2>/dev/null || tar -xzOf nooreign-0.2.0.tar.gz ./nooreign-0.2.0/BUILD_INFO.txt
```

`BUILD_INFO.txt` carries the line count and the commit:

```
loc: 3XXXX lines
commit: <sha>
date: <ISO 8601>
```

---

## Dry run

`workflow_dispatch` takes two inputs:

| Input | Type | Default | Meaning |
| --- | --- | --- | --- |
| `tag` | string | required | An existing tag, e.g. `v0.1.0` |
| `dry_run` | boolean | `true` | Build and upload the artefact without publishing a GitHub Release |

```yaml
on:
  workflow_dispatch:
    inputs:
      tag:
        description: "Existing tag to release, e.g. v0.1.0"
        required: true
        type: string
      dry_run:
        description: "Build and upload the artefact, but do not publish a GitHub Release"
        required: false
        default: true
        type: boolean
```

So a dry run **still** validates the tag, still runs the build, still regenerates
assets, and still uploads the tarball as a workflow artefact — it just does not create
a GitHub Release. Use it on a tag that already exists.

Locally, the equivalent check without pushing anything:

```bash
git fetch --tags --force --quiet
git rev-parse refs/tags/v0.2.0
[[ "$(jq -r '.version' package.json)" == "v0.2.0" ]] && echo "tag matches package.json"

bun install --frozen-lockfile
bun run build
bun run assets
git diff --exit-code && echo "assets clean"

mkdir -p /tmp/release-check
cp -R docs /tmp/release-check/docs
cp -R apps/web/public/images /tmp/release-check/images 2>/dev/null
cp -R packages/seed /tmp/release-check/seed
tar -czf /tmp/release-check.tar.gz -C /tmp/release-check .
```

---

## What is in the artefact

```
nooreign-X.Y.Z/
├── docs/          the whole documentation set
├── images/        apps/web/public/images — the generated SVGs
├── seed/          packages/seed — the typed dataset
├── LICENSE
├── README.md
├── CHANGELOG.md
└── BUILD_INFO.txt — line count, commit sha, commit date
```

The workflow's comment on this payload:

> Docs + generated assets are the consumable artefact of this repo: the atlas content
> and the diagrams are reproducible from seed 2406.

Not included: the app itself, the lockfile, the Docker image, or any source outside
`packages/seed`. The consumer of this tarball is a person who wants the **content** —
the kingdoms, the dilemmas, the glossary, the diagrams — and the seed package so it is
typed and checkable.

---

## Rollback

There is no automated rollback, and there does not need to be one. The site is
stateless and every page is generated from a committed seed.

| Situation | Fix |
| --- | --- |
| A bad content commit is live | Revert on `main`; `deploy-vercel.yml` redeploys |
| A bad tag | Move the tag and re-run `workflow_dispatch` with the correct `tag` |
| A broken `package.json` version | Fix and bump again — the tag gate prevents a mismatch from shipping |
| A failed build | Nothing shipped. Fix on `main`, move the tag, re-run |

Vercel also keeps its own deployment history and a one-click promote of a previous
deployment, which covers the case where `main` itself is fine but a build artefact was
wrong.

---

## Release checklist

```bash
git checkout main && git pull --ff-only
git status                                                    # clean
bun run verify
bun run e2e:install && bun run test:e2e
bun run loc --json | jq '.totalLines'
bun run assets && bun run diagrams && git status              # nothing modified
rg -n '2406' packages/ apps/ .github/ docs/                   # seed literals agree
```

- [ ] `package.json` `version` bumped, in the same PR as the tag commit
- [ ] `CHANGELOG.md` updated
- [ ] `bun run verify` green
- [ ] Playwright green
- [ ] LOC floor satisfied (or `LOC_BASELINE` raised, with justification)
- [ ] `bun run assets` produced no diff
- [ ] The seed literals all agree on `2406`
- [ ] Vercel production deploy succeeded for the merge commit
- [ ] Tag is `vX.Y.Z` and matches `package.json`
- [ ] **Asked before `git push origin vX.Y.Z`**

### If a verdict moved in this release

State it in `CHANGELOG.md` with the determinism block from
`CONTRIBUTING.md` — seed, dilemma id, option id, verdict before and after, and why.
`verdict-regression.md` has the template and the bisect procedure.

---

## The scale floor, at release time

The `scale` CI job fails if the line count drops more than 10% below `LOC_BASELINE`.
Its comment is worth reading once before you cut a release:

> The atlas is a scale-engineered repo: shrinking it is a regression even when every
> test still passes.

A release that deletes more than it adds **will fail CI** unless `LOC_BASELINE` is
raised, and raising it requires a justification in review. Plan releases as
additive, or as additive-plus-refactor.

```bash
bun run loc --json | jq '.totalLines'
```

## Related

- [`../guides/contributing-guide.md`](../guides/contributing-guide.md) — the
  conventions this release inherits
- [`../guides/deploying.md`](../guides/deploying.md) — the deploy step that runs before
  the tag
- [`verdict-regression.md`](verdict-regression.md) — if a verdict moved, this is
  required reading first
- [`dataset-corruption.md`](dataset-corruption.md) — if `validateSeed` is failing
- [`incident-triage.md`](incident-triage.md) — the rust-job failure you will hit
- [ADR 0004](../adr/0004-deterministic-seeded-deliberation.md) — why the artefact is
  reproducible from the seed alone