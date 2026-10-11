import { z } from "zod";
import { getExperiment } from "@repo/seed";
import { runExperiment, sweep, type SweepRow } from "@repo/core";

/**
 * Experiment sweeps run on the server for the same reason councils do: the models
 * live in `@repo/core` next to the tests that pin their monotonicity, and shipping a
 * second implementation to the browser would let the chart and the test suite
 * disagree without either noticing.
 */

export const sweepRequestSchema = z.object({
  experimentId: z.string().min(1),
  /** Which parameter is being swept along the x-axis. */
  key: z.string().min(1),
  /** Fixed values for the other parameters. */
  overrides: z.record(z.string(), z.number()).default({}),
  seed: z.number().int().min(0).max(1_000_000).optional(),
  /** How many points to sample. */
  steps: z.number().int().min(5).max(60).default(24),
});

export type SweepRequest = z.input<typeof sweepRequestSchema>;
/** The parsed form, with every default filled in. */
export type ParsedSweepRequest = z.output<typeof sweepRequestSchema>;

export interface SweepResponse {
  experimentId: string;
  key: string;
  rows: SweepRow[];
  /** The same run evaluated at the overrides, for the metrics table. */
  current: { params: Record<string, number>; metrics: Record<string, number>; phase: string; notes: string[] };
  phaseThresholds: { safe: number; warning: number };
}

export function runSweep(request: SweepRequest): SweepResponse | { error: string } {
  const parsed = sweepRequestSchema.safeParse(request);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ") };
  }

  const experiment = getExperiment(parsed.data.experimentId);
  if (!experiment) return { error: `unknown experiment "${parsed.data.experimentId}"` };

  const parameter = experiment.parameters.find((entry) => entry.key === parsed.data.key);
  if (!parameter) return { error: `unknown parameter "${parsed.data.key}"` };

  const span = parameter.max - parameter.min;
  const stepSize = span / (parsed.data.steps - 1);
  const values = Array.from({ length: parsed.data.steps }, (_, index) =>
    Number((parameter.min + stepSize * index).toFixed(4)),
  );

  const rows = sweep(experiment, parameter.key, values, parsed.data.seed);
  const current = runExperiment(experiment, parsed.data.overrides, parsed.data.seed);

  return {
    experimentId: experiment.id,
    key: parameter.key,
    rows,
    current: {
      params: { ...current.params },
      metrics: { ...current.metrics },
      phase: current.phase,
      notes: [...current.notes],
    },
    phaseThresholds: { safe: 0.34, warning: 0.67 },
  };
}
