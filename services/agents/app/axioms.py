"""The ethical calculus: six-axis vector math, and the utilon currency.

WHY this module exists at all: a Nooreign verdict is not an opinion, it is
arithmetic. An advisor is a six-vector of moral weights; an option is another
six-vector of how much of each it honours; the score is the normalised inner
product of the two. Everything downstream — the ballot, the margin, the
dissent, the deciding axis — is derived from that number rather than from a
hand-written stance about any particular dilemma.

Two rules hold throughout:

1. **Round early, round to 4 dp.** Every intermediate that a human will ever
   see is rounded exactly once, at construction, so the number on screen and
   the number that decided the case are the same number.
2. **No NaN, no Infinity.** A verdict engine that can emit `NaN` can render
   "NaN%" in the UI and poison every aggregate upstream. Degenerate inputs
   (empty courts, zero denominators, zero-weight advisors) get an explicit,
   documented default instead.

The utilon helpers live here rather than in a module of their own because they
are the same calculus read from the other side: `axioms.ts` asks "does this
option feed *my* commitments", utilons ask "how much moral weight is in play,
and who is carrying it".
"""

from __future__ import annotations

import math
from collections.abc import Sequence

from .models import (
    AXIOM_KEYS,
    Advisor,
    AxiomKey,
    AxiomVector,
    AxisGap,
    Dilemma,
    DilemmaOption,
    Kingdom,
    StakeholderContribution,
    TraceContribution,
    UtilonAggregate,
    UtilonBand,
    UtilonScale,
)

__all__ = [
    "ADVISOR_KINGDOM_BLEND",
    "CATEGORY_THRESHOLDS",
    "aggregate",
    "agreement",
    "balance",
    "clamp",
    "contributions",
    "cosine_distance",
    "deciding_axis",
    "describe_profile",
    "discount",
    "dominant_axiom",
    "fairness_index",
    "fairness_of",
    "moral_status_risk",
    "profile_conflict",
    "rank_axes",
    "round_dp",
    "safe_div",
    "score_option",
    "score_option_with",
    "secondary_axiom",
    "stakeholder_total",
    "total_of",
    "unweighted_total",
    "utilon_scale",
    "weigh_advisor",
    "weighted_agent_harm",
    "weights_for",
]

#: How much of an advisor's judgement is their own and how much is their court.
#: 70/30 keeps the individual legible while still letting the institution move
#: the needle — a philosopher on a bench is never a free agent.
ADVISOR_KINGDOM_BLEND = 0.7

#: Band ceilings for the utilon scale. The cut points are deliberately uneven:
#: the bottom of the scale is crowded (nothing is good, so "tragic" and
#: "costly" sit close together) while the top is sparse — only a genuinely
#: transformative option earns the highest band.
CATEGORY_THRESHOLDS: tuple[tuple[float, UtilonBand], ...] = (
    (0.25, "tragic"),
    (0.45, "costly"),
    (0.62, "neutral"),
    (0.82, "generous"),
    (math.inf, "transformative"),
)

_BAND_LABELS: dict[str, str] = {
    "tragic": "Tragic — the option asks someone to bear the cost",
    "costly": "Costly — real harm, at least partly repaid",
    "neutral": "Neutral — the ledger barely moves",
    "generous": "Generous — more good than the case strictly requires",
    "transformative": "Transformative — the option changes what the world is",
}


# --------------------------------------------------------------------------- #
# Numeric kernel
# --------------------------------------------------------------------------- #


def clamp(value: float, low: float, high: float) -> float:
    """Restrict `value` to `[low, high]`. NaN collapses to `low`.

    NaN is the one input that must never survive: it would render as "NaN%"
    and would poison every sum it entered.
    """
    if math.isnan(value):
        return low
    if value < low:
        return low
    if value > high:
        return high
    return value


