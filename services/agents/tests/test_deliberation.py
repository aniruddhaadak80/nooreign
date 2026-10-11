"""Tests for the council engine.

Three things are under test and they are deliberately kept apart:

* **Determinism** — identical inputs, byte-identical output, and seeded jitter
  checked against golden values that would move if the PRNG were touched.
* **The trace** — the documented formula, checked term by term against
  hand-computed products rather than against whatever the engine produced.
* **Procedure** — rounds, tie-breaks, abstentions, and the argument graph,
  including the cycle case the app has to render rather than reject.
"""

from __future__ import annotations

import pytest
from services.agents.app.deliberation import (
    CLOSE_MARGIN,
    INHERITANCE,
    JITTER,
    BallotScore,
    CouncilInput,
    Mulberry32,
    StanceAdvisor,
    appeal_for,
    argument_graph_for_council,
    build_graph,
    build_trace,
    confidence_from,
    court_spread,
    court_vector,
    create_rng,
    decision,
    hash_string,
    inherited_weight,
    is_well_formed,
    jitter_for,
    minority_report,
    objection_for,
    personal_tops,
    premises_for,
    run_council,
    super_majority,
    synthesis,
    targeted_nodes,
    to_mermaid,
    topological_order,
    weighted_ballot,
)
from services.agents.app.models import (
    Advisor,
    ArgumentMove,
    AxiomVector,
    Dilemma,
    DilemmaOption,
    Stakeholder,
)
from services.agents.app.seed import ADVISORS, DELEGATION, HARVEST, KINGDOMS

# --------------------------------------------------------------------------- #
# Golden values
# --------------------------------------------------------------------------- #

# mulberry32(0), first four draws. Cross-checked against an independent
# modular-arithmetic implementation of the same algorithm; if these move, the
# engine and the website's `createRng` have diverged.
MULBERRY32_SEED0 = [
    0.26642920868471265,
    0.0003297457005828619,
    0.2232720274478197,
    0.1462021479383111,
]

# The published FNV-1a 32-bit test vectors, which `hashString` in
# packages/core/src/util/rng.ts also asserts.
FNV_EMPTY = 0x811C9DC5
FNV_A = 0xE40C292C
FNV_FOOBAR = 0xBF9CF968

# Aegis weighed against the Citadel, then scored against `hand-over`:
#   weights  0.7*own + 0.3*citadel = (0.165, 0.971, 0.585, 0.265, 0.87, 0.485)
#   deltas   (0.86, 0.40, 0.45, 0.50, 0.42, 0.62)
#   products (0.1419, 0.3884, 0.2633, 0.1325, 0.3654, 0.3007) -> 1.5922
#   weights sum 3.341, so 1.5922 / 3.341 = 0.4766
#   jitter (7, "r1", "aegis", "hand-over") = -0.0205
#   total = 1.5922 - 0.0205 = 1.5717 ; score = 0.4766 - 0.0205 = 0.4561
AEGIS_PRODUCTS = [0.1419, 0.3884, 0.2633, 0.1325, 0.3654, 0.3007]
AEGIS_SUBTOTAL = 1.5922
AEGIS_WEIGHT_SUM = 3.341
AEGIS_NORMALIZED = 0.4766
AEGIS_JITTER = -0.0205
AEGIS_TOTAL = 1.5717
AEGIS_SCORE = 0.4561


def _council(dilemma: Dilemma = DELEGATION, seed: int = 7, rounds: int = 3):
    return CouncilInput(
        dilemma=dilemma,
        advisors=ADVISORS,
        kingdoms=KINGDOMS,
        seed=seed,
        rounds=rounds,
    )


def _move(move_id: str, kind: str = "premise", weight: float = 0.5, **kwargs) -> ArgumentMove:
    return ArgumentMove(
        id=move_id,
        kind=kind,
        claim=kwargs.get("claim", "A claim long enough to satisfy the schema."),
        support=kwargs.get("support", "A support long enough to satisfy the schema."),
        weight=weight,
        leans_on=kwargs.get("leans_on", ["welfare"]),
        applies_to=kwargs.get("applies_to", []),
    )


# --------------------------------------------------------------------------- #
# Determinism
# --------------------------------------------------------------------------- #


