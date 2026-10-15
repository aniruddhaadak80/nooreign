import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "ui",
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    /**
     * The geometry tests sweep thousands of samples per case to prove no
     * coordinate escapes the viewBox: ~0.9s on an idle machine, but they are
     * pure CPU and the default 5s ceiling turns a busy machine into a red run
     * (observed: 883ms → timeout while six packages built in parallel). 15s
     * still catches an actual hang — it is 17x the idle cost, not a blank
     * cheque — and it stops the suite from flaking for reasons that have
     * nothing to do with the geometry.
     */
    testTimeout: 15_000,
  },
});
