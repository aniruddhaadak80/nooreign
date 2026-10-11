"""Tests for the ethical calculus.

Every expected number here is hand-derived rather than captured from a run: if
the engine changes, a captured number would follow it and the test would only
prove that the engine is consistent with itself. Where a value is genuinely
degenerate (a zero denominator, an empty court) the assertion is about the
documented default, because that is the contract.
"""

from __future__ import annotations

import math

import pytest
from services.agents.app.axioms import (
    ADVISOR_KINGDOM_BLEND,
    aggregate,
    agreement,
    balance,
    clamp,
    contributions,
    cosine_distance,
    deciding_axis,
    describe_profile,
    discount,
    dominant_axiom,
    fairness_index,
    fairness_of,
    format_number,
    mean_of,
    moral_status_risk,
    profile_conflict,
    rank_axes,
    round_dp,
    safe_div,
    score_option,
    score_option_with,
    secondary_axiom,
    stakeholder_total,
    total_of,
    unweighted_total,
    utilon_scale,
    weigh_advisor,
    weighted_agent_harm,
    weights_for,
)
from services.agents.app.models import (
    AXIOM_KEYS,
    Advisor,
    AxiomVector,
    Dilemma,
    DilemmaOption,
    Kingdom,
    Stakeholder,
)
from services.agents.app.seed import DELEGATION

# The worked example used throughout. Deltas are chosen so every product is
# exact in decimal, so the sums below can be checked with a pencil.
WEIGHTS = AxiomVector(welfare=0.5, rights=0.25, virtue=1.0, care=0.0, justice=0.4, agency=0.2)
DELTAS = AxiomVector(welfare=0.8, rights=0.4, virtue=0.5, care=0.6, justice=0.2, agency=1.0)
# 0.5*0.8 + 0.25*0.4 + 1*0.5 + 0*0.6 + 0.4*0.2 + 0.2*1
#   = 0.40 + 0.10 + 0.50 + 0.00 + 0.08 + 0.20 = 1.28
EXPECTED_PRODUCTS = [0.4, 0.1, 0.5, 0.0, 0.08, 0.2]
EXPECTED_SUBTOTAL = 1.28
# 0.5 + 0.25 + 1.0 + 0.0 + 0.4 + 0.2 = 2.35; 1.28 / 2.35 = 0.5446808... -> 0.5447
EXPECTED_NORMALIZED = 0.5447


def _option(**deltas: float) -> DilemmaOption:
    return DilemmaOption(
        id="opt",
        label="An option",
        deltas=AxiomVector(**{**DELTAS.model_dump(), **deltas}),
        risk=0.5,
        reversibility=0.5,
        agent_harm=0.0,
    )


def _advisor(axioms: AxiomVector, kingdom_id: str | None = None) -> Advisor:
    return Advisor(id="a", name="An advisor", kingdom_id=kingdom_id, axioms=axioms, moves=[])


# --------------------------------------------------------------------------- #
# Numeric kernel
# --------------------------------------------------------------------------- #


class TestRounding:
    def test_neutralises_binary_float_dust(self) -> None:
        # The exact reason this function exists: 0.1 + 0.2 !== 0.3 in IEEE 754.
        assert 0.1 + 0.2 != 0.3
        assert round_dp(0.1 + 0.2) == 0.3

    def test_rounds_half_away_from_zero(self) -> None:
        # 0.125 is exactly representable in binary, so this is a true tie and
        # not float dust: 12.5 -> 13.
        assert round_dp(0.125, 2) == 0.13
        assert round_dp(-0.125, 2) == -0.13
        assert round_dp(0.0625, 2) == 0.06  # 6.25 -> 6
        assert round_dp(1 / 3, 4) == 0.3333

    def test_collapses_negative_zero(self) -> None:
        # `json.dumps(-0.0)` is "-0.0", which would break byte parity with the
        # TS engine's `JSON.stringify(-0)` -> "0".
        assert math.copysign(1.0, round_dp(-0.00001, 4)) == 1.0

    def test_passes_non_finite_through_rather_than_crashing(self) -> None:
        assert math.isinf(round_dp(math.inf))
        assert math.isnan(round_dp(math.nan))

    @pytest.mark.parametrize(
        ("value", "dp", "expected"),
        [(0.6362, 2, 0.64), (0.6342, 2, 0.63), (1.0, 4, 1.0), (0.0, 4, 0.0)],
    )
    def test_respects_precision(self, value: float, dp: int, expected: float) -> None:
        assert round_dp(value, dp) == expected