class TestPrng:
    def test_mulberry32_matches_its_golden_stream(self) -> None:
        stream = Mulberry32(0)
        assert [stream.next() for _ in range(4)] == MULBERRY32_SEED0

    def test_mulberry32_stays_inside_the_unit_interval(self) -> None:
        stream = Mulberry32(7)
        draws = [stream.next() for _ in range(500)]
        assert all(0.0 <= draw < 1.0 for draw in draws)

    def test_seeds_diverge(self) -> None:
        assert Mulberry32(7).next() != Mulberry32(8).next()

    @pytest.mark.parametrize(
        ("text", "expected"), [("", FNV_EMPTY), ("a", FNV_A), ("foobar", FNV_FOOBAR)]
    )
    def test_hash_string_matches_the_fnv1a_vectors(self, text: str, expected: int) -> None:
        assert hash_string(text) == expected

    def test_the_separator_stops_part_boundaries_colliding(self) -> None:
        # ("ab","c") and ("a","bc") must not fold to the same stream.
        assert hash_string("ab␟c") != hash_string("a␟bc")

    def test_streams_are_reproducible(self) -> None:
        left = create_rng(11, "r1", "aegis", "hand-over")
        right = create_rng(11, "r1", "aegis", "hand-over")
        assert [left.next() for _ in range(4)] == [right.next() for _ in range(4)]

    def test_different_tags_and_seeds_decorrelate(self) -> None:
        values = {
            create_rng(1, "r1").next(),
            create_rng(1, "r2").next(),
            create_rng(2, "r1").next(),
        }
        assert len(values) == 3

    def test_pick_and_shuffle_are_deterministic(self) -> None:
        items = ["a", "b", "c", "d"]
        assert create_rng(5, "pick").pick(items) == "b"
        assert create_rng(5, "shuffle").shuffle(items) == ["d", "c", "a", "b"]
        # The source list is never mutated.
        assert items == ["a", "b", "c", "d"]

    def test_degenerate_ranges_collapse_rather_than_producing_nan(self) -> None:
        stream = create_rng(99, "bounds")
        assert stream.range(4, 4) == 4
        assert stream.int(9, 2) == 9
        assert stream.pick([]) is None

    def test_bounds_are_respected(self) -> None:
        stream = create_rng(99, "bounds")
        for _ in range(200):
            assert 0.1 <= stream.range(0.1, 0.2) < 0.2
            assert stream.int(3, 5) in (3, 4, 5)

    def test_fork_is_reproducible_but_not_the_parent(self) -> None:
        assert (
            create_rng(77, "council").fork("r1").next()
            != create_rng(77, "council").fork("r2").next()
        )
        assert (
            create_rng(77, "council").fork("r1").next()
            == create_rng(77, "council").fork("r1").next()
        )


class TestJitter:
    def test_jitter_matches_its_golden_value(self) -> None:
        assert jitter_for(7, "r1", "aegis", "hand-over") == AEGIS_JITTER

    def test_jitter_never_exceeds_the_documented_bound(self) -> None:
        assert JITTER == 0.05
        for seed in range(6):
            for option in DELEGATION.options:
                value = jitter_for(seed, "r1", "aegis", option.id)
                assert -JITTER <= value <= JITTER

    def test_jitter_is_keyed_on_ids_not_call_order(self) -> None:
        # The same pair jitters the same way even when everything else changes.
        assert jitter_for(7, "r1", "aegis", "hand-over") == jitter_for(
            7, "r1", "aegis", "hand-over"
        )
        assert jitter_for(7, "r1", "aegis", "hand-over") != jitter_for(
            7, "r2", "aegis", "hand-over"
        )

    def test_a_five_percent_perturbation_cannot_flip_a_large_margin(self) -> None:
        # Four advisors scoring two options 0.3 apart differ by at least 1.2 in
        # total, which is twenty-four times the whole jitter band.
        result = run_council(_council())
        assert abs(result.decision.margin) > 4 * JITTER


