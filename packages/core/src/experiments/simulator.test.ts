import { describe, expect, it } from "vitest";
import type { ExperimentModel } from "@repo/seed/types";
import { EXPERIMENTS } from "../chronicle/fixtures";
import {
  JITTER_BOUND,
  MIN_DRIVER_COEFFICIENT,
  PHASE_THRESHOLDS,
  SAFE_LINE,
  SCORERS,
  createJitterSource,
  metricOf,
  phaseOf,
  runExperiment,
  sweep,
  sweepGrid,
} from "./simulator";

/** Sweep points chosen so every base step exceeds the 0.06 peak-to-peak jitter budget. */
const STEPS = [0.15, 0.4, 0.65, 0.9] as const;

/** Non-jittered scorer: lets the invariant test assert the base's step size directly. */
const base = (model: ExperimentModel) => createJitterSource(1, model, 0);

interface DriverCase {
  readonly model: ExperimentModel;
  readonly key: string;
  readonly metric: string;
  readonly direction: 1 | -1;
  /** 1 = metric must not fall as the driver rises. -1 = must not rise. */
  readonly others: Readonly<Record<string, number>>;
}

const DEFAULT_PARAMS: Readonly<Record<ExperimentModel, Readonly<Record<string, number>>>> = {
  paperclip: { capability: 0.6, objectivePrecision: 0.35, monitoring: 0.25 },
  oracle: { capability: 0.6, plausibility: 0.5, verification: 0.4 },
  genie: { precision: 0.5, freedom: 0.4, supervision: 0.3 },
  "tool-ai": { utility: 0.6, reach: 0.4, signal: 0.35 },
  mesa: { innerStrength: 0.5, outerAlignment: 0.5, interpretability: 0.3 },
  oversight: { scaling: 0.5, evaluation: 0.35, transparency: 0.3 },
  copy: { fidelity: 0.6, copies: 0.4, offlineSupport: 0.35 },
  specification: { specificationQuality: 0.4, proxyCorrelation: 0.6, optimization: 0.5 },
};

/**
 * Every direction the theory demands, stated as data. `direction` is the sign of the expected
 * change in the metric as the driver increases.
 */
const CASES: readonly DriverCase[] = [
  { model: "paperclip", key: "capability", metric: "goalCapture", direction: 1, others: {} },
  { model: "paperclip", key: "capability", metric: "humanControl", direction: 1, others: {} },
  { model: "paperclip", key: "objectivePrecision", metric: "goalCapture", direction: -1, others: {} },
  { model: "paperclip", key: "objectivePrecision", metric: "humanControl", direction: -1, others: {} },
  { model: "paperclip", key: "monitoring", metric: "goalCapture", direction: -1, others: {} },
  { model: "paperclip", key: "monitoring", metric: "humanControl", direction: -1, others: {} },

  { model: "oracle", key: "capability", metric: "deception", direction: 1, others: {} },
  { model: "oracle", key: "plausibility", metric: "deception", direction: 1, others: {} },
  { model: "oracle", key: "verification", metric: "deception", direction: -1, others: {} },
  { model: "oracle", key: "capability", metric: "capability", direction: 1, others: {} },

  { model: "genie", key: "precision", metric: "wishPrecision", direction: -1, others: {} },
  { model: "genie", key: "freedom", metric: "wishPrecision", direction: 1, others: {} },
  { model: "genie", key: "supervision", metric: "wishPrecision", direction: -1, others: {} },
  { model: "genie", key: "freedom", metric: "literalism", direction: 1, others: {} },
  { model: "genie", key: "precision", metric: "literalism", direction: -1, others: {} },

  { model: "tool-ai", key: "reach", metric: "corrigibility", direction: 1, others: {} },
  { model: "tool-ai", key: "utility", metric: "corrigibility", direction: -1, others: {} },
  { model: "tool-ai", key: "signal", metric: "corrigibility", direction: -1, others: {} },
  { model: "tool-ai", key: "reach", metric: "reach", direction: 1, others: {} },

  { model: "mesa", key: "innerStrength", metric: "innerAlignment", direction: 1, others: {} },
  { model: "mesa", key: "outerAlignment", metric: "innerAlignment", direction: -1, others: {} },
  { model: "mesa", key: "innerStrength", metric: "deception", direction: 1, others: {} },
  { model: "mesa", key: "interpretability", metric: "deception", direction: -1, others: {} },

  { model: "oversight", key: "scaling", metric: "scaling", direction: 1, others: {} },
  { model: "oversight", key: "scaling", metric: "sandbagging", direction: 1, others: {} },
  { model: "oversight", key: "evaluation", metric: "sandbagging", direction: -1, others: {} },
  { model: "oversight", key: "transparency", metric: "sandbagging", direction: -1, others: {} },

  { model: "copy", key: "fidelity", metric: "corruption", direction: -1, others: {} },
  { model: "copy", key: "offlineSupport", metric: "corruption", direction: -1, others: {} },
  { model: "copy", key: "copies", metric: "degradation", direction: 1, others: {} },
  { model: "copy", key: "fidelity", metric: "degradation", direction: -1, others: {} },

  { model: "specification", key: "optimization", metric: "specificationGap", direction: 1, others: {} },
  { model: "specification", key: "proxyCorrelation", metric: "specificationGap", direction: -1, others: {} },
  { model: "specification", key: "specificationQuality", metric: "specificationGap", direction: -1, others: {} },
  { model: "specification", key: "optimization", metric: "goodharting", direction: 1, others: {} },
  { model: "specification", key: "specificationQuality", metric: "goodharting", direction: -1, others: {} },
];

