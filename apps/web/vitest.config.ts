import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Mirror the `@/*` alias from tsconfig.json so tests import the same
    // specifiers the app does. Without this, `@repo/*` resolves through the
    // workspace but `@/*` does not, and the failure looks like a missing file.
    alias: {
      "@": resolve(import.meta.dirname, "src"),
    },
  },
  test: {
    name: "web",
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