class TestDeterminism:
    def test_two_sittings_of_the_same_case_are_byte_identical(self) -> None:
        left = run_council(_council()).model_dump_json()
        right = run_council(_council()).model_dump_json()
        assert left == right

    def test_a_different_seed_changes_the_arithmetic(self) -> None:
        # The jitter must actually reach the numbers, or the seed is a lie.
        left = run_council(_council(seed=1))
        right = run_council(_council(seed=2))
        assert [t.jitter for t in left.traces] != [t.jitter for t in right.traces]

    def test_bench_order_does_not_change_any_advisors_own_verdict(self) -> None:
        forward = run_council(CouncilInput(dilemma=DELEGATION, advisors=ADVISORS, seed=3))
        reversed_court = run_council(
            CouncilInput(dilemma=DELEGATION, advisors=tuple(reversed(ADVISORS)), seed=3)
        )
        by_advisor = {p.advisor_id: [r.option_id for r in p.ranking] for p in forward.positions}
        assert {
            p.advisor_id: [r.option_id for r in p.ranking] for p in reversed_court.positions
        } == (by_advisor)


# --------------------------------------------------------------------------- #
# The trace
# --------------------------------------------------------------------------- #


class TestTrace:
    @pytest.fixture()
    def trace(self):
        result = run_council(_council())
        return next(
            t for t in result.traces if t.advisor_id == "aegis" and t.option_id == "hand-over"
        )

    def test_products_are_the_hand_computed_terms(self, trace) -> None:
        assert [term.product for term in trace.contributions] == AEGIS_PRODUCTS

    def test_subtotal_is_the_sum_of_the_printed_products(self, trace) -> None:
        assert sum(term.product for term in trace.contributions) == AEGIS_SUBTOTAL
        assert trace.subtotal == AEGIS_SUBTOTAL

    def test_weight_sum_and_normalisation(self, trace) -> None:
        assert trace.weight_sum == AEGIS_WEIGHT_SUM
        assert trace.normalized == AEGIS_NORMALIZED

    def test_the_documented_total_and_score(self, trace) -> None:
        assert trace.jitter == AEGIS_JITTER
        assert trace.total == AEGIS_TOTAL
        assert trace.score == AEGIS_SCORE

    def test_every_trace_satisfies_the_invariants(self) -> None:
        result = run_council(_council(HARVEST, seed=3))
        for trace in result.traces:
            assert round(sum(term.product for term in trace.contributions), 4) == trace.subtotal
            assert round(trace.subtotal + trace.jitter, 4) == trace.total
            assert round(trace.normalized + trace.jitter, 4) == trace.score
            assert len(trace.contributions) == 6

    def test_round_one_traces_cover_every_advisor_option_pair(self) -> None:
        result = run_council(_council())
        round_one = [t for t in result.traces if t.round == 1]
        assert len(round_one) == len(ADVISORS) * len(DELEGATION.options)
        pairs = {(t.advisor_id, t.option_id) for t in round_one}
        assert pairs == {
            (advisor.id, option.id) for advisor in ADVISORS for option in DELEGATION.options
        }

    def test_a_zero_weight_advisor_scores_zero_rather_than_dividing_by_zero(self) -> None:
        mute = Advisor(
            id="mute",
            name="Mute",
            axioms=AxiomVector(
                welfare=0.0, rights=0.0, virtue=0.0, care=0.0, justice=0.0, agency=0.0
            ),
            moves=[],
        )
        trace = build_trace(
            mute,
            mute.axioms,
            DELEGATION.options[0],
            stage=1,
            tag="r1",
            seed=0,
        )
        assert trace.weight_sum == 0.0
        assert trace.normalized == 0.0
        assert trace.total == round(trace.subtotal + trace.jitter, 4)

    def test_the_traced_weights_are_the_weights_that_scored(self) -> None:
        # The kingdom blend is what decided the case, so the trace has to show
        # it — an unblended trace would be a different verdict wearing the
        # same numbers.
        result = run_council(_council())
        trace = next(
            t for t in result.traces if t.advisor_id == "aegis" and t.option_id == "hand-over"
        )
        assert [term.weight for term in trace.contributions] == [
            0.165,
            0.971,
            0.585,
            0.265,
            0.87,
            0.485,
        ]


# --------------------------------------------------------------------------- #
# Rounds
# --------------------------------------------------------------------------- #