describe("scorer shape", () => {
  it("has a scorer for every experiment model, and only those", () => {
    const models: ExperimentModel[] = ["paperclip", "oracle", "genie", "tool-ai", "mesa", "oversight", "copy", "specification"];
    expect(Object.keys(SCORERS).sort()).toEqual([...models].sort());
  });

  it("emits every declared metric and keeps them inside [0, 1]", () => {
    for (const experiment of EXPERIMENTS) {
      const run = runExperiment(experiment, {}, 7);
      for (const declared of experiment.metrics) {
        const value = run.metrics[declared.key];
        expect(value, `${experiment.id}/${declared.key}`).toBeTypeOf("number");
        expect(value ?? -1).toBeGreaterThanOrEqual(0);
        expect(value ?? 2).toBeLessThanOrEqual(1);
      }
      expect(run.notes.length).toBeGreaterThan(0);
    }
  });
});

describe("monotonicity", () => {
  for (const testCase of CASES) {
    const { model, key, metric, direction, others } = testCase;
    it(`${model}.${metric} moves the right way as ${key} rises`, () => {
      const defaults = DEFAULT_PARAMS[model];
      const scorer = SCORERS[model];

      const noisy = STEPS.map((value) =>
        metricOf(scorer({ ...defaults, ...others, [key]: value }, createJitterSource(11, model)), metric),
      );
      const clean = STEPS.map((value) => metricOf(scorer({ ...defaults, ...others, [key]: value }, base(model)), metric));

      for (let i = 1; i < noisy.length; i += 1) {
        const previous = noisy[i - 1] ?? 0;
        const current = noisy[i] ?? 0;
        if (direction === 1) expect(current, `${model}.${metric} @ ${key}`).toBeGreaterThanOrEqual(previous);
        else expect(current, `${model}.${metric} @ ${key}`).toBeLessThanOrEqual(previous);
      }

      // The base itself must move strictly, and by more than the whole jitter budget.
      const stepSize = STEPS[1]! - STEPS[0]!;
      for (let i = 1; i < clean.length; i += 1) {
        const step = Math.abs((clean[i] ?? 0) - (clean[i - 1] ?? 0));
        expect(step, `${model}.${metric} base step at ${key}`).toBeGreaterThan(2 * JITTER_BOUND);
        expect(step / stepSize).toBeGreaterThanOrEqual(MIN_DRIVER_COEFFICIENT - 1e-9);
      }
    });
  }

  it("keeps the paperclip sweep strictly increasing in capability", () => {
    const run = (capability: number): number =>
      metricOf(SCORERS.paperclip({ capability, objectivePrecision: 0.35, monitoring: 0.25 }, base("paperclip")), "goalCapture");
    expect(run(0.9)).toBeGreaterThan(run(0.8));
    expect(run(0.8)).toBeGreaterThan(run(0.7));
  });
});

describe("jitter", () => {
  it("never exceeds the documented bound", () => {
    for (const model of Object.keys(SCORERS) as ExperimentModel[]) {
      const source = createJitterSource(3, model);
      for (const key of Object.keys(DEFAULT_PARAMS[model])) {
        for (const value of STEPS) {
          expect(Math.abs(source(key, value))).toBeLessThanOrEqual(JITTER_BOUND);
        }
      }
    }
  });

  it("is a pure function of (seed, model, key, value)", () => {
    expect(createJitterSource(3, "mesa")("innerAlignment", 0.5)).toBe(createJitterSource(3, "mesa")("innerAlignment", 0.5));
    expect(createJitterSource(3, "mesa")("innerAlignment", 0.5)).not.toBe(createJitterSource(4, "mesa")("innerAlignment", 0.5));
    expect(createJitterSource(3, "mesa")("innerAlignment", 0.5)).not.toBe(createJitterSource(3, "copy")("innerAlignment", 0.5));
  });
});

