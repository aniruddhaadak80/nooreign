import { defineConfig, devices } from "@playwright/test";

/**
 * E2E runs against a production build rather than the dev server, because most of
 * what can break in this app only breaks in the build: static generation of ~200
 * parameterised routes, the client islands' hydration, and the metadata that the
 * social card depends on.
 *
 * The port is deliberately not 3000. Playwright's webServer gives up when the
 * port is taken, and a developer machine frequently has something else on it;
 * 3210 is unlikely to collide and is passed explicitly to the server.
 */
const PORT = Number(process.env.E2E_PORT ?? 3210);
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./apps/web/tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "bun run build && bun run start",
        url: `${baseURL}/api/healthz`,
        reuseExistingServer: !process.env.CI,
        timeout: 600_000,
        stdout: "pipe",
        stderr: "pipe",
        env: { PORT: String(PORT), HOSTNAME: "127.0.0.1" },
      },
});