class TestRounds:
    def test_round_one_only_produces_ballot_traces(self) -> None:
        result = run_council(_council(rounds=1))
        assert result.rounds == 1
        assert result.objections == []
        assert result.appeals == []
        assert len(result.traces) == len(ADVISORS) * len(DELEGATION.options)

    def test_two_rounds_add_objections_but_no_appeals(self) -> None:
        result = run_council(_council(dilemma=HARVEST, seed=3, rounds=2))
        assert result.rounds == 2
        assert len(result.objections) > 0
        assert result.appeals == []

    def test_rounds_are_clamped_to_the_procedure_that_exists(self) -> None:
        # A fourth round would have no new procedure to run and would only
        # invent variation, so it is refused rather than faked.
        assert run_council(_council(rounds=0)).rounds == 1
        assert run_council(_council(rounds=9)).rounds == 3

    def test_each_objection_answers_someone(self) -> None:
        result = run_council(_council(dilemma=HARVEST, seed=3))
        assert len(result.objections) > 0
        for objection in result.objections:
            assert objection.adversary_id != ""
            assert objection.adversary_id != objection.advisor_id
            assert objection.targeted_option_id != objection.defended_option_id
            assert objection.trace.round == 2

    def test_only_the_losing_side_appeals(self) -> None:
        result = run_council(_council(dilemma=HARVEST, seed=3))
        for appeal in result.appeals:
            assert appeal.option_id != result.decision.winner_id
            assert appeal.trace.round == 3

    def test_conviction_is_the_closeness_times_the_move_weight(self) -> None:
        result = run_council(_council(dilemma=HARVEST, seed=3))
        for appeal in result.appeals:
            assert 0.0 <= appeal.conviction <= 1.0
            assert appeal.conviction <= (appeal.trace.move_weight or 1.0)


# --------------------------------------------------------------------------- #
# Ballots, decision, majority, dissent
# --------------------------------------------------------------------------- #


class TestBallotAndDecision:
    def test_every_option_appears_even_if_nobody_scored_it(self) -> None:
        tallies, total = weighted_ballot([BallotScore("a", "x", 0.4)], option_ids=["x", "unloved"])
        unloved = next(t for t in tallies if t.option_id == "unloved")
        assert unloved.votes == 0
        assert unloved.total == 0.0
        assert unloved.mean == 0.0
        assert total == 0.4

    def test_shares_sum_to_one_and_are_ordered(self) -> None:
        tallies, total = weighted_ballot(
            [
                BallotScore("a", "x", 0.6),
                BallotScore("b", "x", 0.4),
                BallotScore("a", "y", 0.3),
            ]
        )
        assert round(sum(t.share for t in tallies), 4) == 1.0
        assert [t.option_id for t in tallies] == ["x", "y"]
        assert total == 1.3

    def test_confidence_blends_margin_and_participation(self) -> None:
        assert confidence_from(0.0, 0.0) == 0.0
        assert confidence_from(1.0, 1.0) == 1.0
        # 0.6 * 0.5 + 0.4 * 0.5
        assert confidence_from(0.5, 0.5) == 0.5

    def test_an_empty_court_records_no_verdict_rather_than_guessing(self) -> None:
        verdict = decision([], list(DELEGATION.options))
        assert verdict.winner_id == ""
        assert verdict.confidence == 0.0
        assert verdict.rationale.startswith("No options were put")

    def test_tie_break_prefers_the_safer_course(self) -> None:
        risky = DilemmaOption(
            id="risky",
            label="Risky",
            deltas=AxiomVector(
                welfare=0.5, rights=0.5, virtue=0.5, care=0.5, justice=0.5, agency=0.5
            ),
            risk=0.9,
            reversibility=0.1,
            agent_harm=0.5,
        )
        safe = risky.model_copy(
            update={
                "id": "safe",
                "label": "Safe",
                "risk": 0.1,
                "reversibility": 0.9,
            }
        )
        scores = [BallotScore("a", "risky", 0.5), BallotScore("a", "safe", 0.5)]
        verdict = decision(scores, [risky, safe])
        assert verdict.tie_broken is True
        assert verdict.winner_id == "safe"
        assert verdict.margin == 0.0

    def test_a_full_tie_falls_through_to_the_id(self) -> None:
        left = DilemmaOption(
            id="aaa",
            label="Left",
            deltas=AxiomVector(
                welfare=0.5, rights=0.5, virtue=0.5, care=0.5, justice=0.5, agency=0.5
            ),
            risk=0.5,
            reversibility=0.5,
            agent_harm=0.0,
        )
        right = left.model_copy(update={"id": "bbb", "label": "Right"})
        scores = [BallotScore("a", "aaa", 0.5), BallotScore("a", "bbb", 0.5)]
        assert decision(scores, [right, left]).winner_id == "aaa"

    def test_personal_tops_break_a_shared_total_by_unanimity(self) -> None:
        # Two advisors, the same total, but one option was unanimously first.
        scores = [
            BallotScore("a", "split", 0.6),
            BallotScore("b", "split", 0.4),
            BallotScore("a", "whole", 0.5),
            BallotScore("b", "whole", 0.5),
        ]
        assert personal_tops(scores) == {"a": "split", "b": "whole"}

    def test_participation_is_the_share_who_picked_the_winner_first(self) -> None:
        result = run_council(_council(dilemma=HARVEST, seed=3))
        backing = sum(1 for p in result.positions if p.top_option_id == result.decision.winner_id)
        assert result.decision.participation == round(backing / len(ADVISORS), 4)


