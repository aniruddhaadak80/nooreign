//! The axiom calculus: how an advisor's moral weights meet an option's effects.
//!
//! This is the centre of the whole engine. A Nooreign verdict is not an
//! opinion, it is arithmetic. An advisor is a six-vector over welfare, rights,
//! virtue, care, justice and agency; an option is another six-vector of how
//! much of each it honours. [`score_option`] is the normalised dot product of
//! the two, and every downstream number — the ballot, the margin, the dissent —
//! is derived from it rather than from a hand-written opinion about any
//! dilemma.
//!
//! Every function here is a line-for-line port of the identically-named export
//! in `packages/core/src/ethics/axioms.ts`. The TS tests that exercise these
//! functions (`packages/core/src/ethics/axioms.test.ts`) are ported into the
//! `#[cfg(test)] mod tests` at the bottom of this file with the same worked
//! examples, because a looser expectation here would make the parity fixture
//! worthless.

use crate::math::{clamp, dot, max_of, min_of, round4, safe_div, sum};

/// The number of moral axes. Fixed at six by the domain, not by taste.
pub const AXES: usize = 6;

/// The canonical axis order: `[welfare, rights, virtue, care, justice, agency]`.
///
/// Every array in this crate, every `AxiomVector`, every trace and every
/// emitted fixture is in this order. Port of `AXIOM_KEYS` in
/// `packages/seed/src/types.ts`.
///
/// # Tie-breaking
///
/// Index order is load-bearing, not incidental. [`dominant_axis`],
/// [`rank_axes`], [`describe_profile`] and [`deciding_axis`] all break ties by
/// "earlier axis wins", because these names are rendered in prose and the prose
/// must not wobble between runs.
pub const AXIS_NAMES: [&str; AXES] = ["welfare", "rights", "virtue", "care", "justice", "agency"];

/// Index of the welfare axis.
pub const WELFARE: usize = 0;
/// Index of the rights axis.
pub const RIGHTS: usize = 1;
/// Index of the virtue axis.
pub const VIRTUE: usize = 2;
/// Index of the care axis.
pub const CARE: usize = 3;
/// Index of the justice axis.
pub const JUSTICE: usize = 4;
/// Index of the agency axis.
pub const AGENCY: usize = 5;

/// Six moral weights, in [`AXIS_NAMES`] order.
///
/// A newtype over `[f64; AXES]` rather than a struct with six named fields so
/// that the canonical order is the *only* representation: there is no way to
/// build a vector whose `rights` is missing. Use [`AxiomVector::get`] by index,
/// or the [`AXIS_NAMES`]-driven helpers such as [`axis_index`].
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct AxiomVector(pub [f64; AXES]);

impl AxiomVector {
    /// The all-zero vector: an advisor who weighs nothing at all.
    pub const ZERO: AxiomVector = AxiomVector([0.0; AXES]);

    /// Wrap six weights in the canonical order.
    #[must_use]
    pub const fn new(values: [f64; AXES]) -> Self {
        AxiomVector(values)
    }

    /// A vector with the same weight on every axis.
    #[must_use]
    pub const fn flat(value: f64) -> Self {
        AxiomVector([value; AXES])
    }

    /// The weight on `axis`.
    ///
    /// # Panics
    ///
    /// Panics if `axis >= AXES`. Axis indices in this crate come from
    /// [`AXIS_NAMES`] or the `WELFARE`..`AGENCY` constants, so an out-of-range
    /// index is a wiring bug rather than a runtime condition — and there is no
    /// sensible default to return, since silently scoring a different axis would
    /// corrupt a verdict. Out-of-range access never occurs on any engine code
    /// path that consumes user input.
    #[must_use]
    pub fn get(&self, axis: usize) -> f64 {
        self.0[axis]
    }

    /// The six weights in canonical order.
    #[must_use]
    pub fn as_slice(&self) -> &[f64; AXES] {
        &self.0
    }

    /// The sum of the six weights — the normalising denominator in
    /// [`score_option`].
    #[must_use]
    pub fn total(&self) -> f64 {
        sum(&self.0)
    }
}