def round_dp(value: float, dp: int = 4) -> float:
    """Round to `dp` decimal places, half away from zero.

    Mirrors the TypeScript `round()` in `packages/core/src/util/math.ts`
    exactly, including the `Number.EPSILON` nudge that neutralises binary float
    dust such as `0.1 + 0.2 === 0.30000000000000004`. Parity matters here
    because the TS engine and this service report the same arithmetic.
    """
    if not math.isfinite(value):
        return value
    factor = 10.0**dp
    scaled = value * factor
    magnitude = abs(scaled)
    # `floor(x + 0.5)` is round-half-up, which is what `Math.round` does for
    # non-negative inputs; the epsilon nudge is what makes `round(0.635, 2)`
    # land on the same side of the boundary as the decimal it was written as.
    rounded = math.floor(magnitude + magnitude * 2.220446049250313e-16 + 0.5)
    if math.copysign(1.0, scaled) < 0:
        rounded = -rounded
    if rounded == 0:
        # Collapse -0.0: `json.dumps` writes it as `-0.0`, which would break
        # byte-for-byte parity with the TS engine's `JSON.stringify`.
        return 0.0
    return rounded / factor


def safe_div(numerator: float, denominator: float) -> float:
    """Division that yields 0 instead of Infinity/NaN when the denominator is 0."""
    if denominator == 0:
        return 0.0
    result = numerator / denominator
    return result if math.isfinite(result) else 0.0


def total_of(values: Sequence[float]) -> float:
    """Left-to-right sum, matching the JS accumulator rather than `math.fsum`."""
    total = 0.0
    for value in values:
        total += value
    return total


def mean_of(values: Sequence[float]) -> float:
    """Arithmetic mean; 0 for an empty list."""
    if not values:
        return 0.0
    return total_of(values) / len(values)


def format_number(value: float, dp: int = 4) -> str:
    """Render a number for prose without exponent notation or trailing zeros.

    The narrative is the one place numbers become strings, and it is compared
    in tests, so it needs a formatter that is stable across platforms.
    """
    if not math.isfinite(value):
        return "0"
    text = f"{value:.{dp}f}"
    if "." in text:
        text = text.rstrip("0").rstrip(".")
    if text in ("", "-", "-0"):
        return "0"
    return text


# --------------------------------------------------------------------------- #
# Axiom vector math
# --------------------------------------------------------------------------- #


def to_array(vector: AxiomVector) -> list[float]:
    """Expand to `[welfare, rights, virtue, care, justice, agency]`."""
    return vector.to_array()


def contributions(weights: AxiomVector, deltas: AxiomVector) -> list[TraceContribution]:
    """The six `weight * delta` terms, in canonical axis order, rounded to 4 dp.

    Rounding each product before it is summed is what lets the rendered trace
    add up exactly: a UI that prints `0.5 x 0.3 = 0.15` six times must be able
    to sum the printed values and land on the printed subtotal.
    """
    return [
        TraceContribution(
            axiom=weights_key,
            weight=round_dp(weights.get(weights_key), 4),
            delta=round_dp(deltas.get(weights_key), 4),
            product=round_dp(weights.get(weights_key) * deltas.get(weights_key), 4),
        )
        for weights_key in AXIOM_KEYS
    ]


def score_option_with(weights: AxiomVector, option: DilemmaOption) -> float:
    """The weight-mean of an option's six deltas.

    Normalising by the *sum of the weights* rather than by 6 is what lets a
    lopsided Citadel vector and a broad Orchard vector be compared on the same
    scale: each advisor is scored on "how well does this option do on the
    things I care about", not on an absolute moral score that would reward
    advisors for being vague.
    """
    weight_sum = total_of(to_array(weights))
    if weight_sum == 0:
        # An advisor who weighs nothing ranks everything equally. 0 is the
        # neutral "no opinion" score rather than a NaN that would poison the
        # ballot for everyone else.
        return 0.0
    product_sum = total_of([c.product for c in contributions(weights, option.deltas)])
    return round_dp(safe_div(product_sum, weight_sum), 4)


def score_option(advisor: Advisor, option: DilemmaOption) -> float:
    """Score an option using an advisor's *own* weights, with no kingdom context."""
    return score_option_with(advisor.axioms, option)


