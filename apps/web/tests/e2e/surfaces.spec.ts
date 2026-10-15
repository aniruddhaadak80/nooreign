import { expect, test } from "@playwright/test";

/**
 * The surfaces that arrived after the first release, plus the two machine-readable
 * endpoints beside them.
 *
 * Every one is server-rendered, so these assert what a reader sees *before* any
 * JavaScript runs — the cheapest thing to check and the one that fails loudest.
 * Where a test id exists the test uses it; where one does not, it derives the
 * selector from the page (an `a[href^="/compare/"]` rather than a hand-written
 * list of slugs) so the dataset can grow without the test being edited.
 */

test.describe("the comparison", () => {
  test("offers a verdict for every dilemma and opens one", async ({ page }) => {
    await page.goto("/compare");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("How would each kingdom rule?");

    const verdicts = page.locator('a[href^="/compare/"]');
    expect(await verdicts.count()).toBeGreaterThanOrEqual(12);

    await verdicts.first().click();
    await expect(page).toHaveURL(/\/compare\/[^/]+$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("How each realm rules");
    await expect(page.getByRole("heading", { name: "Every realm, in its own voice" })).toBeVisible();
  });
});

test.describe("the engine", () => {
  test("states the brief and scores every option on the page", async ({ page }) => {
    await page.goto("/engine");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("What the case is actually about");
    await expect(page.getByTestId("engine-brief")).toBeVisible();
    expect(await page.getByTestId("engine-option").count()).toBeGreaterThanOrEqual(2);
  });
});

test.describe("the journal", () => {
  test("asks the questions the court pressed and keeps the answers", async ({ page }) => {
    await page.goto("/journal");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Answer the questions this court actually pressed",
    );
    await expect(page.getByTestId("journal-prompts")).toBeVisible();

    const answer = page.getByTestId("journal-answer").first();
    await answer.fill("Only the entities with a say in the outcome count.");
    await expect(answer).toHaveValue(/say in the outcome/);

    // The journal is a local store, not a backend: what was written is still on
    // the page after a reload, because `localStorage` is where it lives.
    await page.reload();
    await expect(answer).toHaveValue(/say in the outcome/);
  });
});

test.describe("the cartographer", () => {
  test("draws the deliberation as a graph rather than a transcript", async ({ page }) => {
    await page.goto("/cartographer");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "The deliberation as a graph, not a transcript",
    );
    await expect(page.getByTestId("cartographer-graph")).toBeVisible();
    await expect(page.getByTestId("cartographer-node").first()).toBeVisible();
    await expect(page.getByTestId("cartographer-wellformed")).toBeVisible();
  });
});

test.describe("machine-readable endpoints", () => {
  test("the OG route answers with a real PNG", async ({ request }) => {
    const response = await request.get("/og?kind=kingdom&title=Kantian%20Citadel");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("image/png");
    expect((await response.body()).length).toBeGreaterThan(1_000);
  });

  test("the OG route refuses a kind it does not have", async ({ request }) => {
    const response = await request.get("/og?kind=nonsense");
    expect(response.status()).toBe(400);
  });

  test("the sitemap lists the routes the router serves", async ({ request }) => {
    const response = await request.get("/sitemap.xml");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("xml");

    const xml = await response.text();
    expect(xml).toContain("<urlset");
    // The route a hand-written list is most likely to forget, and one from each
    // family of content the atlas is made of.
    for (const url of ["/cartographer", "/compare/", "/codex/", "/codex/texts/", "/court/"]) {
      expect(xml, `sitemap.xml never mentions ${url}`).toContain(url);
    }
  });

  test("robots.txt allows the prose and refuses the API", async ({ request }) => {
    const response = await request.get("/robots.txt");
    expect(response.status()).toBe(200);

    const text = await response.text();
    expect(text).toContain("Allow: /");
    expect(text).toContain("Disallow: /api/");
    expect(text).toContain("/sitemap.xml");
  });
});
