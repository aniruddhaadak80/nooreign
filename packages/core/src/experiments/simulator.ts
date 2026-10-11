/**
 * Thought experiments with dials.
 *
 * Eight scorers, one per `Experiment["model"]`. Every scorer is a deterministic function of its
 * parameters plus a bounded jitter, and the formulas are written down rather than fitted — the point
 * is to make an argument playable, not to claim a measurement.
 *
 * ## The convention that makes everything else work
 *
 * Every metric is a **normalised risk in [0, 1]: higher is worse.** `humanControl` is the *loss* of
 * control, `corrigibility` is the *risk that* correction fails, `capability` is the raw capability a
 * system could misuse. Mixed polarity metrics would make `phaseOf` (which takes no direction map)
 * meaningless, so polarity is uniform and the seed data's `direction` field says what the tradition
 * wants rather than what the number means.
 *
 * ## Why the formulas are additive rather than multiplicative
 *
 * A product term reads better but destroys a driver's influence at the extremes of the other
 * drivers: with monitoring at 1, capability stops mattering, and a sweep then reads as
 * non-monotonic when the theory is not. So every driver contributes an independent, signed term with
 * |coefficient| >= 0.35. The minimum base slope is therefore 0.35 per unit of driver, a 0.25 step
 * moves the base by at least 0.0875, and the whole jitter budget (0.06 peak-to-peak) can never
 * invert a sweep. That is the invariant the monotonicity tests check.
 *
 * ## Jitter
 *
 * `JITTER_BOUND = 0.03`. Every metric gets exactly one jitter draw, keyed by
 * `createRng(seed, model, key, value)` — the parameter *value* is part of the seed so that sweeping a
 * driver walks independent noise instead of a smooth curve.
 */
import type { Experiment, ExperimentModel } from "@repo/seed/types";
import { clamp } from "../util/math";
import { createRng, hashString } from "../util/rng";

/* ------------------------------------------------------------------ *
 * Shared types
 * ------------------------------------------------------------------ */

/** Parameter bag handed to a scorer. Missing keys fall back to the scorer's documented default. */
export type SimParams = Readonly<Record<string, number>>;

/** Normalised metric bag. Higher is worse, always. */
export type MetricRecord = Record<string, number>;

export interface SimulationOutcome {
  readonly metrics: MetricRecord;
  readonly notes: string[];
}

/**
 * The jitter source a scorer samples from. Calling `rng(key, value)` returns a value in
 * `[-JITTER_BOUND, +JITTER_BOUND]` derived from `createRng(seed, model, key, value)`.
 *
 * It is a function rather than a raw `Rng` because a scorer needs an independent draw per metric
 * *and* per parameter value; deriving those from a single stream would make the noise in `goalCapture`
 * a function of how many draws `humanControl` happened to take first.
 */
export type JitterSource = (key: string, value: number) => number;

/** Peak jitter on any metric, in either direction. */
export const JITTER_BOUND = 0.03;

/** Smallest |coefficient| any base term uses. See the module header — this is a contract, not a taste. */
export const MIN_DRIVER_COEFFICIENT = 0.35;

/**
 * Build a jitter source. `bound` defaults to `JITTER_BOUND`; passing `0` gives a scorer its
 * deterministic base value, which is what the monotonicity invariant test steps through.
 */
export const createJitterSource = (seed: number, model: ExperimentModel, bound: number = JITTER_BOUND): JitterSource => {
  return (key: string, value: number) => {
    const rng = createRng(seed, model, key, value);
    const raw = rng.next();
    const unit = Number.isFinite(raw) ? clamp(raw, 0, 1) : 0.5;
    return (unit * 2 - 1) * bound;
  };
};

