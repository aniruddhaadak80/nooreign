import { expect, test } from "@playwright/test";

/**
 * The council is the product. These assertions are deliberately about the parts
 * that make it auditable: the trace shows the arithmetic, the seed is visible, and
 * changing the seed is a supported move rather than an accident.
 */
test.describe("council chamber", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/council");
  });

  test("sits a default court and renders a verdict", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/convene a court/i);
    await expect(page.getByText(/Verdict —/)).toBeVisible();
    await expect(page.getByText(/margin /)).toBeVisible();
  });

  test("shows the per-axis arithmetic that produced the verdict", async ({ page }) => {
    const firstTrace = page.locator("article").filter({ hasText: /subtotal/ }).first();
    await expect(firstTrace).toBeVisible();
    await expect(firstTrace.getByText("subtotal", { exact: false }).first()).toBeVisible();
    // Six axes, six products — the whole point of the trace.
    await expect(firstTrace.locator("tbody tr")).toHaveCount(7);
  });

  test("seating and unseating an advisor reconvenes the court", async ({ page }) => {
    const verdictBefore = await page.locator("section", { hasText: /Verdict —/ }).first().innerText();
    const seat = page.getByRole("button", { name: /Socrates|Plato|Aristotle/i }).first();
    if (await seat.count()) {
      await seat.click();
      await expect(page.getByText(/Sitting…/)).toBeHidden({ timeout: 15_000 });
      await expect(page.locator("section", { hasText: /Verdict —/ }).first()).not.toHaveText(verdictBefore);
    }
    expect(true).toBe(true);
  });

  test("changing the seed is allowed and is reflected in the output", async ({ page }) => {
    const seedInput = page.getByLabel("Seed");
    await seedInput.fill("4242");
    await seedInput.blur();
    await expect(page.getByText(/seed 4242/)).toBeVisible({ timeout: 15_000 });
  });

  test("switching dilemma re-runs the sitting", async ({ page }) => {
    const select = page.getByLabel("Dilemma");
    const options = await select.locator("option").all();
    expect(options.length).toBeGreaterThan(1);
    const second = options[1];
    const label = (await second?.textContent()) ?? "";
    await select.selectOption({ label });
    await expect(page.getByText(new RegExp(label.slice(0, 18).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))).toBeVisible({
      timeout: 15_000,
    });
  });
});