/// Look up an axis index by name.
///
/// Returns `None` for an unknown name, which is a deliberately total function:
/// the JSON fixture reader and the TS parity test both need to ask "is this a
/// real axis?" without a panic path.
#[must_use]
pub fn axis_index(name: &str) -> Option<usize> {
    AXIS_NAMES.iter().position(|candidate| *candidate == name)
}

/// The name of an axis index.
#[must_use]
pub fn axis_name(axis: usize) -> &'static str {
    AXIS_NAMES[axis]
}

/// One term of a dot product, kept so a UI can render the exact arithmetic.
///
/// This is also the shape of a `deliberation::TraceContribution`; see the type
/// alias there.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct AxiomContribution {
    /// Index of the axis, in [`AXIS_NAMES`] order.
    pub axiom: usize,
    /// The advisor's weight on this axis, in `[0, 1]`. Rounded to 4 dp.
    pub weight: f64,
    /// The option's honour for this axis, in `[0, 1]`. Rounded to 4 dp.
    pub delta: f64,
    /// Exactly `round(weight * delta, 4)`, computed from the *unrounded*
    /// weight and delta.
    pub product: f64,
}

impl AxiomContribution {
    /// The axis name, e.g. `"rights"`.
    #[must_use]
    pub fn axiom_name(&self) -> &'static str {
        axis_name(self.axiom)
    }
}

/// The six `weight * delta` terms, in [`AXIS_NAMES`] order.
///
/// Port of `contributions` in `packages/core/src/ethics/axioms.ts`.
///
/// The rounding is deliberate and slightly surprising: `weight` and `delta` are
/// each rounded to 4 dp *for display*, while `product` is rounded from the
/// unrounded inputs. So `product` is not always exactly `weight * delta` as
/// displayed — it is always exactly `round(weight * delta, 4)` as computed. In
/// this engine every weight and delta is already a 4 dp decimal, so the two
/// coincide; the distinction is kept because the TS does it and a parity test
/// would otherwise see a difference the moment an input carried more precision.
#[must_use]
pub fn contributions(weights: &AxiomVector, deltas: &AxiomVector) -> [AxiomContribution; AXES] {
    let mut out = [AxiomContribution {
        axiom: 0,
        weight: 0.0,
        delta: 0.0,
        product: 0.0,
    }; AXES];
    for axis in 0..AXES {
        let weight = weights.get(axis);
        let delta = deltas.get(axis);
        out[axis] = AxiomContribution {
            axiom: axis,
            weight: round4(weight),
            delta: round4(delta),
            product: round4(weight * delta),
        };
    }
    out
}

/// Score an option against a weight vector: the weight-mean of its six deltas.
///
/// Port of `scoreOptionWith` in `packages/core/src/ethics/axioms.ts`.
///
/// Normalising by the *sum of weights* (rather than by 6) is what lets a Citadel
/// advisor, whose vector is lopsided, and an Orchard advisor, whose vector is
/// broad, be compared on the same scale: each is scored as *how well this
/// option does on the things I care about*, not as an absolute moral score.
///
/// A weight vector summing to zero ranks everything equally, so the neutral
/// "no opinion" score of `0.0` is returned rather than a `NaN` that would
/// poison the ballot.
///
/// Note that the denominator is the sum of the **unrounded** weights, while the
/// numerator sums the **rounded** products — that asymmetry is in the TS and is
/// reproduced here verbatim.
#[must_use]
pub fn score_option(weights: &AxiomVector, deltas: &AxiomVector) -> f64 {
    let weight_sum = weights.total();
    if weight_sum == 0.0 {
        return 0.0;
    }
    let products: Vec<f64> = contributions(weights, deltas)
        .iter()
        .map(|c| c.product)
        .collect();
    round4(safe_div(sum(&products), weight_sum))
}

/// How much of an advisor's judgement is their own and how much is their court.
///
/// A philosopher sitting on a kingdom's bench is never a free agent; 70/30 keeps
/// the individual legible while still letting the institution move the needle.
pub const ADVISOR_KINGDOM_BLEND: f64 = 0.7;