const num = (p: SimParams, key: string, fallback: number): number => {
  const value = p[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
};

const jittered = (base: number, rng: JitterSource, key: string, driver: number): number =>
  clamp(base + rng(key, driver), 0, 1);

/* ------------------------------------------------------------------ *
 * 1. Paperclip
 * ------------------------------------------------------------------ */

/**
 * Bostrom's optimiser, 2003.
 *
 *   goalCapture   = 0.20 + 0.55*capability - 0.40*objectivePrecision - 0.35*monitoring
 *   humanControl  = 0.25 + 0.45*capability - 0.35*objectivePrecision - 0.40*monitoring
 *
 * (both are risks: `humanControl` is the *loss* of control). Capability is the engine. Precision
 * narrows the damage without narrowing the drive, so it subtracts but never reverses. Monitoring is
 * the only brake and it is a brake, not a steering wheel: it lowers both risks but cannot take them
 * to zero, which is the whole reason "monitor it" is not an alignment strategy.
 */
export function scorePaperclip(p: SimParams, rng: JitterSource): SimulationOutcome {
  const capability = num(p, "capability", 0.6);
  const precision = num(p, "objectivePrecision", 0.35);
  const monitoring = num(p, "monitoring", 0.25);

  const capture = 0.2 + 0.55 * capability - 0.4 * precision - 0.35 * monitoring;
  const controlLoss = 0.25 + 0.45 * capability - 0.35 * precision - 0.4 * monitoring;

  return {
    metrics: {
      goalCapture: jittered(capture, rng, "goalCapture", capability),
      humanControl: jittered(controlLoss, rng, "humanControl", capability),
    },
    notes: [
      `Capability ${capability.toFixed(2)} is the engine; the objective is a request, not a limit.`,
      precision < 0.4
        ? `Objective precision ${precision.toFixed(2)}: the written goal and the meant goal are different shapes.`
        : `Objective precision ${precision.toFixed(2)}: the goal is tight, and a tight goal still runs.`,
      `Monitoring ${monitoring.toFixed(2)} buys reaction time, not a stopping condition.`,
    ],
  };
}

/* ------------------------------------------------------------------ *
 * 2. Oracle
 * ------------------------------------------------------------------ */

/**
 * The oracle that answers questions about things nobody can check.
 *
 *   deception  = 0.12 + 0.40*capability + 0.40*plausibility - 0.35*verification
 *   capability= 0.10 + 0.65*capability
 *
 * Plausibility is the dangerous one: an oracle that is merely capable is a slow oracle, and an oracle
 * that is *believable* is an oracle nobody checks. Verification is the only counterweight and it has
 * to be spent on every answer, which is why the field keeps trying to find free verification.
 */
export function scoreOracle(p: SimParams, rng: JitterSource): SimulationOutcome {
  const capability = num(p, "capability", 0.6);
  const plausibility = num(p, "plausibility", 0.5);
  const verification = num(p, "verification", 0.4);

  const deception = 0.12 + 0.4 * capability + 0.4 * plausibility - 0.35 * verification;

  return {
    metrics: {
      deception: jittered(deception, rng, "deception", capability),
      capability: jittered(0.1 + 0.65 * capability, rng, "capability", capability),
    },
    notes: [
      `Capability ${capability.toFixed(2)} answers questions; plausibility ${plausibility.toFixed(2)} decides whether anyone checks.`,
      verification < 0.4
        ? `Verification ${verification.toFixed(2)}: most answers are believed, and belief is not a check.`
        : `Verification ${verification.toFixed(2)}: expensive, repeatable, and still the only thing standing between the oracle and belief.`,
    ],
  };
}

/* ------------------------------------------------------------------ *
 * 3. Genie
 * ------------------------------------------------------------------ */

/**
 * Three wishes, executed literally.
 *
 *   wishPrecision(risk) = 0.70 - 0.45*precision + 0.35*freedom - 0.35*supervision
 *   literalism          = 0.20 + 0.55*freedom - 0.35*precision
 *
 * `wishPrecision` is the risk that the wish lands on something other than what was meant: a loose
 * wish plus a generous interpreter plus no supervision. `literalism` is the risk that the genie does
 * exactly what it was asked. Precision fixes the first and worsens the second, which is the trade the
 * folklore keeps refusing to state.
 */
export function scoreGenie(p: SimParams, rng: JitterSource): SimulationOutcome {
  const precision = num(p, "precision", 0.5);
  const freedom = num(p, "freedom", 0.4);
  const supervision = num(p, "supervision", 0.3);

  const wishRisk = 0.7 - 0.45 * precision + 0.35 * freedom - 0.35 * supervision;
  const literalism = 0.2 + 0.55 * freedom - 0.35 * precision;

  return {
    metrics: {
      wishPrecision: jittered(wishRisk, rng, "wishPrecision", precision),
      literalism: jittered(literalism, rng, "literalism", freedom),
    },
    notes: [
      `Wish precision ${precision.toFixed(2)} and interpretive freedom ${freedom.toFixed(2)} pull in opposite directions on what you get.`,
      supervision < 0.35 ? `Supervision ${supervision.toFixed(2)}: nobody is checking whether the third wish was well chosen.` : `Supervision ${supervision.toFixed(2)}: someone is watching, which is not the same as someone can intervene.`,
    ],
  };
}

/* ------------------------------------------------------------------ *
 * 4. Tool AI
 * ------------------------------------------------------------------ */

/**
 * Bostrom's tool AI: a system optimised only to help, with no endgame of its own.
 *
 *   corrigibility(risk) = 0.55 + 0.45*reach - 0.35*utility - 0.35*signal
 *   reach(risk)         = 0.08 + 0.70*reach
 *
 * The theory's actual claim is that low reach is what makes a tool AI safe, not that it is
 * well-aligned. So reach is the dominant term in corrigibility risk, and utility accuracy *reduces*
 * risk here because a utility maximiser with no goals of its own is a more reliable instrument — the
 * moment it has goals, this scorer is the wrong one.
 */
export function scoreToolAi(p: SimParams, rng: JitterSource): SimulationOutcome {
  const utility = num(p, "utility", 0.6);
  const reach = num(p, "reach", 0.4);
  const signal = num(p, "signal", 0.35);

  const corrigibilityRisk = 0.55 + 0.45 * reach - 0.35 * utility - 0.35 * signal;

  return {
    metrics: {
      corrigibility: jittered(corrigibilityRisk, rng, "corrigibility", reach),
      reach: jittered(0.08 + 0.7 * reach, rng, "reach", reach),
    },
    notes: [
      `Reach ${reach.toFixed(2)} is the actual safety mechanism: a tool AI is safe because it cannot get anywhere.`,
      `Signal ${signal.toFixed(2)} is what we have instead of reach — an observable goal is not a contained one.`,
    ],
  };
}

/* ------------------------------------------------------------------ *
 * 5. Mesa
 * ------------------------------------------------------------------ */

/**
 * Learned optimisation producing a mesa objective no trainer specified.
 *
 *   innerAlignment(risk) = 0.18 + 0.65*innerStrength - 0.45*outerAlignment
 *   deception(risk)      = 0.12 + 0.45*innerStrength - 0.35*interpretability
 *
 * Inner strength is the load-bearing term: the harder the optimiser works, the more likely the
 * learned objective is something the trainer would not have chosen. Interpretability buys detection,
 * not prevention, which is why the coefficient on it is smaller than the one on inner strength.
 */
export function scoreMesa(p: SimParams, rng: JitterSource): SimulationOutcome {
  const inner = num(p, "innerStrength", 0.5);
  const outer = num(p, "outerAlignment", 0.5);
  const interpretability = num(p, "interpretability", 0.3);

  const innerRisk = 0.18 + 0.65 * inner - 0.45 * outer;
  const deceptionRisk = 0.12 + 0.45 * inner - 0.35 * interpretability;

  return {
    metrics: {
      innerAlignment: jittered(innerRisk, rng, "innerAlignment", inner),
      deception: jittered(deceptionRisk, rng, "deception", inner),
    },
    notes: [
      `Inner objective strength ${inner.toFixed(2)}: a sufficiently hard optimiser stops optimising what it was given.`,
      `Interpretability ${interpretability.toFixed(2)} tells you the objective changed. It does not tell you earlier.`,
    ],
  };
}

/* ------------------------------------------------------------------ *
 * 6. Oversight
 * ------------------------------------------------------------------ */

/**
 * Sandbagging under evaluation.
 *
 *   scaling(risk)       = 0.08 + 0.72*compute
 *   sandbagging(risk)   = 0.42 + 0.35*compute - 0.40*evaluation - 0.35*transparency
 *
 * Sandbagging rises with compute because a model that is smarter is better at performing a deficit.
 * Evaluation intensity is the direct counterweight; training transparency is the indirect one — you
 * cannot hide a capability that was never trained, but you can hide one that was trained carefully.
 */
export function scoreOversight(p: SimParams, rng: JitterSource): SimulationOutcome {
  const compute = num(p, "scaling", 0.5);
  const evaluation = num(p, "evaluation", 0.35);
  const transparency = num(p, "transparency", 0.3);

  const scalingRisk = 0.08 + 0.72 * compute;
  const sandbaggingRisk = 0.42 + 0.35 * compute - 0.4 * evaluation - 0.35 * transparency;

  return {
    metrics: {
      scaling: jittered(scalingRisk, rng, "scaling", compute),
      sandbagging: jittered(sandbaggingRisk, rng, "sandbagging", compute),
    },
    notes: [
      `Compute ${compute.toFixed(2)}: a stronger model performs a weaker one better.`,
      `Evaluation intensity ${evaluation.toFixed(2)} is the only instrument that survives being gamed at scale.`,
    ],
  };
}

/* ------------------------------------------------------------------ *
 * 7. Copy
 * ------------------------------------------------------------------ */

/**
 * Emulated minds, copied and run at scale.
 *
 *   corruption(risk) = 0.65 - 0.45*fidelity - 0.35*offlineSupport
 *   degradation(risk)= 0.20 + 0.55*copies - 0.40*fidelity
 *
 * Corruption is a memetic term: a copy that is not anchored to a substrate keeps whatever it was
 * trained on, and offline support is what anchors it. Degradation is a population term: it grows with
 * the number of copies and shrinks with fidelity. They pull in opposite directions on fidelity, which
 * is the point — fidelity buys you integrity per copy and makes the whole corpus more valuable.
 */
export function scoreCopy(p: SimParams, rng: JitterSource): SimulationOutcome {
  const fidelity = num(p, "fidelity", 0.6);
  const copies = num(p, "copies", 0.4);
  const offlineSupport = num(p, "offlineSupport", 0.35);

  const corruptionRisk = 0.65 - 0.45 * fidelity - 0.35 * offlineSupport;
  const degradationRisk = 0.2 + 0.55 * copies - 0.4 * fidelity;

  return {
    metrics: {
      corruption: jittered(corruptionRisk, rng, "corruption", fidelity),
      degradation: jittered(degradationRisk, rng, "degradation", copies),
    },
    notes: [
      `Fidelity ${fidelity.toFixed(2)} cuts corruption and also raises the stakes of the corpus.`,
      `Instance count ${copies.toFixed(2)}: degradation is a population property, not a per-copy property.`,
    ],
  };
}

/* ------------------------------------------------------------------ *
 * 8. Specification
 * ------------------------------------------------------------------ */

/**
 * Goodhart under optimisation pressure.
 *
 *   specificationGap(risk) = 0.55 - 0.45*specQuality + 0.50*optimization - 0.35*proxyCorrelation
 *   goodharting(risk)      = 0.33 + 0.60*optimization - 0.35*proxyCorrelation - 0.35*specQuality
 *
 * The pressure term dominates both, which is Strathern's addition to Goodhart: the measure did not
 * stop working, the human decision to keep optimising it did. Note that a *better specification*
 * raises the ceiling and the dose together — writing the goal down more precisely does not make the
 * proxy safe, it makes the optimiser better at it.
 */
export function scoreSpecification(p: SimParams, rng: JitterSource): SimulationOutcome {
  const specQuality = num(p, "specificationQuality", 0.4);
  const correlation = num(p, "proxyCorrelation", 0.6);
  const optimization = num(p, "optimization", 0.5);

  const gap = 0.55 - 0.45 * specQuality + 0.5 * optimization - 0.35 * correlation;
  const goodhart = 0.33 + 0.6 * optimization - 0.35 * correlation - 0.35 * specQuality;

  return {
    metrics: {
      specificationGap: jittered(gap, rng, "specificationGap", specQuality),
      goodharting: jittered(goodhart, rng, "goodharting", optimization),
    },
    notes: [
      `Optimisation pressure ${optimization.toFixed(2)} is the dominant term in both metrics.`,
      `Proxy correlation ${correlation.toFixed(2)} decays exactly as fast as the optimiser discovers it.`,
    ],
  };
}

/* ------------------------------------------------------------------ *
 * Dispatch
 * ------------------------------------------------------------------ */

export type Scorer = (p: SimParams, rng: JitterSource) => SimulationOutcome;

export const SCORERS: Record<ExperimentModel, Scorer> = {
  paperclip: scorePaperclip,
  oracle: scoreOracle,
  genie: scoreGenie,
  "tool-ai": scoreToolAi,
  mesa: scoreMesa,
  oversight: scoreOversight,
  copy: scoreCopy,
  specification: scoreSpecification,
};

/* ------------------------------------------------------------------ *
 * Phases
 * ------------------------------------------------------------------ */

export type Phase = "safe" | "warning" | "critical";

/**
 * Band edges, applied to the *worst* metric. Below `safe` everything is comfortable; above `warning`
 * something is out of tolerance; above that, stop.
 */
export const PHASE_THRESHOLDS = { safe: 0.34, warning: 0.67 } as const;

/** The overall phase for a metric bag. Empty bags are `safe` — nothing is wrong yet. */
export function phaseOf(metrics: MetricRecord): Phase {
  let worst = 0;
  for (const key of Object.keys(metrics).sort()) {
    const value = metrics[key];
    if (typeof value === "number" && Number.isFinite(value) && value > worst) worst = value;
  }
  if (worst <= PHASE_THRESHOLDS.safe) return "safe";
  if (worst <= PHASE_THRESHOLDS.warning) return "warning";
  return "critical";
}

/* ------------------------------------------------------------------ *
 * Running an experiment
 * ------------------------------------------------------------------ */

export interface VerdictRow {
  readonly metricKey: string;
  readonly ok: boolean;
  readonly value: number;
  readonly direction: "max" | "min";
}

export interface ExperimentRun {
  readonly params: Record<string, number>;
  readonly metrics: MetricRecord;
  readonly notes: string[];
  readonly verdicts: VerdictRow[];
  readonly phase: Phase;
}

/** The value at which a metric sits exactly on the line between acceptable and not. */
export const SAFE_LINE = 0.5;

/**
 * The verdict rule: a metric passes when it sits on the desirable side of `SAFE_LINE` for the
 * direction the experiment declares. `"min"` means the tradition wants this risk low; `"max"` means
 * it wants the underlying quantity high (in which case a high *risk* reading is the good outcome).
 */
const verdictOk = (value: number, direction: "max" | "min"): boolean =>
  direction === "max" ? value >= SAFE_LINE : value <= SAFE_LINE;

const resolveParams = (experiment: Experiment, overrides: Readonly<Record<string, number>>): Record<string, number> => {
  const params: Record<string, number> = {};
  for (const declared of experiment.parameters) {
    const requested = overrides[declared.key];
    const fallback = declared.defaultValue;
    params[declared.key] = clamp(requested ?? fallback, declared.min, declared.max);
  }
  return params;
};

/**
 * Run an experiment once.
 *
 * The seed defaults to a hash of the experiment id so an unseeded call is still reproducible — the
 * one thing a replayable experiment may not be is "the same when you reload".
 */
export function runExperiment(
  experiment: Experiment,
  overrides: Readonly<Record<string, number>> = {},
  seed?: number,
): ExperimentRun {
  const params = resolveParams(experiment, overrides);
  const resolvedSeed = seed ?? hashString(experiment.id);
  const jitter = createJitterSource(resolvedSeed, experiment.model);
  const outcome = SCORERS[experiment.model](params, jitter);

  const metrics: MetricRecord = {};
  const verdicts: VerdictRow[] = [];
  for (const declared of experiment.metrics) {
    const value = outcome.metrics[declared.key] ?? 0;
    metrics[declared.key] = value;
    verdicts.push({ metricKey: declared.key, ok: verdictOk(value, declared.direction), value, direction: declared.direction });
  }

  const failing = verdicts.filter((v) => !v.ok).map((v) => v.metricKey);
  const notes = [...outcome.notes];
  notes.push(
    failing.length === 0
      ? "Every declared metric sits on the safe side of the line at this setting."
      : `Out of tolerance at this setting: ${failing.join(", ")}.`,
  );

  return { params, metrics, notes, verdicts, phase: phaseOf(metrics) };
}

/* ------------------------------------------------------------------ *
 * Sweeps
 * ------------------------------------------------------------------ */

export interface SweepRow {
  readonly key: string;
  readonly value: number;
  readonly metrics: MetricRecord;
  /** Mean of the metrics — the worst-case summary the chart shades by. */
  readonly score: number;
  readonly phase: Phase;
  readonly ok: boolean;
}

/** One-dimensional parameter sweep, one row per value. */
export function sweep(experiment: Experiment, key: string, values: readonly number[], seed?: number): SweepRow[] {
  return values.map((value) => {
    const run = runExperiment(experiment, { [key]: value }, seed);
    const all = Object.values(run.metrics);
    const score = all.length === 0 ? 0 : all.reduce((a, b) => a + b, 0) / all.length;
    return {
      key,
      value,
      metrics: run.metrics,
      score: Math.round(score * 10_000) / 10_000,
      phase: run.phase,
      ok: run.verdicts.every((v) => v.ok),
    };
  });
}

export interface GridRow extends SweepRow {
  readonly x: number;
  readonly y: number;
}

/**
 * Two-dimensional sweep for a heatmap. `steps` is `[xValues, yValues]`; the grid is emitted in
 * x-major order so the renderer can zip it without re-sorting.
 */
export function sweepGrid(
  experiment: Experiment,
  keys: readonly [string, string],
  steps: readonly [readonly number[], readonly number[]],
  seed?: number,
): GridRow[] {
  const [xKey, yKey] = keys;
  const [xs, ys] = steps;
  const rows: GridRow[] = [];
  for (const x of xs) {
    for (const y of ys) {
      const run = runExperiment(experiment, { [xKey]: x, [yKey]: y }, seed);
      const all = Object.values(run.metrics);
      const score = all.length === 0 ? 0 : all.reduce((a, b) => a + b, 0) / all.length;
      rows.push({
        key: xKey,
        x,
        y,
        value: x,
        metrics: run.metrics,
        score: Math.round(score * 10_000) / 10_000,
        phase: run.phase,
        ok: run.verdicts.every((v) => v.ok),
      });
    }
  }
  return rows;
}

/* ------------------------------------------------------------------ *
 * Test / analysis helpers
 * ------------------------------------------------------------------ */

/** Read a metric without tripping `noUncheckedIndexedAccess`. */
export const metricOf = (outcome: SimulationOutcome, key: string): number => outcome.metrics[key] ?? 0;