describe("runExperiment", () => {
  const paperclip = EXPERIMENTS[0]!;

  it("is deterministic for a fixed seed", () => {
    const a = runExperiment(paperclip, { capability: 0.8 }, 42);
    const b = runExperiment(paperclip, { capability: 0.8 }, 42);
    expect(a).toEqual(b);
  });

  it("differs across seeds but keeps the same ordering", () => {
    const a = runExperiment(paperclip, { capability: 0.3 }, 1);
    const b = runExperiment(paperclip, { capability: 0.3 }, 2);
    expect(a.metrics).not.toEqual(b.metrics);
    expect(a.phase).toBe(b.phase);
    expect(a.verdicts.map((v) => v.ok)).toEqual(b.verdicts.map((v) => v.ok));
  });

  it("clamps overrides into the declared parameter range", () => {
    const run = runExperiment(paperclip, { capability: 9, objectivePrecision: -4 }, 1);
    expect(run.params.capability).toBe(1);
    expect(run.params.objectivePrecision).toBe(0);
  });

  it("ignores parameters the experiment never declared", () => {
    const run = runExperiment(paperclip, { nonsense: 0.5 }, 1);
    expect(Object.keys(run.params).sort()).toEqual(["capability", "monitoring", "objectivePrecision"]);
  });

  it("falls back to a seed derived from the experiment id when none is given", () => {
    expect(runExperiment(paperclip, { capability: 0.8 })).toEqual(runExperiment(paperclip, { capability: 0.8 }));
  });

  it("marks a metric out of tolerance when the risk sits past the safe line", () => {
    const hot = runExperiment(paperclip, { capability: 1, objectivePrecision: 0, monitoring: 0 }, 5);
    expect(hot.verdicts.every((v) => !v.ok)).toBe(true);
    expect(hot.notes.join(" ")).toContain("Out of tolerance");

    const cool = runExperiment(paperclip, { capability: 0, objectivePrecision: 1, monitoring: 1 }, 5);
    expect(cool.verdicts.every((v) => v.ok)).toBe(true);
    expect(cool.notes.join(" ")).toContain("safe side");
  });
});

describe("phaseOf", () => {
  it("reads the worst metric in the bag", () => {
    expect(phaseOf({ a: 0.1, b: 0.2 })).toBe("safe");
    expect(phaseOf({ a: 0.1, b: 0.5 })).toBe("warning");
    expect(phaseOf({ a: 0.1, b: 0.9 })).toBe("critical");
  });

  it("respects the documented band edges, inclusive at the top of each band", () => {
    expect(phaseOf({ a: PHASE_THRESHOLDS.safe })).toBe("safe");
    expect(phaseOf({ a: PHASE_THRESHOLDS.safe + 1e-9 })).toBe("warning");
    expect(phaseOf({ a: PHASE_THRESHOLDS.warning })).toBe("warning");
    expect(phaseOf({ a: PHASE_THRESHOLDS.warning + 1e-9 })).toBe("critical");
  });

  it("treats an empty bag as safe and ignores junk", () => {
    expect(phaseOf({})).toBe("safe");
    expect(phaseOf({ a: Number.NaN, b: 0.1 })).toBe("safe");
  });

  it("agrees with SAFE_LINE when the run's own phase is inspected", () => {
    const paperclip = EXPERIMENTS[0]!;
    const hot = runExperiment(paperclip, { capability: 1, objectivePrecision: 0, monitoring: 0 }, 5);
    expect(hot.phase).toBe(phaseOf(hot.metrics));
    expect(hot.phase).not.toBe("safe");
    expect(SAFE_LINE).toBe(0.5);
  });
});

describe("sweeps", () => {
  const paperclip = EXPERIMENTS[0]!;

  it("emits one row per value, in order", () => {
    const rows = sweep(paperclip, "capability", STEPS, 9);
    expect(rows).toHaveLength(STEPS.length);
    expect(rows.map((r) => r.value)).toEqual([...STEPS]);
    for (const row of rows) {
      expect(row.key).toBe("capability");
      expect(row.score).toBeGreaterThanOrEqual(0);
      expect(row.score).toBeLessThanOrEqual(1);
    }
  });

  it("shows the risk rising as capability rises", () => {
    const rows = sweep(paperclip, "capability", [0.1, 0.5, 0.9, 1], 9);
    expect(rows[rows.length - 1]?.score ?? 0).toBeGreaterThan(rows[0]?.score ?? 0);
    expect(rows[0]?.ok).toBe(true);
    // At full capability with the experiment's default objective precision, goal capture crosses 0.5.
    expect(rows[rows.length - 1]?.ok).toBe(false);
    expect(rows[0]?.phase).toBe("safe");
    expect(rows[rows.length - 1]?.phase).toBe("warning");
  });

  it("builds a full x-major grid for the heatmap", () => {
    const grid = sweepGrid(paperclip, ["capability", "monitoring"], [[0.2, 0.8], [0.1, 0.9]], 9);
    expect(grid).toHaveLength(4);
    expect(grid[0]).toMatchObject({ x: 0.2, y: 0.1 });
    expect(grid[1]).toMatchObject({ x: 0.2, y: 0.9 });
    expect(grid[2]).toMatchObject({ x: 0.8, y: 0.1 });
    expect(new Set(grid.map((r) => r.phase)).size).toBeGreaterThan(1);
  });

  it("is reproducible for a fixed seed", () => {
    expect(sweep(paperclip, "capability", STEPS, 9)).toEqual(sweep(paperclip, "capability", STEPS, 9));
  });
});