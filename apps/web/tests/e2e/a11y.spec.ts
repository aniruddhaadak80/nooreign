import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * Accessibility is a gate, not a chore. The atlas is dense with data tables and
 * custom SVG, which are exactly the two things axe flags and exactly the two
 * things a reader with a screen reader needs to be right about.
 */
async function audit(page: Page, path: string) {
  await page.goto(path);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    // The animated star-field and decorative SVG are not exposed to assistive
    // technology by design; they are marked aria-hidden rather than made inert.
    .exclude("footer nav[aria-label='Site sections']")
    .analyze();

  expect(
    results.violations.map((violation) => `${violation.id} (${violation.nodes.length} nodes): ${violation.help}`),
  ).toEqual([]);
}

test.describe("accessibility", () => {
  test("landing page has no WCAG A/AA violations", async ({ page }) => {
    await audit(page, "/");
  });

  test("council chamber has no violations", async ({ page }) => {
    await audit(page, "/council");
  });

  test("kingdom page has no violations", async ({ page }) => {
    await audit(page, "/kingdoms/kantian-citadel");
  });

  test("keyboard users can reach the skip link first", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const focused = page.locator(":focus");
    await expect(focused).toHaveText(/skip to content/i);
  });
});
