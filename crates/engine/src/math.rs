//! Small, dependency-free numeric helpers shared by every module in the crate.
//!
//! # Why this module is so fussy
//!
//! The TypeScript engine in `packages/core` is allowed to be a *reference* only
//! in one direction: it is tested against fixtures this crate generates. That
//! means every rounding decision here is a contract. Where TS rounds, we round
//! to the same number of decimal places, with the same tie-breaking, and where
//! the two languages could disagree we say so in a comment rather than picking
//! whichever is more convenient here.
//!
//! The forbidden shortcuts are:
//!
//! * reimplementing a formula "better" — an improved formula produces a
//!   different number and the fixture stops being evidence;
//! * relying on `f64` display formatting for anything that reaches the wire —
//!   the JSON writer in [`crate::json`] owns number formatting;
//! * letting a zero denominator leak an `Infinity` or a `NaN` into a verdict.

/// Restrict `n` to `[min, max]`.
///
/// A `NaN` input collapses to `min` so a caller never renders `NaN%`.
///
/// Port of `clamp` in `packages/core/src/util/math.ts`.
#[must_use]
pub fn clamp(n: f64, min: f64, max: f64) -> f64 {
    if n.is_nan() {
        return min;
    }
    if n < min {
        return min;
    }
    if n > max {
        return max;
    }
    n
}

/// Round to four decimal places, the engine's canonical display precision.
///
/// Port of `round(n, 4)` in `packages/core/src/util/math.ts`:
///
/// ```text
/// const scaled = n * 10_000;
/// Math.round(Math.abs(scaled) + EPSILON * Math.abs(scaled)) * Math.sign(scaled) / 10_000
/// ```
///
/// # On `Math.round` vs `f64::round`
///
/// JavaScript's `Math.round` is specified as *half up toward +infinity*, not
/// half-away-from-zero: `Math.round(-2.5) === -2`. The TS implementation never
/// exposes that difference, because it feeds `Math.round` a non-negative value
/// (`Math.abs(scaled)`) and re-applies the sign afterwards with
/// `Math.sign(scaled)`. The effective behaviour is therefore round
/// half-away-from-zero, which is exactly what [`f64::round`] does, so this port
/// calls [`f64::round`] directly.
///
/// The one residual divergence is a value that lands exactly on a `.5` tie *and*
/// is large enough that `y + 0.5` rounds down to `y` in binary floating point
/// (`Math.round` computes `floor(y + 0.5)`; [`f64::round`] rounds correctly).
/// The engine's scaled values are bounded by a few hundred, where the two
/// agree, so this cannot arise in a verdict — but if a future input ever makes
/// it reachable, this is the line to change, not the tolerance in a test.
#[must_use]
pub fn round4(n: f64) -> f64 {
    if !n.is_finite() {
        return n;
    }
    let factor = 10_000.0;
    let scaled = n * factor;
    let magnitude = scaled.abs();
    let rounded = (magnitude + f64::EPSILON * magnitude).round() * scaled.signum();
    rounded / factor
}

/// Sum a slice, left to right.
///
/// Port of `sum` in `packages/core/src/util/math.ts`. The accumulation order
/// matters for reproducibility, so this is deliberately a plain left-to-right
/// loop rather than anything that might reorder or pair-reduce.
#[must_use]
pub fn sum(xs: &[f64]) -> f64 {
    let mut total = 0.0;
    for &x in xs {
        total += x;
    }
    total
}

/// Arithmetic mean; an empty slice is `0.0` rather than a `NaN`.
///
/// Port of `mean` in `packages/core/src/util/math.ts`.
#[must_use]
pub fn mean(xs: &[f64]) -> f64 {
    if xs.is_empty() {
        return 0.0;
    }
    sum(xs) / xs.len() as f64
}

/// Euclidean inner product over the shorter of the two slices.
///
/// Port of `dot` in `packages/core/src/util/math.ts`.
#[must_use]
pub fn dot(a: &[f64], b: &[f64]) -> f64 {
    let n = a.len().min(b.len());
    let mut total = 0.0;
    for i in 0..n {
        total += a[i] * b[i];
    }
    total
}