class TestClampAndDiv:
    def test_clamp_contains_and_collapses_nan(self) -> None:
        assert clamp(5.0, 0.0, 1.0) == 1.0
        assert clamp(-5.0, 0.0, 1.0) == 0.0
        assert clamp(0.25, 0.0, 1.0) == 0.25
        assert clamp(math.nan, 0.0, 1.0) == 0.0

    def test_safe_div_never_produces_infinity(self) -> None:
        assert safe_div(1.0, 0.0) == 0.0
        assert safe_div(0.0, 0.0) == 0.0
        assert safe_div(1.0, 4.0) == 0.25

    def test_totals_and_means_handle_emptiness(self) -> None:
        assert total_of([]) == 0.0
        assert mean_of([]) == 0.0
        assert mean_of([1.0, 2.0, 3.0]) == 2.0

    def test_format_number_avoids_exponent_notation(self) -> None:
        # Prose is compared in tests, so it needs a platform-stable formatter.
        assert format_number(0.0001) == "0.0001"
        assert format_number(1.5) == "1.5"
        assert format_number(63.5, 0) == "64"
        assert format_number(0.0) == "0"
        assert format_number(math.inf) == "0"


# --------------------------------------------------------------------------- #
# The dot product
# --------------------------------------------------------------------------- #


class TestContributions:
    def test_products_are_hand_computed(self) -> None:
        terms = contributions(WEIGHTS, DELTAS)
        assert [term.product for term in terms] == EXPECTED_PRODUCTS

    def test_terms_follow_the_canonical_axis_order(self) -> None:
        assert [term.axiom for term in contributions(WEIGHTS, DELTAS)] == list(AXIOM_KEYS)

    def test_terms_carry_their_own_weight_and_delta(self) -> None:
        terms = contributions(WEIGHTS, DELTAS)
        assert terms[0].weight == 0.5
        assert terms[0].delta == 0.8
        assert sum(term.product for term in terms) == pytest.approx(EXPECTED_SUBTOTAL)

    def test_array_expansion_matches_the_axis_order(self) -> None:
        assert WEIGHTS.to_array() == [0.5, 0.25, 1.0, 0.0, 0.4, 0.2]
        assert DELTAS.to_array() == [0.8, 0.4, 0.5, 0.6, 0.2, 1.0]

    def test_unknown_axis_raises_rather_than_defaulting(self) -> None:
        with pytest.raises(KeyError):
            WEIGHTS.get("honour")


class TestScoring:
    def test_score_is_the_weighted_mean_of_the_deltas(self) -> None:
        # 1.28 / 2.35
        assert score_option_with(WEIGHTS, _option()) == EXPECTED_NORMALIZED

    def test_zero_weight_advisor_has_no_opinion_rather_than_nan(self) -> None:
        zero = AxiomVector(welfare=0.0, rights=0.0, virtue=0.0, care=0.0, justice=0.0, agency=0.0)
        assert score_option_with(zero, _option()) == 0.0

    def test_score_ignores_axes_the_advisor_does_not_care_about(self) -> None:
        # `care` is weighted 0, so moving it cannot change the score at all.
        base = score_option_with(WEIGHTS, _option())
        moved = score_option_with(WEIGHTS, _option(care=1.0))
        assert base == moved == EXPECTED_NORMALIZED

    def test_scoring_is_monotone_in_a_weighted_axis(self) -> None:
        low = score_option_with(WEIGHTS, _option(welfare=0.2))
        high = score_option_with(WEIGHTS, _option(welfare=1.0))
        assert high > low

    def test_score_option_uses_personal_weights_with_no_kingdom(self) -> None:
        assert score_option(_advisor(WEIGHTS), _option()) == EXPECTED_NORMALIZED


# --------------------------------------------------------------------------- #
# Kingdom blend
# --------------------------------------------------------------------------- #