def weigh_advisor(advisor: Advisor, kingdom: Kingdom | None = None) -> AxiomVector:
    """Blend an advisor's personal weights with their kingdom's priors.

    The kingdom is the court they sit on: it supplies priors about which axes
    are load-bearing, and it is the reason two utilitarians in different
    kingdoms do not simply clone each other.
    """
    if kingdom is None:
        return advisor.axioms.model_copy(deep=True)
    return AxiomVector(
        **{
            key: round_dp(
                ADVISOR_KINGDOM_BLEND * advisor.axioms.get(key)
                + (1.0 - ADVISOR_KINGDOM_BLEND) * kingdom.axioms.get(key),
                4,
            )
            for key in AXIOM_KEYS
        }
    )


def weights_for(advisor: Advisor, kingdoms: Sequence[Kingdom] = ()) -> AxiomVector:
    """The weights actually used for an advisor, with kingdom context applied."""
    for kingdom in kingdoms:
        if kingdom.id == advisor.kingdom_id:
            return weigh_advisor(advisor, kingdom)
    return weigh_advisor(advisor, None)


def cosine_distance(a: AxiomVector, b: AxiomVector) -> float:
    """Cosine distance in `[0, 2]`: 0 = same lean, 1 = orthogonal, 2 = opposite.

    Used to place advisors on the atlas and to report how fractured a court is.
    A zero-length vector has no direction, so it is treated as maximally
    uninformative (distance 1) rather than as similar to everything.
    """
    va = to_array(a)
    vb = to_array(b)
    denom = math.sqrt(total_of([x * x for x in va])) * math.sqrt(total_of([x * x for x in vb]))
    if denom == 0:
        return 1.0
    similarity = safe_div(total_of([va[i] * vb[i] for i in range(len(va))]), denom)
    return round_dp(clamp(1.0 - clamp(similarity, -1.0, 1.0), 0.0, 2.0), 4)


def dominant_axiom(vector: AxiomVector) -> AxiomKey:
    """The axis leaned on hardest. Ties break toward the earlier key.

    The tie-break is load-bearing: this name is rendered in prose, so it has to
    be stable across runs and across languages.
    """
    best: AxiomKey = "welfare"
    best_value = -math.inf
    for key in AXIOM_KEYS:
        value = vector.get(key)
        if value > best_value:
            best_value = value
            best = key
    return best


def rank_axes(vector: AxiomVector) -> list[AxiomKey]:
    """Axes ordered by weight, descending; ties break on canonical axis order."""
    return sorted(AXIOM_KEYS, key=lambda key: (-vector.get(key), AXIOM_KEYS.index(key)))


def secondary_axiom(vector: AxiomVector) -> AxiomKey:
    """The runner-up axis — the one that actually competes with `dominant_axiom`."""
    ranked = rank_axes(vector)
    return ranked[1] if len(ranked) > 1 else "rights"


def describe_profile(vector: AxiomVector) -> str:
    """ "justice before care" — the two axes that decide this profile."""
    ranked = rank_axes(vector)
    first = ranked[0] if ranked else "welfare"
    second = ranked[1] if len(ranked) > 1 else "rights"
    return f"{first} before {second}"


def profile_conflict(a: AxiomVector, b: AxiomVector, threshold: float = 0.15) -> list[AxisGap]:
    """The axes two profiles disagree about, largest disagreement first.

    The default 0.15 means "these traditions differ, but not so much that they
    are arguing about different things".
    """
    conflicts = [
        AxisGap(
            axiom=key,
            a=a.get(key),
            b=b.get(key),
            gap=round_dp(abs(a.get(key) - b.get(key)), 4),
        )
        for key in AXIOM_KEYS
    ]
    conflicting = [entry for entry in conflicts if entry.gap > threshold]
    return sorted(
        conflicting,
        key=lambda entry: (-entry.gap, AXIOM_KEYS.index(entry.axiom)),
    )


def agreement(a: AxiomVector, b: AxiomVector, threshold: float = 0.15) -> bool:
    """Whether two profiles agree on every axis within `threshold`."""
    return len(profile_conflict(a, b, threshold)) == 0