class TestSuperMajority:
    def test_a_split_court_abstains_rather_than_opposing(self) -> None:
        stances = [
            StanceAdvisor("a", "A", None, "yes"),
            StanceAdvisor("b", "B", None, "yes"),
            StanceAdvisor("c", "C", None, "no"),
        ]
        result = super_majority("yes", stances)
        # "C" preferred another course; they were never asked about "yes".
        assert (result.yes, result.no, result.abstainers) == (2, 0, 1)
        assert result.satisfied is True

    def test_the_raw_floor_stops_a_silent_court_clearing_a_two_thirds_bar(self) -> None:
        stances = [StanceAdvisor(f"a{i}", "A", None, "yes" if i < 2 else "other") for i in range(4)]
        result = super_majority("yes", stances)
        assert result.yes == 2
        assert result.required == 3  # ceil(2/3 * 4)
        assert result.satisfied is False

    def test_an_explicit_negative_is_counted_as_opposition(self) -> None:
        stances = [
            StanceAdvisor("a", "A", None, "yes"),
            StanceAdvisor("b", "B", None, None, "against"),
        ]
        result = super_majority("yes", stances)
        assert (result.yes, result.no, result.abstainers) == (1, 1, 0)
        assert result.ratio == 0.5
        assert result.satisfied is False

    def test_no_yes_votes_can_never_satisfy(self) -> None:
        result = super_majority("yes", [StanceAdvisor("a", "A", None, "other")])
        assert result.yes == 0
        assert result.satisfied is False

    def test_the_fixture_records_the_policy_either_way(self) -> None:
        settled = run_council(_council())
        split = run_council(_council(dilemma=HARVEST, seed=3))
        assert settled.super_majority.satisfied is True
        assert split.super_majority.satisfied is False
        assert split.super_majority.ratio == 1.0  # nobody voted against
        assert split.super_majority.abstainers > 0


class TestDissent:
    def test_unanimous_courts_have_no_minority_report(self) -> None:
        report = minority_report([], "shared-turn", list(ADVISORS))
        assert report.dissenters == []
        assert report.strongest is None
        assert report.summary == "No advisor preferred a different course."

    def test_the_strongest_objection_is_the_heaviest_one_a_dissenter_made(self) -> None:
        result = run_council(_council(dilemma=HARVEST, seed=3))
        assert len(result.dissent.dissenters) > 0
        strongest = result.dissent.strongest
        assert strongest is not None
        dissenter_ids = {d.advisor_id for d in result.dissent.dissenters}
        assert strongest.advisor_id in dissenter_ids
        assert strongest.weight == max(
            move.weight
            for advisor in ADVISORS
            if advisor.id in dissenter_ids
            for move in advisor.moves
            if move.kind in ("objection", "appeal")
        )

    def test_dissenters_are_ordered_by_how_close_they_were(self) -> None:
        result = run_council(_council(dilemma=HARVEST, seed=3))
        gaps = [d.gap_to_winner for d in result.dissent.dissenters]
        assert gaps == sorted(gaps, reverse=True)