class TestKingdomBlend:
    CITADEL = Kingdom(
        id="citadel",
        name="The Citadel",
        axioms=AxiomVector(
            welfare=0.2, rights=0.95, virtue=0.55, care=0.3, justice=0.8, agency=0.45
        ),
    )

    def test_blend_is_seventy_thirty_by_construction(self) -> None:
        assert ADVISOR_KINGDOM_BLEND == 0.7

    def test_blended_weights_are_hand_computed(self) -> None:
        # 0.7*w + 0.3*k for each axis:
        #  0.7*0.5  + 0.3*0.20 = 0.410
        #  0.7*0.25 + 0.3*0.95 = 0.460
        #  0.7*1.0  + 0.3*0.55 = 0.865
        #  0.7*0.0  + 0.3*0.30 = 0.090
        #  0.7*0.4  + 0.3*0.80 = 0.520
        #  0.7*0.2  + 0.3*0.45 = 0.275
        blended = weigh_advisor(_advisor(WEIGHTS), self.CITADEL)
        assert blended.to_array() == [0.41, 0.46, 0.865, 0.09, 0.52, 0.275]
        assert total_of(blended.to_array()) == pytest.approx(2.62)

    def test_no_kingdom_means_personal_weights_unchanged(self) -> None:
        advisor = _advisor(WEIGHTS)
        assert weigh_advisor(advisor).to_array() == WEIGHTS.to_array()

    def test_an_unaffiliated_advisor_never_inherits_another_courts_priors(self) -> None:
        advisor = _advisor(WEIGHTS, kingdom_id=None)
        assert weights_for(advisor, [self.CITADEL]).to_array() == WEIGHTS.to_array()

    def test_weights_for_matches_on_kingdom_id(self) -> None:
        advisor = _advisor(WEIGHTS, kingdom_id="citadel")
        assert weights_for(advisor, [self.CITADEL]) == weigh_advisor(advisor, self.CITADEL)


# --------------------------------------------------------------------------- #
# Geometry of a profile
# --------------------------------------------------------------------------- #


class TestProfileGeometry:
    UNIFORM = AxiomVector(welfare=0.5, rights=0.5, virtue=0.5, care=0.5, justice=0.5, agency=0.5)

    def test_dominant_axis_is_the_heaviest(self) -> None:
        assert dominant_axiom(WEIGHTS) == "virtue"
        assert dominant_axiom(self.UNIFORM) == "welfare"

    def test_ties_break_toward_the_earlier_axis(self) -> None:
        # The name is rendered in prose, so the tie-break has to be stable.
        assert dominant_axiom(self.UNIFORM) == "welfare"

    def test_secondary_axis_is_the_runner_up(self) -> None:
        assert secondary_axiom(WEIGHTS) == "welfare"

    def test_rank_axes_orders_descending_with_canonical_ties(self) -> None:
        assert rank_axes(WEIGHTS) == ["virtue", "welfare", "justice", "rights", "agency", "care"]
        assert rank_axes(self.UNIFORM) == list(AXIOM_KEYS)

    def test_describe_profile_names_the_two_axes_that_decide(self) -> None:
        assert describe_profile(WEIGHTS) == "virtue before welfare"

    def test_balance_is_one_only_when_perfectly_even(self) -> None:
        assert balance(self.UNIFORM) == 1.0
        assert balance(WEIGHTS) == 0.0  # 1.0 peak, 0.0 floor
        zero = AxiomVector(welfare=0.0, rights=0.0, virtue=0.0, care=0.0, justice=0.0, agency=0.0)
        assert balance(zero) == 0.0

    def test_balance_of_a_half_spread_profile(self) -> None:
        # peak 0.8, floor 0.4 -> 1 - 0.4/0.8 = 0.5
        half = AxiomVector(welfare=0.8, rights=0.8, virtue=0.8, care=0.4, justice=0.4, agency=0.4)
        assert balance(half) == 0.5

    def test_cosine_distance_is_zero_for_the_same_direction(self) -> None:
        assert cosine_distance(WEIGHTS, WEIGHTS) == 0.0
        # A scaled copy of the same profile points the same way, so distance is
        # still 0 — the measure is about lean, not about how loudly it is held.
        halved = AxiomVector(
            welfare=0.25, rights=0.125, virtue=0.5, care=0.0, justice=0.2, agency=0.1
        )
        assert cosine_distance(WEIGHTS, halved) == 0.0

    def test_orthogonal_profiles_are_one_apart(self) -> None:
        left = AxiomVector(welfare=1.0, rights=0.0, virtue=0.0, care=0.0, justice=0.0, agency=0.0)
        right = AxiomVector(welfare=0.0, rights=0.0, virtue=0.0, care=1.0, justice=0.0, agency=0.0)
        assert cosine_distance(left, right) == 1.0

    def test_a_zero_vector_has_no_direction_so_sits_at_one(self) -> None:
        zero = AxiomVector(welfare=0.0, rights=0.0, virtue=0.0, care=0.0, justice=0.0, agency=0.0)
        assert cosine_distance(WEIGHTS, zero) == 1.0

    def test_profile_conflict_lists_the_worst_axis_first(self) -> None:
        gaps = profile_conflict(WEIGHTS, self.UNIFORM)
        assert [gap.axiom for gap in gaps] == ["virtue", "care", "agency", "rights"]
        assert gaps[0].gap == 0.5

    def test_profile_conflict_threshold_is_strict(self) -> None:
        # `justice` differs by exactly 0.1 and must not appear at the default 0.15.
        axes = {gap.axiom for gap in profile_conflict(WEIGHTS, self.UNIFORM)}
        assert "justice" not in axes
        assert "justice" in {gap.axiom for gap in profile_conflict(WEIGHTS, self.UNIFORM, 0.05)}

    def test_agreement_is_the_absence_of_conflict(self) -> None:
        assert agreement(WEIGHTS, WEIGHTS) is True
        assert agreement(WEIGHTS, self.UNIFORM) is False


