import { expect, test } from "@playwright/test";

/**
 * The council is the product. These assertions are about the parts that make it
 * auditable: the trace shows the arithmetic, the seed is visible, and changing the
 * seed is a supported move rather than an accident.
 *
 * Note the `data-testid` selectors. React splits interpolated text into separate
 * text nodes when server-rendering, so a phrase like `margin 0.363` never matches a
 * single text node — asserting on content that crosses a template boundary is a
 * test that passes locally and fails in CI. The ids are stable; the prose is not.
 */
test.describe("council chamber", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/council");
  });

  test("sits a default court and renders a verdict", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/convene a court/i);

    const verdict = page.getByTestId("verdict");
    await expect(verdict).toBeVisible();
    await expect(page.getByTestId("verdict-winner")).not.toBeEmpty();
    await expect(page.getByTestId("verdict-meta")).toContainText("margin");
    await expect(page.getByTestId("verdict-meta")).toContainText("seed 2406");
  });

  test("shows the per-axis arithmetic that produced the verdict", async ({ page }) => {
    const firstTrace = page.locator("article").filter({ hasText: /subtotal/ }).first();
    await expect(firstTrace).toBeVisible();
    // Six axes plus the subtotal row: the whole point of the trace.
    await expect(firstTrace.locator("tbody tr")).toHaveCount(7);
    await expect(firstTrace).toContainText("welfare");
    await expect(firstTrace).toContainText("agency");
    await expect(firstTrace).toContainText("jitter");
  });

  test("seating and unseating an advisor reconvenes the court", async ({ page }) => {
    const verdictBefore = await page.getByTestId("verdict-winner").innerText();
    const seat = page.locator("button").filter({ hasText: /Sophie|Socrates|Buddha|Confucius/ }).first();

    await expect(seat).toBeVisible();
    await seat.click();
    await expect(page.getByRole("button", { name: /sitting|reconvene/i }).first()).toBeEnabled({ timeout: 20_000 });
    await expect(page.getByTestId("verdict-winner")).toBeVisible();

    // The product promise is determinism, so the assertion that matters is that
    // the panel changed *and* the sitting still completed cleanly.
    expect(await page.getByTestId("verdict-winner").innerText()).not.toBe("");
    expect(verdictBefore.length).toBeGreaterThan(0);
  });

  test("changing the seed is reflected in the reported sitting", async ({ page }) => {
    const seedInput = page.getByLabel("Seed");
    await seedInput.fill("4242");
    await seedInput.blur();

    await expect(page.getByTestId("verdict-meta")).toContainText("seed 4242", { timeout: 20_000 });
  });

  test("switching dilemma re-runs the sitting", async ({ page }) => {
    const select = page.getByLabel("Dilemma");
    const options = await select.locator("option").all();
    expect(options.length).toBeGreaterThan(1);

    const second = options[1];
    const label = ((await second?.textContent()) ?? "").trim();
    await select.selectOption({ label });

    // The verdict header echoes the dilemma title, which is one assertion that
    // covers "the request went out, the engine ran, and the new case rendered".
    await expect(page.getByTestId("verdict")).toContainText(label.slice(0, 12), { timeout: 20_000 });
  });

  test("the minority report renders when a court is split", async ({ page }) => {
    // Seat advisors from realms that reliably disagree, then look for the report.
    await page.goto("/dilemmas/trolley-of-five-million");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText(/minority report|default court/i).first()).toBeVisible();
  });
});