def _backers_of_winner(result) -> list[str]:
    """""The advisors whose own top option is the court's winner.

    Read off the public positions rather than the internal ballots: which side a
    person took is a question about personal tops, and the positions are the part
    of the sitting a consumer can actually see.
    """""
    backers = sorted(
        position.advisor_id
        for position in result.positions
        if position.top_option_id == result.decision.winner_id
    )
    assert backers, "a decided court must have at least one backer"
    return backers


def _scores_from(result) -> list:
    """"Rebuild the flat ballot list `synthesis` needs from the published positions."""
    return [
        BallotScore(advisor_id=position.advisor_id, option_id=entry.option_id, score=entry.score)
        for position in result.positions
        for entry in position.ranking
    ]

class TestSynthesis:
    def test_a_split_court_builds_its_bridge_from_the_dissenting_side(self) -> None:
        """A margin *below* the threshold means the court was split.

        The direction matters and is pinned by the TypeScript reference: a mirror
        that inverts it builds its settling statement from the wrong side.
        """
        result = run_council(_council(dilemma=HARVEST, seed=3))
        split_margin = min(result.decision.margin, CLOSE_MARGIN - 0.01)

        closing = synthesis(ADVISORS, result.decision.winner_id, split_margin, _scores_from(result))

        assert closing is not None
        assert closing.close is True
        # The bridge comes from someone who did not back the winner.
        assert closing.source_advisor_id not in _backers_of_winner(result)

    def test_a_decisive_court_settles_from_the_winning_side(self) -> None:
        result = run_council(_council(dilemma=DELEGATION, seed=11))
        decisive_margin = max(result.decision.margin, CLOSE_MARGIN + 0.5)

        closing = synthesis(
            ADVISORS, result.decision.winner_id, decisive_margin, _scores_from(result)
        )

        assert closing is not None
        assert closing.close is False
        assert closing.kind in ("premise", "synthesis")
        assert closing.id.startswith("synthesis.")
        # It is drawn from the winning side, which is what a settled court says.
        assert closing.source_advisor_id in _backers_of_winner(result)

    def test_a_court_with_no_moves_settles_with_nothing(self) -> None:
        assert synthesis([], "shared-turn", 0.9, []) is None

    def test_a_court_with_no_recorded_votes_settles_with_nothing(self) -> None:
        """Without ballots there is no winning side to draw from, so there is
        nothing to say — inventing a quote here would be a fabrication."""
        assert synthesis(ADVISORS, "shared-turn", 0.9, []) is None

    def test_the_sitting_always_records_a_synthesis(self) -> None:
        for dilemma in (DELEGATION, HARVEST):
            assert run_council(_council(dilemma=dilemma)).synthesis is not None


class TestCourtVector:
    def test_the_court_is_the_mean_of_the_weighed_profiles(self) -> None:
        result = run_council(_council())
        # Aegis (0.165) + Meridian (0.949) + Quill (0.6) + Vessel (0.5) over 4.
        assert result.court_vector.welfare == 0.5535
        # Justice: 0.87 + 0.465 + 0.65 + 0.5 = 2.485 / 4 = 0.62125 -> 0.6213
        assert result.court_vector.justice == 0.6213

    def test_an_empty_court_has_no_opinion(self) -> None:
        vector = court_vector({})
        assert vector.to_array() == [0.0] * 6

    def test_spread_is_zero_for_an_empty_bench_and_positive_for_a_split_one(self) -> None:
        assert court_spread([], {}) == 0.0
        result = run_council(_council())
        assert result.court_spread > 0.0

    def test_spread_never_exceeds_two(self) -> None:
        for dilemma in (DELEGATION, HARVEST):
            assert 0.0 <= run_council(_council(dilemma=dilemma)).court_spread <= 2.0