class TestDecidingAxis:
    def test_the_axis_that_moved_most_under_the_weights_wins(self) -> None:
        left = _option(welfare=1.0, rights=0.0)
        right = _option(welfare=0.0, rights=1.0)
        # 0.5 * 1.0 = 0.5 beats 0.25 * 1.0 = 0.25.
        assert deciding_axis(WEIGHTS, left, right) == "welfare"

    def test_a_large_swing_on_an_ignored_axis_decides_nothing(self) -> None:
        # Nobody here cares about `care`, so the court splits down that axis and
        # the deciding axis must still be welfare (the two options are identical
        # everywhere else).
        left = _option(care=0.0)
        right = _option(care=1.0)
        assert deciding_axis(WEIGHTS, left, right) == "welfare"


# --------------------------------------------------------------------------- #
# Utilons
# --------------------------------------------------------------------------- #


class TestUtilons:
    TWO_PARTIES = Dilemma(
        id="d",
        title="A two-party dispute",
        tags=["t"],
        options=[_option(), _option(welfare=0.1)],
        stakeholders=[
            Stakeholder(id="a", label="Party A", welfare=0.8, is_ai=False),
            Stakeholder(id="b", label="Party B", welfare=0.2, is_ai=False),
        ],
    )

    def test_stakeholder_total_is_the_welfare_weighted_axis(self) -> None:
        # (0.8*0.8 + 0.2*0.8) / 1.0 = 0.8
        assert stakeholder_total(self.TWO_PARTIES, _option(), "welfare") == 0.8
        # The deltas are per option, so the welfare weighting cannot move the
        # per-axis figure; that is a property of the contract, not a bug.
        assert stakeholder_total(self.TWO_PARTIES, _option(), "welfare") == (
            unweighted_total(_option(), "welfare")
        )

    def test_stakeholder_total_is_zero_without_weight(self) -> None:
        weightless = self.TWO_PARTIES.model_copy(deep=True)
        for party in weightless.stakeholders:
            party.welfare = 0.0
        assert stakeholder_total(weightless, _option(), "welfare") == 0.0

    def test_aggregate_total_is_the_mean_of_the_six_axis_totals(self) -> None:
        hand_over = next(o for o in DELEGATION.options if o.id == "hand-over")
        # deltas 0.86 + 0.40 + 0.45 + 0.50 + 0.42 + 0.62 = 3.25; 3.25/6 = 0.5417
        assert aggregate(DELEGATION, hand_over).total == 0.5417

    def test_aggregate_splits_currency_between_ai_and_humans(self) -> None:
        hand_over = next(o for o in DELEGATION.options if o.id == "hand-over")
        result = aggregate(DELEGATION, hand_over)
        # Each party's share is its welfare times the mean honour (0.541666...):
        #  0.8 * 0.541666... = 0.4333   settlers
        #  0.6 * 0.541666... = 0.3250   machine (AI)
        #  0.35 * 0.541666... = 0.1896  wardens
        assert [round(c.contribution, 4) for c in result.per_stakeholder] == [
            0.4333,
            0.325,
            0.1896,
        ]
        assert result.ai_share == 0.3429
        assert result.human_share == 0.6571
        assert round(result.ai_share + result.human_share, 4) == 1.0

    def test_aggregate_spread_is_the_max_minus_min_contribution(self) -> None:
        hand_over = next(o for o in DELEGATION.options if o.id == "hand-over")
        result = aggregate(DELEGATION, hand_over)
        assert result.spread_raw == 0.2437  # 0.4333 - 0.1896

    def test_discounting_is_hyperbolic_and_optional(self) -> None:
        assert discount(0.8, 10, 0.1) == 0.4  # 0.8 / (1 + 0.1*10)
        assert discount(0.8, 10, 0.0) == 0.8
        assert discount(0.8, 10, -0.5) == 0.8  # no discounting at a negative rate
        assert discount(0.8, -5, 0.1) == 0.8  # a negative horizon is floored at 0

    def test_discounting_is_monotone_in_the_horizon(self) -> None:
        assert discount(1.0, 1, 0.05) > discount(1.0, 100, 0.05) > 0.0

    @pytest.mark.parametrize(
        ("values", "expected"),
        [
            ([0.5, 0.5], 0.0),  # perfect equality
            ([1.0, 0.0], 0.5),  # pairwise sum 2, mean 0.5 -> 2/4, /(n-1)=1
            ([1.0, 0.0, 0.0], 0.3333),  # pairwise sum 4, mean 1/3 -> 4/6, /2
            ([0.0, 0.0], 0.0),  # all-zero is perfect equality by convention
            ([], 0.0),
            ([0.7], 0.0),  # nothing to be unequal against
        ],
    )
    def test_fairness_index_matches_hand_computed_gini(self, values, expected) -> None:
        assert fairness_index(values) == expected

    def test_fairness_index_is_bounded_and_ordered(self) -> None:
        assert fairness_index([0.25, 0.25, 0.25, 0.25]) == 0.0
        assert fairness_index([1.0, 0.0, 0.0, 0.0]) > fairness_index([0.7, 0.1, 0.1, 0.1])

    def test_fairness_of_reads_the_aggregate_breakdown(self) -> None:
        hand_over = next(o for o in DELEGATION.options if o.id == "hand-over")
        result = aggregate(DELEGATION, hand_over)
        assert fairness_of(result) == 0.0857

    @pytest.mark.parametrize(
        ("total", "band"),
        [
            (0.0, "tragic"),
            (0.1, "tragic"),
            (0.25, "costly"),  # thresholds are exclusive ceilings
            (0.44, "costly"),
            (0.45, "neutral"),
            (0.61, "neutral"),
            (0.62, "generous"),
            (0.81, "generous"),
            (0.82, "transformative"),
            (1.0, "transformative"),
            (1.5, "transformative"),  # clamped
            (-0.5, "tragic"),  # clamped
        ],
    )
    def test_utilon_bands(self, total: float, band: str) -> None:
        assert utilon_scale(total).band == band

    def test_utilon_scale_carries_a_human_label(self) -> None:
        assert "Transformative" in utilon_scale(1.0).label


