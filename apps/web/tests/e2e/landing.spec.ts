import { expect, test } from "@playwright/test";

/**
 * The landing page is the only page most visitors will see, so it carries the
 * load-bearing assertions: the premise renders, the atlas links work, and the
 * dataset counts are real rather than decorative.
 */
test.describe("landing", () => {
  test("states the premise and links into the atlas", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1 })).toContainText("superintelligence");
    await expect(page.getByRole("link", { name: /enter the atlas/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /convene a council/i })).toBeVisible();

    await page.getByRole("link", { name: /enter the atlas/i }).click();
    await expect(page).toHaveURL(/\/kingdoms$/);
    await expect(page.getByRole("heading", { level: 1, name: /the twelve kingdoms/i })).toBeVisible();
  });

  test("reports the real dataset sizes", async ({ page }) => {
    await page.goto("/");
    // A list, not a definition list — the stats carry a note as well as a value.
    const stats = page.getByRole("list").filter({ hasText: "schools of thought" }).first();
    await expect(stats).toContainText("kingdoms");
    // Twelve kingdoms is a claim the seed data has to actually satisfy.
    await expect(stats.locator("p").nth(1)).toHaveText("12");
  });

  test("every primary section is reachable from the header", async ({ page }) => {
    await page.goto("/");
    for (const section of ["Kingdoms", "Court", "Council", "Dilemmas", "Chronicle", "Observatory", "Experiments", "Codex"]) {
      await expect(page.getByRole("navigation", { name: /atlas sections/i }).getByRole("link", { name: section })).toBeVisible();
    }
  });
});