class TestMoveSelection:
    def test_premises_come_back_heaviest_first(self) -> None:
        found = premises_for(ADVISORS[1], HARVEST)
        assert [move.weight for move in found] == sorted(
            (move.weight for move in found), reverse=True
        )

    def test_tags_decide_which_moves_are_available(self) -> None:
        without_tag = premises_for(ADVISORS[1], DELEGATION)
        assert all(not move.applies_to or move.applies_to == ["delegation"] for move in without_tag)

    def test_an_objection_aimed_at_the_rival_beats_a_heavier_general_one(self) -> None:
        # `meridian.against-rights` (0.9) is aimed at `outcomes`; asking for an
        # objection against a specific option must prefer the aimed-at move.
        aimed = objection_for(ADVISORS[1], HARVEST, "full-yield")
        assert aimed is not None
        assert aimed.kind == "objection"

    def test_an_advisor_with_no_objections_returns_none(self) -> None:
        mute = Advisor(
            id="mute",
            name="Mute",
            axioms=AxiomVector(
                welfare=0.5, rights=0.5, virtue=0.5, care=0.5, justice=0.5, agency=0.5
            ),
            moves=[_move("mute.p")],
        )
        assert objection_for(mute, DELEGATION, "shared-turn") is None
        assert appeal_for(mute, DELEGATION) is None

    def test_appeals_are_preferred_over_syntheses(self) -> None:
        found = appeal_for(ADVISORS[0], DELEGATION)
        assert found is not None
        assert found.kind == "appeal"


# --------------------------------------------------------------------------- #
# Argument graph
# --------------------------------------------------------------------------- #


