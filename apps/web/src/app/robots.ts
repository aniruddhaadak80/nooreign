import type { MetadataRoute } from "next";

/**
 * Crawler policy for the atlas.
 *
 * The whole site is public prose and static data — there is nothing behind a
 * login — so the rule is "crawl everything", with one exception. `/api/` holds
 * the deliberation and experiment endpoints: they are POST-shaped, they exist to
 * be called by the council chamber and the bench, and letting a crawler walk
 * them spends a request budget on JSON nobody indexes. Disallowing the prefix
 * is cheaper and more honest than rate-limiting it.
 *
 * `/og` is deliberately *not* disallowed. It is a real, cacheable image URL that
 * other people embed, and hiding it from crawlers would only make the atlas
 * harder to cite.
 */

/** Canonical origin. Must agree with `metadataBase` in `layout.tsx`. */
const SITE = "https://nooreign.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/"],
      },
    ],
    host: SITE,
    // One entry, because `sitemap.ts` generates exactly one sitemap. A second
    // entry would have to point at a URL this site does not serve, and a
    // `Sitemap:` line that 404s is worse than the line's absence.
    sitemap: [`${SITE}/sitemap.xml`],
  };
}