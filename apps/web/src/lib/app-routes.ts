import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Answering "does a page exist for this href?" by reading `src/app`.
 *
 * The alternative — a hand-written list of routes — is a test that agrees with
 * you about a lie: it keeps passing for as long as everyone remembers to update
 * it when a page moves, and fails silently in between. Reading the filesystem
 * means the answer is the app's own answer, so a link cannot go dead without
 * this going red first.
 *
 * It lives in `lib/` rather than in a test file because more than one suite
 * needs it: navigation checks the chrome, the codex checks all 148 documents it
 * hands to a reader. Importing a helper out of another `.test.ts` would register
 * that file's suite twice.
 *
 * Not imported by any component on purpose — this is verification code, and the
 * bundler drops it from the app.
 */

/** The app router's source of truth, resolved from wherever this module sits. */
const APP_DIR = join(import.meta.dirname, "..", "app");

/** Every top-level route the app router serves, as a URL path. */
export function topLevelRoutes(): string[] {
  const routes: string[] = [];
  for (const entry of readdirSync(APP_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    // Route groups and private folders are not URLs.
    if (entry.name.startsWith("(") || entry.name.startsWith("_") || entry.name.startsWith("@")) continue;
    if (!existsSync(join(APP_DIR, entry.name, "page.tsx"))) continue;
    routes.push(`/${entry.name}`);
  }
  return routes;
}

/**
 * Does the app router serve a page at this href?
 *
 * Fragments and query strings are dropped first: `/observatory#t12-debate` and
 * `/observatory?kind=ethics` are both the `/observatory` page.
 *
 * Segments resolve the way Next resolves them: a literal directory wins, and a
 * dynamic `[segment]` directory is the fallback when there is no literal one —
 * so `/codex/imperative` finds `app/codex/[slug]/page.tsx` without the href
 * having to know about the bracket. Trying the literal first is not cosmetic;
 * it is the precedence the router uses, and copying it is what stops this from
 * reporting a page where the app would 404 (or vice versa).
 */
export function hasPage(href: string): boolean {
  const path = href.split(/[?#]/, 1)[0] ?? "";
  return servesPage(APP_DIR, path.split("/").filter(Boolean));
}

function servesPage(dir: string, segments: readonly string[]): boolean {
  const [head, ...rest] = segments;

  // A route handler (`og/route.tsx`) answers a URL just as a page does.
  if (head === undefined) return existsSync(join(dir, "page.tsx")) || isRouteHandler(dir);

  const literal = join(dir, head);
  if (isDirectory(literal) && servesPage(literal, rest)) return true;

  const dynamic = dynamicSegment(dir);
  return dynamic !== null && servesPage(dynamic, rest);
}

function isDirectory(path: string): boolean {
  return existsSync(path) && statSync(path).isDirectory();
}

function isRouteHandler(dir: string): boolean {
  return existsSync(join(dir, "route.ts")) || existsSync(join(dir, "route.tsx"));
}

/** The first `[segment]` directory at this level, or `null` if there is none. */
function dynamicSegment(dir: string): string | null {
  const match = readdirSync(dir, { withFileTypes: true }).find(
    (entry) => entry.isDirectory() && entry.name.startsWith("[") && entry.name.endsWith("]"),
  );
  return match ? join(dir, match.name) : null;
}