class TestArgumentGraph:
    def test_explicit_targets_beat_the_id_conventions(self) -> None:
        moves = [_move("a.p"), _move("b.o", kind="objection")]
        graph = build_graph(moves, advisor_ids=["a", "b"], targets={"b.o": ["a.p"]})
        assert graph.nodes[1].targets == ["a.p"]
        assert (graph.edges[0].from_, graph.edges[0].to) == ("b.o", "a.p")
        assert graph.edges[0].kind == "attacks"

    def test_an_attack_prefix_names_the_target(self) -> None:
        moves = [_move("a.p"), _move("attack:a.p", kind="objection")]
        assert build_graph(moves).nodes[1].targets == ["a.p"]

    def test_an_arrow_names_the_target(self) -> None:
        moves = [_move("a.p"), _move("b.o->a.p", kind="objection")]
        assert build_graph(moves).nodes[1].targets == ["a.p"]

    def test_applies_to_names_the_target_only_if_it_is_a_real_move(self) -> None:
        moves = [_move("a.p"), _move("b.o", kind="objection", applies_to=["a.p"])]
        assert build_graph(moves).nodes[1].targets == ["a.p"]
        orphan = [_move("b.o", kind="objection", applies_to=["nowhere"])]
        assert build_graph(orphan).nodes[0].targets == []

    def test_unresolvable_targets_are_surfaced_not_dropped(self) -> None:
        graph = build_graph([_move("attack:ghost", kind="objection")])
        assert graph.dangling == ["attack:ghost -> ghost"]
        assert graph.edges == []

    def test_a_premise_supports_and_an_objection_attacks(self) -> None:
        moves = [_move("a.p"), _move("a.s", kind="synthesis"), _move("a.o", kind="objection")]
        graph = build_graph(moves, targets={"a.s": ["a.p"], "a.o": ["a.p"]})
        kinds = {edge.from_: edge.kind for edge in graph.edges}
        assert kinds == {"a.s": "supports", "a.o": "attacks"}

    def test_topological_order_puts_attackers_before_their_targets(self) -> None:
        moves = [_move("a.p"), _move("b.o", kind="objection")]
        graph = build_graph(moves, targets={"b.o": ["a.p"]})
        order, cycles = topological_order(graph)
        assert order.index("b.o") < order.index("a.p")
        assert cycles == []

    def test_a_cycle_is_reported_rather_than_rejected(self) -> None:
        # Two objections answering each other is a real philosophical situation
        # and the app has to be able to render it as one.
        moves = [_move("a.o", kind="objection"), _move("b.o", kind="objection")]
        graph = build_graph(moves, targets={"a.o": ["b.o"], "b.o": ["a.o"]})
        order, cycles = topological_order(graph)
        assert order == []
        assert cycles == [["a.o", "b.o"]]
        well_formed, problems = is_well_formed(graph)
        assert well_formed is False
        assert any(problem.startswith("cycle:") for problem in problems)

    def test_a_self_attack_is_reported(self) -> None:
        graph = build_graph([_move("a.p")], targets={"a.p": ["a.p"]})
        _well_formed, problems = is_well_formed(graph)
        assert "self-attack: a.p" in problems

    def test_a_clean_graph_is_well_formed(self) -> None:
        moves = [_move("a.p"), _move("b.o", kind="objection")]
        graph = build_graph(moves, targets={"b.o": ["a.p"]})
        assert is_well_formed(graph) == (True, [])

    def test_a_cycle_member_is_still_resolved_deterministically(self) -> None:
        moves = [_move("a.p", weight=0.5), _move("a.o", kind="objection", weight=0.4)]
        graph = build_graph(moves, targets={"a.o": ["a.p"], "a.p": ["a.o"]})
        assert sorted(inherited_weight(graph)) == ["a.o", "a.p"]
        # Called twice, it must not move.
        assert inherited_weight(graph) == inherited_weight(graph)

    def test_an_attack_reduces_the_targets_standing(self) -> None:
        # 0.9 own weight less 0.4 inherited from a 0.5 objection = 0.7
        moves = [_move("a.p", weight=0.9), _move("b.o", kind="objection", weight=0.5)]
        graph = build_graph(moves, targets={"b.o": ["a.p"]})
        weights = inherited_weight(graph)
        assert weights["a.p"] == 0.7
        assert weights["b.o"] == 0.5

    def test_support_raises_the_targets_standing(self) -> None:
        # 0.5 own weight plus 0.4 inherited from a 0.4 premise = 0.66
        moves = [_move("a.p", weight=0.5), _move("b.s", kind="synthesis", weight=0.4)]
        graph = build_graph(moves, targets={"b.s": ["a.p"]})
        assert inherited_weight(graph)["a.p"] == 0.66

    def test_over_attacked_premises_fall_to_the_floor(self) -> None:
        assert INHERITANCE == 0.4
        moves = [
            _move("a.p", weight=0.5),
            _move("b.o", kind="objection", weight=1.0),
            _move("c.o", kind="objection", weight=1.0),
        ]
        graph = build_graph(moves, targets={"b.o": ["a.p"], "c.o": ["a.p"]})
        # 0.5 + 0.4 * (-1.0 + -1.0) = -0.3, clamped to 0.
        assert inherited_weight(graph)["a.p"] == 0.0

    def test_mermaid_quotes_labels_and_marks_attacks(self) -> None:
        moves = [
            _move("a.p", claim='A "quoted" claim that is long enough.'),
            _move("b.o", kind="objection"),
        ]
        graph = build_graph(moves, targets={"b.o": ["a.p"]})
        rendered = to_mermaid(graph)
        assert rendered.startswith("flowchart TD")
        assert "#quot;" in rendered  # the inner quote is escaped
        assert "-.->" in rendered  # attacks are dotted
        assert "-->" not in rendered

    def test_the_sittings_own_graph_is_well_formed_and_has_edges(self) -> None:
        result = run_council(_council(dilemma=HARVEST, seed=3))
        ballot = [t for t in result.traces if t.round == 1]
        graph = argument_graph_for_council(
            ballot, result.positions, result.objections, result.appeals, result.synthesis
        )
        assert len(graph.nodes) >= len(ADVISORS)
        assert len(graph.edges) > 0
        assert graph.dangling == []
        assert is_well_formed(graph) == (True, [])
        order, cycles = topological_order(graph)
        assert cycles == []
        for edge in graph.edges:
            assert order.index(edge.from_) < order.index(edge.to)

    def test_targeted_nodes_resolves_through_the_index(self) -> None:
        moves = [_move("a.p"), _move("b.o", kind="objection")]
        graph = build_graph(moves, targets={"b.o": ["a.p"]})
        assert [node.id for node in targeted_nodes(graph, "b.o")] == ["a.p"]
        assert targeted_nodes(graph, "a.p") == []


class TestStoryStakeholders:
    def test_stakeholders_are_required_and_weighted(self) -> None:
        assert len(DELEGATION.stakeholders) >= 2
        assert any(party.is_ai for party in DELEGATION.stakeholders)
        assert all(0.0 <= party.welfare <= 1.0 for party in DELEGATION.stakeholders)

    def test_a_dilemma_cannot_have_a_single_option(self) -> None:
        with pytest.raises(ValueError):
            Dilemma(
                id="d",
                title="Only one course",
                tags=["t"],
                options=[DELEGATION.options[0]],
                stakeholders=[
                    Stakeholder(id="a", label="A", welfare=1.0, is_ai=False),
                    Stakeholder(id="b", label="B", welfare=1.0, is_ai=True),
                ],
            )