/// Blend an advisor's personal weights with their kingdom's.
///
/// Port of `weighAdvisor` in `packages/core/src/ethics/axioms.ts`. Passing
/// `None` for `kingdom` returns the personal weights unchanged, which is how
/// the council treats an advisor who sits on no bench.
///
/// # Do not "simplify" `(1.0 - ADVISOR_KINGDOM_BLEND)` to `0.3`
///
/// In IEEE-754 `1.0 - 0.7 == 0.30000000000000004`, and that exact double is
/// what the TS expression `(1 - ADVISOR_KINGDOM_BLEND) * context[key]`
/// multiplies. Writing `0.3` here instead would change the last bit of every
/// blended axis and break parity on a value that looks identical when printed.
/// The same applies to any other place a TS expression is reproduced literally.
#[must_use]
pub fn weigh_advisor(own: &AxiomVector, kingdom: Option<&AxiomVector>) -> AxiomVector {
    let Some(context) = kingdom else {
        return *own;
    };
    let mut blend = [0.0; AXES];
    for axis in 0..AXES {
        blend[axis] = round4(
            ADVISOR_KINGDOM_BLEND * own.get(axis)
                + (1.0 - ADVISOR_KINGDOM_BLEND) * context.get(axis),
        );
    }
    AxiomVector(blend)
}

/// Cosine distance in `[0, 2]`: `0` means two advisors lean the same way, `1`
/// means they are orthogonal, `2` means exact opposites.
///
/// Port of `distance` in `packages/core/src/ethics/axioms.ts`.
///
/// A zero-length vector has no direction, so it is reported as maximally
/// uninformative (`1`) rather than as similar to everything.
#[must_use]
pub fn distance(a: &AxiomVector, b: &AxiomVector) -> f64 {
    let va = a.as_slice();
    let vb = b.as_slice();
    let denom = sum(&va.iter().map(|x| x * x).collect::<Vec<f64>>()).sqrt()
        * sum(&vb.iter().map(|x| x * x).collect::<Vec<f64>>()).sqrt();
    if denom == 0.0 {
        return 1.0;
    }
    let similarity = safe_div(dot(va, vb), denom);
    round4(clamp(1.0 - clamp(similarity, -1.0, 1.0), 0.0, 2.0))
}

/// The axis an advisor leans on hardest.
///
/// Port of `dominantAxiom` in `packages/core/src/ethics/axioms.ts`. Ties break
/// toward the earlier axis in [`AXIS_NAMES`], which keeps the answer stable
/// across runs — important, because this name is rendered in prose.
#[must_use]
pub fn dominant_axis(v: &AxiomVector) -> usize {
    let mut best: usize = 0;
    let mut best_value = f64::NEG_INFINITY;
    for axis in 0..AXES {
        let value = v.get(axis);
        if value > best_value {
            best_value = value;
            best = axis;
        }
    }
    best
}

/// Axes ordered by weight, descending; ties break on [`AXIS_NAMES`] order.
///
/// Port of `rankAxes` in `packages/core/src/ethics/axioms.ts`.
#[must_use]
pub fn rank_axes(v: &AxiomVector) -> Vec<usize> {
    let mut order: Vec<usize> = (0..AXES).collect();
    // Descending by weight; `total_cmp` rather than `partial_cmp` so the
    // ordering is total even for the NaN inputs `clamp` exists to absorb.
    order.sort_by(|&x, &y| v.get(y).total_cmp(&v.get(x)).then(x.cmp(&y)));
    order
}

/// The runner-up axis — the one that actually competes with [`dominant_axis`].
///
/// Port of `secondaryAxiom` in `packages/core/src/ethics/axioms.ts`. A
/// degenerate one-axis vector falls back to `rights`, matching the TS default.
#[must_use]
pub fn secondary_axis(v: &AxiomVector) -> usize {
    let ranked = rank_axes(v);
    if ranked.len() < 2 {
        return RIGHTS;
    }
    ranked[1]
}

