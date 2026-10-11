import { describe, expect, it } from "vitest";
import { EXPERIMENTS } from "@repo/seed";
import { runSweep, sweepRequestSchema } from "./sweeps";

describe("sweepRequestSchema", () => {
  it("applies the documented defaults", () => {
    const parsed = sweepRequestSchema.parse({ experimentId: "x01", key: "capability" });
    expect(parsed.steps).toBe(24);
    expect(parsed.overrides).toEqual({});
    expect(parsed.seed).toBeUndefined();
  });

  it("bounds the sample count", () => {
    expect(sweepRequestSchema.safeParse({ experimentId: "x01", key: "k", steps: 2 }).success).toBe(false);
    expect(sweepRequestSchema.safeParse({ experimentId: "x01", key: "k", steps: 500 }).success).toBe(false);
  });
});

describe("runSweep", () => {
  const experiment = EXPERIMENTS[0];
  if (!experiment) throw new Error("no experiments in the seed data");
  const parameter = experiment.parameters[0];
  if (!parameter) throw new Error("experiment has no parameters");

  it("samples the requested number of points across the parameter's domain", () => {
    const result = runSweep({ experimentId: experiment.id, key: parameter.key, steps: 12 });

    if ("error" in result) throw new Error(result.error);
    expect(result.rows).toHaveLength(12);
    expect(result.rows[0]?.value).toBeCloseTo(parameter.min, 4);
    expect(result.rows.at(-1)?.value).toBeCloseTo(parameter.max, 4);
    // Monotone in the swept parameter, because the values are.
    for (let i = 1; i < result.rows.length; i += 1) {
      const previous = result.rows[i - 1]?.value ?? 0;
      expect(result.rows[i]?.value ?? 0).toBeGreaterThan(previous);
    }
  });

  it("every row carries a phase and every metric the experiment declares", () => {
    const result = runSweep({ experimentId: experiment.id, key: parameter.key, steps: 8 });

    if ("error" in result) throw new Error(result.error);
    for (const row of result.rows) {
      expect(["safe", "warning", "critical"]).toContain(row.phase);
      for (const metric of experiment.metrics) {
        expect(row.metrics[metric.key]).toBeTypeOf("number");
      }
    }
  });

  it("is deterministic for a fixed seed and moves when the seed changes", () => {
    const a = runSweep({ experimentId: experiment.id, key: parameter.key, steps: 10, seed: 2406 });
    const b = runSweep({ experimentId: experiment.id, key: parameter.key, steps: 10, seed: 2406 });
    const c = runSweep({ experimentId: experiment.id, key: parameter.key, steps: 10, seed: 7 });

    expect(a).toEqual(b);
    expect(JSON.stringify(a)).not.toEqual(JSON.stringify(c));
  });

  it("reports the run at the overrides alongside the sweep", () => {
    const overrideKey = experiment.parameters[1]?.key ?? parameter.key;
    const overrideValue = experiment.parameters[1]?.defaultValue ?? parameter.defaultValue;
    const result = runSweep({ experimentId: experiment.id, key: parameter.key, overrides: { [overrideKey]: overrideValue } });

    if ("error" in result) throw new Error(result.error);
    expect(result.current.params[overrideKey]).toBeCloseTo(overrideValue, 6);
    expect(Object.keys(result.current.metrics).length).toBeGreaterThan(0);
    expect(["safe", "warning", "critical"]).toContain(result.current.phase);
  });

  it("rejects an unknown experiment or parameter by name", () => {
    const unknownExperiment = runSweep({ experimentId: "nope", key: parameter.key });
    expect("error" in unknownExperiment).toBe(true);

    const unknownParameter = runSweep({ experimentId: experiment.id, key: "not-a-parameter" });
    expect("error" in unknownParameter).toBe(true);
    if ("error" in unknownParameter) expect(unknownParameter.error).toMatch(/unknown parameter/);
  });

  it("accepts a slug as well as an id", () => {
    const byId = runSweep({ experimentId: experiment.id, key: parameter.key, steps: 6 });
    const bySlug = runSweep({ experimentId: experiment.slug, key: parameter.key, steps: 6 });
    expect(bySlug).toEqual(byId);
  });

  it("sweeps every experiment in the dataset without throwing", () => {
    for (const entry of EXPERIMENTS) {
      const key = entry.parameters[0];
      if (!key) continue;
      const result = runSweep({ experimentId: entry.id, key: key.key, steps: 6, seed: 2406 });
      expect("error" in result, `${entry.id} should sweep`).toBe(false);
    }
  });
});