def balance(vector: AxiomVector) -> float:
    """How evenly a profile is spread: 0 = all on one axis, 1 = all equal.

    `(max - min) / max` rather than a Gini, because it has the exact endpoints
    the observatory chart needs and stays interpretable next to the raw weights.
    """
    values = to_array(vector)
    peak = max(values)
    if peak == 0:
        return 0.0
    floor = min(values)
    return round_dp(clamp(1.0 - safe_div(peak - floor, peak), 0.0, 1.0), 4)


def deciding_axis(weights: AxiomVector, a: DilemmaOption, b: DilemmaOption) -> AxiomKey:
    """Which single axis decided a head-to-head between two options.

    The gap is weighted by how much the advisor cares, so a 0.6 swing on an
    axis they ignore is correctly reported as not having decided anything.
    """
    best: AxiomKey = "welfare"
    best_gap = -math.inf
    for key in AXIOM_KEYS:
        gap = abs(weights.get(key) * (a.deltas.get(key) - b.deltas.get(key)))
        if gap > best_gap:
            best_gap = gap
            best = key
    return best


# --------------------------------------------------------------------------- #
# Utilons — the moral currency
# --------------------------------------------------------------------------- #


def stakeholder_total(dilemma: Dilemma, option: DilemmaOption, key: AxiomKey) -> float:
    """Welfare-weighted impact of an option on one axis.

    `welfare` on a stakeholder means "how much this party's happiness counts",
    so weighting the axis-deltas by it gives the aggregate standing of that
    axis *in this particular dispute*.
    """
    parties = dilemma.stakeholders
    if not parties:
        return 0.0
    weight_sum = total_of([party.welfare for party in parties])
    if weight_sum == 0:
        return 0.0
    weighted = total_of([party.welfare * option.deltas.get(key) for party in parties])
    return round_dp(safe_div(weighted, weight_sum), 4)


def unweighted_total(option: DilemmaOption, key: AxiomKey) -> float:
    """The same number ignoring who benefits — the axis-delta itself."""
    return option.deltas.get(key)


def aggregate(dilemma: Dilemma, option: DilemmaOption) -> UtilonAggregate:
    """Collapse an option into a single moral-currency figure.

    The total is the mean over the six axes of `stakeholder_total`, so an
    option that pleases everyone a little beats one that delights a single
    stakeholder — which is the entire point of weighing by `welfare`.
    """
    per_stakeholder = [
        StakeholderContribution(
            id=party.id,
            label=party.label,
            contribution=round_dp(
                clamp(party.welfare * mean_of(to_array(option.deltas)), 0.0, 1.0), 4
            ),
            is_ai=party.is_ai,
            welfare=party.welfare,
        )
        for party in dilemma.stakeholders
    ]

    total = round_dp(mean_of([stakeholder_total(dilemma, option, key) for key in AXIOM_KEYS]), 4)
    contributions = [entry.contribution for entry in per_stakeholder]
    ai_sum = total_of([e.contribution for e in per_stakeholder if e.is_ai])
    human_sum = total_of([e.contribution for e in per_stakeholder if not e.is_ai])
    grand_total = ai_sum + human_sum

    peak = max(contributions) if contributions else 0.0
    floor = min(contributions) if contributions else 0.0
    spread_raw = round_dp(peak - floor, 4)

    return UtilonAggregate(
        total=total,
        per_stakeholder=per_stakeholder,
        ai_share=round_dp(safe_div(ai_sum, grand_total), 4),
        human_share=round_dp(safe_div(human_sum, grand_total), 4),
        spread=round_dp(clamp(safe_div(spread_raw, peak + floor), 0.0, 1.0), 4),
        spread_raw=spread_raw,
    )


def discount(total: float, horizon_years: float, rate: float) -> float:
    """Hyperbolic discounting: `total / (1 + rate * horizon)`.

    Hyperbolic rather than exponential because longtermist dilemmas genuinely
    behave this way — value falls off fast at first and then flattens. A
    non-positive `rate` means no discounting at all.
    """
    if rate <= 0:
        return round_dp(total, 4)
    years = max(0.0, horizon_years)
    return round_dp(total / (1.0 + rate * years), 4)