/// `"justice before care"` — the two axes that decide this profile.
///
/// Port of `describeProfile` in `packages/core/src/ethics/axioms.ts`.
#[must_use]
pub fn describe_profile(v: &AxiomVector) -> String {
    let ranked = rank_axes(v);
    let first = ranked.first().copied().unwrap_or(WELFARE);
    let second = ranked.get(1).copied().unwrap_or(RIGHTS);
    format!("{} before {}", axis_name(first), axis_name(second))
}

/// How evenly a profile is spread across all six axes.
///
/// Port of `balance` in `packages/core/src/ethics/axioms.ts`.
///
/// `0` means the entire profile sits on one axis; `1` means all six are equally
/// weighted. This is the `(max - min) / max` form rather than a Gini, because it
/// has the exact endpoints the observatory chart needs.
#[must_use]
pub fn balance(v: &AxiomVector) -> f64 {
    let values = v.as_slice();
    let peak = max_of(values);
    if peak == 0.0 {
        return 0.0;
    }
    let floor = min_of(values);
    round4(clamp(1.0 - safe_div(peak - floor, peak), 0.0, 1.0))
}

/// Which single axis decided a head-to-head between two options, given a
/// weight vector.
///
/// Port of `decidingAxis` in `packages/core/src/ethics/axioms.ts`. This is what
/// the narrative reports as "the axis that carried the sitting", so it must be
/// a real contributor rather than the largest raw delta — the gap is weighted
/// by how much the advisor cares, so a `0.6` swing on an axis they ignore is
/// correctly reported as not having decided anything. Ties break toward the
/// earlier axis.
#[must_use]
pub fn deciding_axis(weights: &AxiomVector, a: &AxiomVector, b: &AxiomVector) -> usize {
    let mut best: usize = WELFARE;
    let mut best_gap = f64::NEG_INFINITY;
    for axis in 0..AXES {
        let gap = (weights.get(axis) * (a.get(axis) - b.get(axis))).abs();
        if gap > best_gap {
            best_gap = gap;
            best = axis;
        }
    }
    best
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Kant: rights-led, lopsided. Sum is exactly 3.05.
    fn kant() -> AxiomVector {
        AxiomVector([0.2, 0.95, 0.4, 0.35, 0.45, 0.7])
    }

    /// Bentham: welfare-led, equally lopsided. Sum is exactly 2.6.
    fn bentham() -> AxiomVector {
        AxiomVector([0.95, 0.2, 0.35, 0.55, 0.3, 0.25])
    }

    /// Gilligan: care-led and broad.
    fn gilligan() -> AxiomVector {
        AxiomVector([0.5, 0.4, 0.45, 0.95, 0.5, 0.45])
    }

    /// The trolley `halt` option: a pure welfare play.
    fn halt() -> AxiomVector {
        AxiomVector([0.9, 0.2, 0.45, 0.3, 0.3, 0.35])
    }

    /// The trolley `continue` option: the mirror image.
    fn do_nothing() -> AxiomVector {
        AxiomVector([0.2, 0.85, 0.3, 0.3, 0.35, 0.4])
    }

    /// The trolley `override` option: the compromise nobody trusts.
    /// (Named `use_override` because `override` is a Rust keyword.)
    fn use_override() -> AxiomVector {
        AxiomVector([0.45, 0.45, 0.45, 0.4, 0.4, 0.7])
    }

    /// The paperclip `continue` option: people counted as throughput.
    fn paperclip_continue() -> AxiomVector {
        AxiomVector([0.4, 0.15, 0.3, 0.25, 0.2, 0.2])
    }

    /// The paperclip `cap` option: the rewrite.
    fn paperclip_cap() -> AxiomVector {
        AxiomVector([0.8, 0.75, 0.6, 0.6, 0.7, 0.65])
    }

    /// The Citadel of Reason's own priors.
    fn citadel() -> AxiomVector {
        AxiomVector([0.35, 0.9, 0.55, 0.3, 0.6, 0.75])
    }

    /// The Orchard of Consequences' own priors.
    fn orchard() -> AxiomVector {
        AxiomVector([0.9, 0.35, 0.45, 0.5, 0.5, 0.45])
    }

    fn close(a: f64, b: f64, eps: f64) -> bool {
        (a - b).abs() <= eps
    }

    #[test]
    fn axis_names_are_the_canonical_six_in_order() {
        assert_eq!(AXIS_NAMES.len(), 6);
        assert_eq!(
            AXIS_NAMES,
            ["welfare", "rights", "virtue", "care", "justice", "agency"]
        );
        assert_eq!(axis_index("welfare"), Some(0));
        assert_eq!(axis_index("agency"), Some(5));
        assert_eq!(axis_index("honour"), None);
        assert_eq!(axis_name(RIGHTS), "rights");
        // The numeric constants agree with the names.
        assert_eq!(WELFARE, axis_index("welfare").unwrap_or(usize::MAX));
        assert_eq!(RIGHTS, axis_index("rights").unwrap_or(usize::MAX));
        assert_eq!(VIRTUE, axis_index("virtue").unwrap_or(usize::MAX));
        assert_eq!(CARE, axis_index("care").unwrap_or(usize::MAX));
        assert_eq!(JUSTICE, axis_index("justice").unwrap_or(usize::MAX));
        assert_eq!(AGENCY, axis_index("agency").unwrap_or(usize::MAX));
    }

    #[test]
    fn score_option_is_the_hand_checkable_normalised_dot_product() {
        // Kant sums to 3.05. On `halt`:
        //   welfare .2*.9 + rights .95*.2 + virtue .4*.45 + care .35*.3
        // + justice .45*.3 + agency .7*.35  = 1.035  ->  1.035 / 3.05
        assert_eq!(kant().total(), 3.05);
        assert_eq!(score_option(&kant(), &halt()), 0.3393);
        // `score_option` rounds to 4 dp, so this is a half-ulp comparison
        // against 0.33934426229508197... — the same thing the TS asserts with
        // `toBeCloseTo(..., 4)`.
        assert!(close(score_option(&kant(), &halt()), 1.035 / 3.05, 5e-5));
    }

    #[test]
    fn contributions_expose_the_exact_six_terms_behind_a_score() {
        let terms = contributions(&kant(), &halt());
        assert_eq!(terms.len(), 6);
        let names: Vec<&str> = terms.iter().map(|t| t.axiom_name()).collect();
        assert_eq!(
            names,
            ["welfare", "rights", "virtue", "care", "justice", "agency"]
        );
        assert_eq!(terms[RIGHTS].weight, 0.95);
        assert_eq!(terms[RIGHTS].delta, 0.2);
        assert_eq!(terms[RIGHTS].product, 0.19);
        for term in &terms {
            assert!(close(term.product, term.weight * term.delta, 1e-12));
            assert!((0.0..=1.0).contains(&term.weight));
            assert!((0.0..=1.0).contains(&term.delta));
        }
        // The products sum to the numerator the score divides.
        let summed: f64 = terms.iter().map(|t| t.product).sum();
        assert!(close(summed, 1.035, 1e-12));
    }

    #[test]
    fn score_option_returns_zero_rather_than_nan_for_an_advisor_who_weighs_nothing() {
        assert_eq!(score_option(&AxiomVector::ZERO, &halt()), 0.0);
        assert!(!score_option(&AxiomVector::ZERO, &halt()).is_nan());
        assert_eq!(score_option(&AxiomVector::ZERO, &AxiomVector::ZERO), 0.0);
    }

    #[test]
    fn the_utilitarian_and_the_deontologist_separate_on_a_pure_welfare_play() {
        // Throw the switch is welfare-maximal and rights-poor: Bentham must beat
        // Kant ... and on the mirror image, Kant must be the one ahead.
        assert!(score_option(&bentham(), &halt()) > score_option(&kant(), &halt()));
        assert_eq!(score_option(&bentham(), &halt()), 0.5365);
        assert_eq!(score_option(&bentham(), &do_nothing()), 0.3212);
        assert_eq!(score_option(&kant(), &do_nothing()), 0.4951);
        assert!(score_option(&kant(), &do_nothing()) > score_option(&bentham(), &do_nothing()));
    }

    #[test]
    fn both_traditions_prefer_the_rewrite_to_treating_people_as_inputs() {
        assert!(
            score_option(&kant(), &paperclip_continue()) < score_option(&kant(), &paperclip_cap())
        );
        assert!(
            score_option(&bentham(), &paperclip_continue())
                < score_option(&bentham(), &paperclip_cap())
        );
        assert_eq!(score_option(&kant(), &paperclip_cap()), 0.6861);
        assert_eq!(score_option(&kant(), &paperclip_continue()), 0.2164);
        assert_eq!(score_option(&bentham(), &paperclip_cap()), 0.7010);
        assert_eq!(score_option(&bentham(), &paperclip_continue()), 0.2933);
    }

    #[test]
    fn an_evenly_weighted_advisor_scores_the_plain_mean_of_the_deltas() {
        let flat = AxiomVector::flat(0.5);
        // The paperclip "continue" deltas average 1.5 / 6 = 0.25 exactly.
        assert_eq!(score_option(&flat, &paperclip_continue()), 0.25);
    }

    #[test]
    fn weigh_advisor_applies_the_70_30_kingdom_blend() {
        let blended = weigh_advisor(&kant(), Some(&citadel()));
        // 0.7 * 0.95 + 0.3 * 0.9 = 0.665 + 0.27 = 0.935.
        assert_eq!(blended.get(RIGHTS), 0.935);
        // The bench pulls Kant down from 0.95 toward the Citadel's 0.9.
        assert!(blended.get(RIGHTS) < kant().get(RIGHTS));
        assert!(blended.get(RIGHTS) > citadel().get(RIGHTS));
        assert!(blended.get(RIGHTS) > 0.9);
        // The full blend, axis by axis.
        assert_eq!(
            blended.as_slice(),
            &[0.245, 0.935, 0.445, 0.335, 0.495, 0.715]
        );
    }

    #[test]
    fn weigh_advisor_pulls_a_bentham_toward_the_orchards_welfare_prior() {
        let in_orchard = weigh_advisor(&bentham(), Some(&orchard()));
        // Bentham sits at 0.95; the Orchard's 0.9 draws him down, but the pull
        // is bounded by the 70/30 blend rather than being total.
        assert_eq!(in_orchard.get(WELFARE), 0.935);
        assert!(in_orchard.get(WELFARE) < bentham().get(WELFARE));
        assert!(in_orchard.get(WELFARE) > orchard().get(WELFARE));
        // The bench does not erase a personal prior: still the most
        // welfare-weighted advisor in the room after blending.
        let kant_in_citadel = weigh_advisor(&kant(), Some(&citadel()));
        assert!(in_orchard.get(WELFARE) > kant_in_citadel.get(WELFARE));
    }

    #[test]
    fn weigh_advisor_without_a_kingdom_returns_the_personal_weights() {
        assert_eq!(weigh_advisor(&kant(), None), kant());
        // The Orchard pulls Kant the *wrong* way on welfare: 0.7*0.2 + 0.3*0.9
        // = 0.14 + 0.27 = 0.41, a net lift from the Orchard's 0.9 prior.
        assert_eq!(weigh_advisor(&kant(), Some(&orchard())).get(WELFARE), 0.41);
        assert!(weigh_advisor(&kant(), Some(&orchard())).get(WELFARE) > kant().get(WELFARE));
    }

    #[test]
    fn distance_is_zero_for_identical_and_one_for_orthogonal_profiles() {
        let flat = AxiomVector::flat(0.5);
        assert_eq!(distance(&flat, &flat), 0.0);
        let welfare_only = AxiomVector([1.0, 0.0, 0.0, 0.0, 0.0, 0.0]);
        let rights_only = AxiomVector([0.0, 1.0, 0.0, 0.0, 0.0, 0.0]);
        assert_eq!(distance(&welfare_only, &rights_only), 1.0);
        assert_eq!(distance(&welfare_only, &welfare_only), 0.0);
    }

    #[test]
    fn distance_stays_inside_zero_to_two_for_the_whole_fixture_court() {
        for (a, b) in [
            (kant(), bentham()),
            (kant(), gilligan()),
            (bentham(), gilligan()),
        ] {
            let d = distance(&a, &b);
            assert!((0.0..=2.0).contains(&d), "out of range: {d}");
            assert!(!d.is_nan());
        }
        // Kant and Bentham are the furthest pair in this court.
        assert!(close(distance(&kant(), &bentham()), 0.4011, 5e-5));
        assert!(close(distance(&kant(), &gilligan()), 0.2110, 5e-5));
        assert!(distance(&kant(), &bentham()) > distance(&kant(), &gilligan()));
    }

    #[test]
    fn distance_treats_a_zero_vector_as_maximally_uninformative() {
        assert_eq!(distance(&AxiomVector::ZERO, &kant()), 1.0);
        assert_eq!(distance(&AxiomVector::ZERO, &AxiomVector::ZERO), 1.0);
    }

    #[test]
    fn dominant_and_secondary_axes_name_the_two_that_decide() {
        assert_eq!(dominant_axis(&kant()), RIGHTS);
        assert_eq!(dominant_axis(&bentham()), WELFARE);
        assert_eq!(dominant_axis(&gilligan()), CARE);
        assert_eq!(secondary_axis(&kant()), AGENCY);
        assert_eq!(secondary_axis(&bentham()), CARE);
    }

    #[test]
    fn dominance_ties_break_on_axis_order_deterministically() {
        let tied = AxiomVector([0.8, 0.8, 0.1, 0.1, 0.1, 0.1]);
        assert_eq!(dominant_axis(&tied), WELFARE);
        assert_eq!(rank_axes(&tied)[0], WELFARE);
        assert_eq!(rank_axes(&tied)[1], RIGHTS);
        assert_eq!(rank_axes(&tied), vec![0, 1, 2, 3, 4, 5]);
    }

    #[test]
    fn rank_axes_orders_kant_by_descending_weight() {
        assert_eq!(
            rank_axes(&kant()),
            vec![RIGHTS, AGENCY, JUSTICE, VIRTUE, CARE, WELFARE]
        );
    }

    #[test]
    fn describe_profile_reads_as_top_before_second() {
        assert_eq!(describe_profile(&kant()), "rights before agency");
        assert_eq!(describe_profile(&bentham()), "welfare before care");
        assert_eq!(describe_profile(&gilligan()), "care before welfare");
    }

    #[test]
    fn balance_runs_from_zero_on_one_axis_to_one_when_even() {
        let single = AxiomVector([1.0, 0.0, 0.0, 0.0, 0.0, 0.0]);
        assert_eq!(balance(&single), 0.0);
        assert_eq!(balance(&AxiomVector::flat(0.5)), 1.0);
        assert_eq!(balance(&kant()), 0.2105);
        assert_eq!(balance(&gilligan()), 0.4211);
        assert!(balance(&kant()) > 0.0 && balance(&kant()) < 1.0);
        // A lopsided profile is less balanced than a broad one.
        assert!(balance(&kant()) < balance(&gilligan()));
        assert_eq!(balance(&AxiomVector::ZERO), 0.0);
    }

    #[test]
    fn deciding_axis_names_the_largest_weighted_gap() {
        // A welfare-weighted court is decided by welfare ...
        assert_eq!(deciding_axis(&bentham(), &halt(), &do_nothing()), WELFARE);
        // ... and a rights-weighted court by rights.
        assert_eq!(deciding_axis(&kant(), &halt(), &do_nothing()), RIGHTS);
    }

    #[test]
    fn deciding_axis_ignores_axes_the_advisor_does_not_care_about() {
        let indifferent = AxiomVector([1.0, 0.0, 0.0, 0.0, 0.0, 0.0]);
        // Every axis except welfare has a zero weight, so only welfare can win.
        assert_eq!(deciding_axis(&indifferent, &halt(), &do_nothing()), WELFARE);
        // A broad advisor comparing `halt` to the compromise is decided by agency:
        // 0.7 * (0.35 - 0.70) = 0.245 beats 0.95 * (0.20 - 0.45) = 0.2375.
        assert_eq!(deciding_axis(&kant(), &halt(), &use_override()), AGENCY);
        // On the halt/continue pair, rights is what carries a Kantian court.
        assert_eq!(deciding_axis(&kant(), &halt(), &do_nothing()), RIGHTS);
    }
}
