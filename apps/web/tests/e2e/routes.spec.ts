import { expect, test } from "@playwright/test";

/** One pass over the generated route tree, asserting each page actually renders its heading. */
test.describe("generated routes", () => {
  test("kingdom detail pages render their doctrine", async ({ page }) => {
    await page.goto("/kingdoms/kantian-citadel");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Kantian Citadel");
    await expect(page.getByText(/categorical imperative/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Kant\b/ }).first()).toBeVisible();
  });

  test("advisor pages render their argument moves", async ({ page }) => {
    await page.goto("/court/bentham");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Bentham");
    await expect(page.getByText(/argument moves/i).first()).toBeVisible();
    await expect(page.getByText(/premise|objection|appeal|synthesis/i).first()).toBeVisible();
  });

  test("an era page renders its landmarks and stack", async ({ page }) => {
    await page.goto("/chronicle/asilomar-1986");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText(/landmarks/i).first()).toBeVisible();
  });

  test("the chronicle machine scrubs years", async ({ page }) => {
    await page.goto("/chronicle");
    const slider = page.getByLabel(/selected year/i);
    await expect(slider).toBeVisible();
    await slider.fill("1986");
    await expect(page.getByText(/Asilomar/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test("the observatory renders the coverage matrix", async ({ page }) => {
    await page.goto("/observatory");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/stack/i);
    await expect(page.getByRole("table")).toBeVisible();
  });

  test("a dilemma page scores its options on six axes", async ({ page }) => {
    await page.goto("/dilemmas");
    const firstCard = page.locator("a").filter({ hasText: /options ·/ }).first();
    await firstCard.click();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    for (const axis of ["welfare", "rights", "virtue", "care", "justice", "agency"]) {
      await expect(page.getByRole("columnheader", { name: axis })).toBeVisible();
    }
  });

  test("the codex is searchable", async ({ page }) => {
    await page.goto("/codex");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/term/i);
    await page.getByRole("searchbox").fill("corrigibility");
    await expect(page.getByText(/of 120 terms/)).toBeVisible();
  });

  test("an experiment bench renders and responds", async ({ page }) => {
    await page.goto("/experiments");
    await page.locator("a").filter({ hasText: /sweep/i }).first().click();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText(/phase:/)).toBeVisible({ timeout: 15_000 });
  });

  test("unknown routes 404 properly", async ({ page }) => {
    const response = await page.goto("/kingdoms/not-a-kingdom");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/no realm/i);
  });
});