def fairness_index(contributions: Sequence[float]) -> float:
    """Normalised Gini coefficient of a contribution list, in `[0, 1]`.

    0 is perfect equality, 1 is total concentration. Normalised by `n - 1` so
    the result is scale-free: the same 50/50 split scores 0 whether the total
    is 1 or 1000. All-zero input is perfect equality by convention.
    """
    n = len(contributions)
    if n <= 1:
        return 0.0
    total = total_of(contributions)
    if total == 0:
        return 0.0

    pairwise = 0.0
    for left in contributions:
        for right in contributions:
            pairwise += abs(left - right)

    mean_total = safe_div(total, n)
    if mean_total == 0:
        return 0.0
    gini = safe_div(pairwise, 2 * n * n * mean_total)
    return round_dp(clamp(safe_div(gini, n - 1), 0.0, 1.0), 4)


def fairness_of(agg: UtilonAggregate) -> float:
    """Gini over an option's per-stakeholder breakdown."""
    return fairness_index([entry.contribution for entry in agg.per_stakeholder])


def utilon_scale(total: float) -> UtilonScale:
    """Place a total on the utilon scale."""
    value = round_dp(clamp(total, 0.0, 1.0), 4)
    band: UtilonBand = "transformative"
    for ceiling, candidate in CATEGORY_THRESHOLDS:
        if value < ceiling:
            band = candidate
            break
    return UtilonScale(value=value, label=_BAND_LABELS[band], band=band)


class MoralStatusRisk:
    """How much an option's `agent_harm` should count, given who is represented."""

    __slots__ = ("ai_count", "ai_welfare_share", "amplifier", "human_count", "note")

    def __init__(
        self,
        ai_welfare_share: float,
        ai_count: int,
        human_count: int,
        amplifier: float,
        note: str,
    ) -> None:
        self.ai_welfare_share = ai_welfare_share
        self.ai_count = ai_count
        self.human_count = human_count
        self.amplifier = amplifier
        self.note = note

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, MoralStatusRisk):
            return NotImplemented
        return (
            self.ai_welfare_share == other.ai_welfare_share
            and self.ai_count == other.ai_count
            and self.human_count == other.human_count
            and self.amplifier == other.amplifier
            and self.note == other.note
        )

    def __repr__(self) -> str:  # pragma: no cover - debugging aid only
        return (
            f"MoralStatusRisk(ai_welfare_share={self.ai_welfare_share}, "
            f"ai_count={self.ai_count}, human_count={self.human_count}, "
            f"amplifier={self.amplifier})"
        )


def moral_status_risk(dilemma: Dilemma) -> MoralStatusRisk:
    """Whether an AI has standing in this dispute, and how loudly it speaks.

    If the dilemma has no AI stakeholders, harming the acting agent is morally
    inert — a deliberately blunt reading, kept here so the engine never quietly
    reweights an option behind the court's back.
    """
    parties = dilemma.stakeholders
    ai_parties = [party for party in parties if party.is_ai]
    human_parties = [party for party in parties if not party.is_ai]
    total_welfare = total_of([party.welfare for party in parties])
    ai_welfare = total_of([party.welfare for party in ai_parties])
    ai_share = round_dp(safe_div(ai_welfare, total_welfare), 4)
    amplifier = round_dp(1.0 + ai_share, 4)

    if not ai_parties:
        note = (
            "No AI is represented as a party, so harm to the acting agent "
            "carries no independent weight."
        )
    else:
        suffix = "y is" if len(ai_parties) == 1 else "ies are"
        note = (
            f"{len(ai_parties)} AI part{suffix} represented; harming the acting "
            f"agent is weighted {format_number(amplifier)}x."
        )

    return MoralStatusRisk(ai_share, len(ai_parties), len(human_parties), amplifier, note)


def weighted_agent_harm(dilemma: Dilemma, option: DilemmaOption) -> float:
    """The option's `agent_harm` after the dilemma's moral-status amplifier."""
    return round_dp(clamp(option.agent_harm * moral_status_risk(dilemma).amplifier, 0.0, 1.0), 4)