/// Weighted average of `values` under `weights`.
///
/// When the weights sum to zero they carry no information, so this falls back
/// to the plain mean rather than dividing by zero.
///
/// Port of `weightedMean` in `packages/core/src/util/math.ts`.
#[must_use]
pub fn weighted_mean(values: &[f64], weights: &[f64]) -> f64 {
    if values.is_empty() {
        return 0.0;
    }
    let w = sum(weights);
    if w == 0.0 {
        return mean(values);
    }
    let n = values.len().min(weights.len());
    let mut acc = 0.0;
    for i in 0..n {
        acc += values[i] * weights[i];
    }
    acc / w
}

/// Division that yields `0.0` instead of `Infinity`/`NaN` when `d == 0`.
///
/// Port of `safeDiv` in `packages/core/src/util/math.ts`. Note that the guard
/// is `d == 0.0`, which in Rust — as in JS — is true for `-0.0` as well.
#[must_use]
pub fn safe_div(n: f64, d: f64) -> f64 {
    if d == 0.0 {
        return 0.0;
    }
    let result = n / d;
    if result.is_finite() {
        result
    } else {
        0.0
    }
}

/// Largest value in the slice, or `0.0` for an empty slice.
///
/// Port of `maxOf` in `packages/core/src/util/math.ts`.
#[must_use]
pub fn max_of(xs: &[f64]) -> f64 {
    if xs.is_empty() {
        return 0.0;
    }
    let mut best = f64::NEG_INFINITY;
    for &x in xs {
        if x > best {
            best = x;
        }
    }
    best
}

