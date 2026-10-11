# ADR 0006 — Tailwind v4 `@theme` tokens, with `@source` reaching outside the app

**Status:** Accepted (2026-05)
**Deciders:** core maintainers
**Applies to:** `apps/web/src/app/globals.css`, `apps/web/postcss.config.mjs`, `packages/ui/src/lib/palette.ts`

---

## Context

Nooreign's palette is not decorative. It is load-bearing in the product's argument:
the atlas plate, the axiom radar and the observatory charts encode *positions* in
colour, and the design has to stay legible to a reader in a dark room.

The palette, in one place (`apps/web/src/app/globals.css`):

```css
@theme {
  /* Nooreign palette: abyssal observatory, parchment vellum, council crimson. */
  --color-abyss: #070b18;
  --color-abyss-raised: #0e1730;
  --color-abyss-border: #1e2c4d;
  --color-parchment: #ede4d3;
  --color-parchment-dim: #b9ae99;
  --color-crimson: #c8483f;
  --color-gold: #d9a441;
  --color-verdigris: #4fa88b;
  --color-indigo-glow: #5a6fd6;
  --color-ink: #060911;

  --font-display: var(--font-cinzel), Georgia, "Times New Roman", serif;
  --font-sans: var(--font-inter), ui-sans-serif, system-ui, sans-serif;
  --font-mono: var(--font-mono-jetbrains), ui-monospace, "SFMono-Regular", monospace;

  --radius-plate: 0.25rem;
  --radius-realm: 0.625rem;
}
```

The structural problem is that **the design system does not live inside the app**.
`packages/ui` holds the components (`card.tsx`, `panel.tsx`, `stat-tile.tsx`), the
colour maths (`src/lib/palette.ts`, `src/lib/scales.ts`) and deterministic SVG
generators (`src/svg/crests.ts`, `src/svg/portraits.ts`, `src/svg/terrain.ts`).
Those files are full of utility classes. Tailwind v4's automatic content detection
walks from the project root of the **app**, and the app's classes never appear in
`packages/ui` — so without help, every `rounded-realm` and `text-parchment-dim` in
the design system is silently purged from the generated CSS.

There is also a second copy of the palette in TypeScript, because SVG attributes
cannot read CSS custom properties in a server-rendered string:

```ts
// packages/ui/src/lib/palette.ts
export const PALETTE = {
  abyss: "#070B18",
  abyssRaised: "#0E1730",
  abyssBorder: "#1E2C4D",
  parchment: "#EDE4D3",
  parchmentDim: "#B9AE99",
  crimson: "#C8483F",
  gold: "#D9A441",
  verdigris: "#4FA88B",
  indigoGlow: "#5A6FD6",
  ink: "#060911",
} as const satisfies Record<string, string>;
```

Two copies of nine colours is a drift hazard by construction.

## Decision

**Use Tailwind v4's CSS-first `@theme` block as the single styling contract, and
declare the out-of-app packages as explicit content sources.**

```css
@import "tailwindcss";

/* Tailwind v4 only scans the app directory by default; the design system lives
   outside it, so both workspace packages are declared as sources explicitly. */
@source "../../../../packages/ui/src";
@source "../../../../packages/i18n/src";

@theme { /* … the tokens above … */ }
```

The relative path is four levels up because `@source` resolves against the file
containing the directive (`apps/web/src/app/globals.css`). `@source` accepts
directories and glob patterns, so when a third workspace package grows classes
it gets its own line rather than the root being widened.

For the CSS/TypeScript duplication: `PALETTE` is kept in `packages/ui/src/lib/palette.ts`
and the module header says why, and what the rule is —

```ts
/**
 * The palette constants mirror the web app's `@theme` tokens exactly — if one
 * changes there, change it here too.
 */
```

`apps/web/package.json` therefore carries
`"tailwindcss": "^4.0.0"` and `"@tailwindcss/postcss": "^4.0.0"` and
`postcss.config.mjs` wires the v4 PostCSS plugin. There is **no `tailwind.config.js`**
and there will not be one: the theme block *is* the config.

**Named trade-off:** two files now have to be edited when a colour changes, and
nothing enforces that they agree. That is a real, accepted defect. The alternatives
were worse: generating `palette.ts` from `globals.css` would put a build step back
into a package that deliberately has none (see
[ADR 0001](0001-turborepo-raw-typescript-packages.md)), and reading the tokens at
runtime from a CSS file would put a filesystem read into server rendering for the
sake of nine strings.

## Consequences

**Positive**

- Every token is a real CSS custom property. `--color-gold` is available to
  hand-written CSS, to inline styles, to SVG `fill`, and to Tailwind utilities.
- Adding a utility to `packages/ui` works immediately. No config edit, no
  restart, no purge surprise in production.
- `@theme` is colocated with the design decisions and commentable, which a JS
  config object is not.
- Fonts flow through the same mechanism. `next/font/google` sets `--font-cinzel`,
  `--font-inter` and `--font-mono-jetbrains` as variables in
  `apps/web/src/app/layout.tsx`, and `@theme --font-display` maps them to the
  Tailwind `font-serif` / `font-sans` / `font-mono` utilities.
- Removing `tailwind.config.js` removes a whole class of "the config and the CSS
  disagree" bug and a whole file.
- Because the tokens are real properties, the documented diagram palette
  (`docs/diagrams/*.mmd` `themeVariables`) and the CSS can be kept literally equal —
  `#070B18`, `#0E1730`, `#EDE4D3`, `#C8483F`, `#D9A441`, `#4FA88B`, `#5A6FD6` —
  which is what makes the diagrams look like the site.

**Negative**

- **The palette is duplicated.** `globals.css` and `palette.ts` must be changed
  together. Nothing enforces it; a test could, and that is the obvious follow-up.
- `@source` paths are relative and fragile. Moving `globals.css`, or adding a
  workspace package with classes, silently purges those classes. The failure mode
  is a styling bug with no error message.
- v4 requires the `@tailwindcss/postcss` plugin, not the v3 `tailwindcss` PostCSS
  entry point. Mixing the two produces a build that appears to succeed and emits no
  utilities.
- `@theme` names become public API. Renaming `--color-abyss-raised` to something
  tidier is now a breaking change across `packages/ui`, `apps/web` and the
  committed SVGs.
- Server-rendered SVG strings still cannot read the CSS variables at render time,
  so the TypeScript palette is not optional in the design system. The duplication
  is structural, not accidental.

## Alternatives considered

| Option | Why rejected |
| --- | --- |
| **Tailwind v4 with a JS config and `@config`** | Works, but reintroduces the file this ADR deletes and splits the theme across two sources. |
| **Tailwind v3** | Mature and familiar. Rejected: v4's CSS-first theme is the better fit for a design system whose whole identity is a token set, and the PostCSS plugin swap is a one-line config change now rather than a migration later. |
| **CSS Modules per component** | No purge problem at all. Rejected because the design system needs utility composition to express variants compactly, and because the token indirection is the point. |
| **A single generated `palette.ts` from a JSON source, with CSS generated too** | Solves the duplication properly. Rejected for now: it needs a generator step and a CI drift check, which is real machinery for nine colours. Worth doing if the palette grows past ~30 tokens. |
| **Move `packages/ui` inside `apps/web`** | Fixes the `@source` problem by deleting it. Rejected because it destroys the package boundary that the Python and Rust parity work depends on. |