class TestMoralStatus:
    def test_no_ai_party_means_agent_harm_is_inert(self) -> None:
        risk = moral_status_risk(TestUtilons.TWO_PARTIES)
        assert risk.ai_count == 0
        assert risk.amplifier == 1.0
        assert "no independent weight" in risk.note

    def test_a_represented_ai_amplifies_agent_harm(self) -> None:
        # AI welfare 0.6 of a total 1.75 -> share 0.3429, amplifier 1.3429
        risk = moral_status_risk(DELEGATION)
        assert risk.ai_count == 1
        assert risk.human_count == 2
        assert risk.ai_welfare_share == 0.3429
        assert risk.amplifier == 1.3429

    def test_weighted_agent_harm_applies_the_amplifier(self) -> None:
        hand_over = next(o for o in DELEGATION.options if o.id == "hand-over")
        assert weighted_agent_harm(DELEGATION, hand_over) == 0.4029  # 0.3 * 1.3429

    def test_agent_harm_is_bounded_at_one(self) -> None:
        # An even human/AI split amplifies by 1.5, which would push 0.8 past 1.
        heavy = Dilemma(
            id="h",
            title="Heavy",
            tags=["t"],
            options=[_option(), _option(welfare=0.1)],
            stakeholders=[
                Stakeholder(id="a", label="A", welfare=1.0, is_ai=False),
                Stakeholder(id="b", label="B", welfare=1.0, is_ai=True),
            ],
        )
        harsh = _option()
        harsh.agent_harm = 0.8
        assert weighted_agent_harm(heavy, harsh) == 1.0