/// Smallest value in the slice, or `0.0` for an empty slice.
///
/// Port of `minOf` in `packages/core/src/util/math.ts`.
#[must_use]
pub fn min_of(xs: &[f64]) -> f64 {
    if xs.is_empty() {
        return 0.0;
    }
    let mut best = f64::INFINITY;
    for &x in xs {
        if x < best {
            best = x;
        }
    }
    best
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Tolerant comparison for hand-derived values that survive more than one
    /// floating point operation.
    fn close(a: f64, b: f64, eps: f64) -> bool {
        (a - b).abs() <= eps
    }

    #[test]
    fn clamp_pins_both_ends_and_passes_the_middle_through() {
        assert_eq!(clamp(0.5, 0.0, 1.0), 0.5);
        assert_eq!(clamp(-3.0, 0.0, 1.0), 0.0);
        assert_eq!(clamp(9.0, 0.0, 1.0), 1.0);
        // Boundaries are inclusive.
        assert_eq!(clamp(0.0, 0.0, 1.0), 0.0);
        assert_eq!(clamp(1.0, 0.0, 1.0), 1.0);
        // A distance of [0, 2] is the real clamp shape used by `distance`.
        assert_eq!(clamp(3.0, 0.0, 2.0), 2.0);
        assert_eq!(clamp(-3.0, 0.0, 2.0), 0.0);
    }

    #[test]
    fn clamp_collapses_nan_to_the_minimum() {
        assert_eq!(clamp(f64::NAN, 0.25, 1.0), 0.25);
        assert_eq!(clamp(f64::NAN, -1.0, 1.0), -1.0);
        assert!(!clamp(f64::NAN, 0.0, 1.0).is_nan());
    }

    #[test]
    fn round4_matches_hand_computed_decimals() {
        assert_eq!(round4(0.0), 0.0);
        assert_eq!(round4(1.0), 1.0);
        assert_eq!(round4(0.123456), 0.1235);
        assert_eq!(round4(0.123454), 0.1235);
        assert_eq!(round4(0.33934426229508197), 0.3393);
        assert_eq!(round4(0.6833333333333333), 0.6833);
        assert_eq!(round4(0.6666666666666666), 0.6667);
        assert_eq!(round4(1.0 / 3.0), 0.3333);
    }

    #[test]
    fn round4_rounds_half_away_from_zero_on_both_signs() {
        assert_eq!(round4(0.00005), 0.0001);
        assert_eq!(round4(-0.00005), -0.0001);
        assert_eq!(round4(0.00015), 0.0002);
        assert_eq!(round4(-0.00015), -0.0002);
        assert_eq!(round4(1.23455), 1.2346);
        assert_eq!(round4(-1.23455), -1.2346);
    }

    #[test]
    fn round4_neutralises_binary_float_dust() {
        assert_eq!(0.1 + 0.2, 0.30000000000000004);
        assert_eq!(round4(0.1 + 0.2), 0.3);
        assert_eq!(round4(0.1 + 0.7), 0.8);
        assert_eq!(round4(1.035 / 3.05), 0.3393);
    }

    #[test]
    fn round4_passes_non_finite_values_through_like_the_ts_original() {
        assert!(round4(f64::INFINITY).is_infinite());
        assert!(round4(f64::NEG_INFINITY).is_infinite());
        assert!(round4(f64::NAN).is_nan());
    }

    #[test]
    fn sum_mean_and_the_empty_case() {
        assert_eq!(sum(&[]), 0.0);
        assert_eq!(sum(&[1.0, 2.0, 3.0]), 6.0);
        assert_eq!(mean(&[]), 0.0);
        assert_eq!(mean(&[1.0, 2.0, 3.0]), 2.0);
        assert_eq!(mean(&[0.5; 6]), 0.5);
        // 1.5 / 6, the mean of the paperclip "continue" deltas.
        assert_eq!(round4(mean(&[0.4, 0.15, 0.3, 0.25, 0.2, 0.2])), 0.25);
    }

    #[test]
    fn dot_uses_the_shorter_slice() {
        assert_eq!(dot(&[1.0, 2.0, 3.0], &[4.0, 5.0, 6.0]), 32.0);
        assert_eq!(dot(&[1.0, 2.0, 3.0], &[4.0, 5.0]), 14.0);
        assert_eq!(dot(&[], &[1.0, 2.0]), 0.0);
        // The six-axis case: 0.95+0.2+0.35+0.55+0.3+0.25 = 2.6, which is what a
        // `score_option` denominator is drawn from. Float dust and all: this is
        // why `score_option` normalises by the *unrounded* sum.
        assert!(close(
            dot(&[1.0; 6], &[0.95, 0.2, 0.35, 0.55, 0.3, 0.25]),
            2.6,
            1e-12
        ));
    }

    #[test]
    fn weighted_mean_falls_back_when_the_weights_are_all_zero() {
        assert_eq!(weighted_mean(&[1.0, 3.0], &[1.0, 1.0]), 2.0);
        assert_eq!(weighted_mean(&[1.0, 3.0], &[1.0, 3.0]), 2.5);
        assert_eq!(weighted_mean(&[1.0, 3.0], &[0.0, 0.0]), 2.0);
        assert_eq!(weighted_mean(&[], &[1.0]), 0.0);
        // Truncated to the shorter slice, then divided by the full weight sum.
        assert_eq!(weighted_mean(&[1.0, 1.0], &[1.0, 1.0, 1.0]), 2.0 / 3.0);
    }

    #[test]
    fn safe_div_never_leaks_infinity_or_nan() {
        assert_eq!(safe_div(6.0, 3.0), 2.0);
        assert_eq!(safe_div(1.0, 0.0), 0.0);
        assert_eq!(safe_div(1.0, -0.0), 0.0);
        assert_eq!(safe_div(0.0, 0.0), 0.0);
        // 1e308 / 1e-308 overflows to infinity in f64 and is neutralised.
        assert_eq!(safe_div(1e308, 1e-308), 0.0);
        assert_eq!(safe_div(-6.0, 3.0), -2.0);
    }

    #[test]
    fn min_and_max_default_to_zero_on_an_empty_slice() {
        assert_eq!(max_of(&[]), 0.0);
        assert_eq!(min_of(&[]), 0.0);
        assert_eq!(max_of(&[0.95, 0.2, 0.35, 0.55, 0.3, 0.25]), 0.95);
        assert_eq!(min_of(&[0.95, 0.2, 0.35, 0.55, 0.3, 0.25]), 0.2);
        assert!(close(max_of(&[-3.0, -1.0]), -1.0, 0.0));
        assert!(close(min_of(&[-3.0, -1.0]), -3.0, 0.0));
    }
}
