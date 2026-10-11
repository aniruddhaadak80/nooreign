"""The council engine: three rounds, seeded jitter, and a trace you can audit.

WHY this shape: Nooreign's central promise is a verdict that is *explainable*.
A language model can tell you an answer is defensible; this engine tells you
which six multiplications produced it, who objected, and what they said. So the
module is organised around producing an audit trail first and a verdict second.

**Determinism is load-bearing.** Identical inputs produce byte-identical
output. Every source of variation — tie-breaks, "best move" selection, the
jitter that stops every advisor being perfectly rational — is drawn from a
seeded stream keyed on ids, never from iteration order or wall-clock time. The
PRNG here is a port of the TypeScript `mulberry32` in
`packages/core/src/util/rng.ts`, down to the FNV-1a string hash over UTF-16
code units, so a verdict rendered by the website and a verdict returned by
this service are the same verdict.

**The trace is the answer.** `TraceEntry` carries, per advisor per option, the
six `weight x delta = product` terms, the subtotal they sum to, the jitter that
was added, and the rounded total — the documented formula, in order, so a UI
can print the arithmetic next to the verdict and the two cannot disagree.
"""

from __future__ import annotations

import math
from collections.abc import Mapping, Sequence
from dataclasses import dataclass, field

from .axioms import (
    balance,
    clamp,
    cosine_distance,
    deciding_axis,
    describe_profile,
    dominant_axiom,
    format_number,
    mean_of,
    round_dp,
    safe_div,
    score_option_with,
    total_of,
    utilon_scale,
    weigh_advisor,
)
from .axioms import (
    contributions as axiom_contributions,
)
from .models import (
    AXIOM_KEYS,
    Advisor,
    AppealRecord,
    ArgumentMove,
    AxiomKey,
    AxiomVector,
    BallotTally,
    CouncilResult,
    DecisionRecord,
    Dilemma,
    DilemmaOption,
    DissentEntry,
    GraphEdge,
    GraphNode,
    Kingdom,
    MinorityReport,
    MinorityStrongest,
    ObjectionRecord,
    PositionRecord,
    RankedOption,
    SuperMajority,
    SynthesisMove,
    TraceEntry,
)

__all__ = [
    "CLOSE_MARGIN",
    "INHERITANCE",
    "JITTER",
    "BallotScore",
    "CouncilInput",
    "Graph",
    "Mulberry32",
    "Rng",
    "advisors_in_graph",
    "argument_graph_for_council",
    "build_graph",
    "build_trace",
    "court_spread",
    "court_vector",
    "create_rng",
    "hash_string",
    "inherited_weight",
    "is_well_formed",
    "jitter_for",
    "node_index",
    "run_council",
    "targeted_nodes",
    "to_mermaid",
    "topological_order",
]

#: The largest perturbation any score may receive, in either direction.
#: Deliberately tiny: a philosopher who is off by a twentieth of their own
#: confidence is still a philosopher with a view. Anything larger would let the
#: seed decide verdicts, which would defeat the point of a transparent engine.
JITTER = 0.05

#: A margin at or above this means the court was split, so the settling
#: statement has to be built out of the *dissenting* advisors' bridge moves.
CLOSE_MARGIN = 0.25

#: How much of a neighbouring move's standing is inherited. 0.4 rather than 1
#: because influence must decay down a chain: if every objection transferred
#: its full weight, a long argument would compound into certainty that the
#: reasoning has not earned.
INHERITANCE = 0.4

#: Prefixes a move id may use to name the move it attacks, longest first.
_TARGET_PREFIXES: tuple[str, ...] = ("attack:", "objection:", "vs:")
_TARGET_ARROW = "->"

#: JavaScript string hashing is over UTF-16 code units, so ids containing
#: astral-plane characters must fold the same way here as they do there.
_SEED_SEPARATOR = "\u241f"
_U32_MASK = 0xFFFFFFFF


# --------------------------------------------------------------------------- #
# Deterministic randomness
# --------------------------------------------------------------------------- #


def hash_string(text: str) -> int:
    """FNV-1a, 32-bit, over UTF-16 code units.

    A port of the TypeScript `hashString`: string seeds are folded into the
    integer seed so streams can be keyed off human-readable tags ("r1", advisor
    slugs, dilemma ids) instead of opaque counters. Hashing code units rather
    than code points keeps surrogate pairs folding the way `charCodeAt` folds
    them in the browser.
    """
    accumulator = 0x811C9DC5
    units = text.encode("utf-16-le")
    for index in range(0, len(units), 2):
        code_unit = units[index] | (units[index + 1] << 8)
        accumulator ^= code_unit
        accumulator = (accumulator * 0x01000193) & _U32_MASK
    return accumulator & _U32_MASK


class Mulberry32:
    """A 32-bit state generator with a full 2^32 period.

    Chosen over anything statistically cleverer because it is four lines, has
    no hidden tables, and is trivially portable — which matters far more here
    than the quality of its distribution. The arithmetic mirrors `Math.imul`,
    which coerces to int32 at every step.
    """

    __slots__ = ("_state",)

    def __init__(self, seed: int) -> None:
        self._state = seed & _U32_MASK

    def next(self) -> float:
        """Uniform in `[0, 1)`."""
        self._state = (self._state + 0x6D2B79F5) & _U32_MASK
        value = self._state
        value = ((value ^ (value >> 15)) * (value | 1)) & _U32_MASK
        value ^= (value + (((value ^ (value >> 7)) * (value | 61)) & _U32_MASK)) & _U32_MASK
        return ((value ^ (value >> 14)) & _U32_MASK) / 4294967296


class Rng:
    """A seeded stream plus the handful of draws the council actually needs."""

    __slots__ = ("_seed", "stream")

    def __init__(self, seed: int) -> None:
        self._seed = seed & _U32_MASK
        self.stream = Mulberry32(self._seed)

    def next(self) -> float:
        """Uniform in `[0, 1)`."""
        return self.stream.next()

    def range(self, low: float, high: float) -> float:
        """Uniform in `[low, high)`; an inverted range collapses to `low`."""
        if high < low:
            return low
        return low + self.next() * (high - low)

    def int(self, low: int, high: int) -> int:
        """Uniform integer in `[low, high]`, both inclusive."""
        if high < low:
            return low
        return low + math.floor(self.next() * (high - low + 1))

    def pick(self, items: Sequence[str]) -> str | None:
        """Uniform choice, or `None` when there is nothing to choose from.

        Picking from an empty list is a bug in the caller rather than a random
        state, so it degrades to `None` instead of raising — every caller here
        already treats "no candidate" as a normal branch.
        """
        if not items:
            return None
        index = min(len(items) - 1, math.floor(self.next() * len(items)))
        return items[index]

    def shuffle(self, items: Sequence[str]) -> list[str]:
        """Fisher-Yates on a copy; the input sequence is never mutated."""
        out = list(items)
        for index in range(len(out) - 1, 0, -1):
            swap = math.floor(self.next() * (index + 1))
            out[index], out[swap] = out[swap], out[index]
        return out

    def fork(self, tag: str) -> Rng:
        """A decorrelated child stream derived from this one's seed plus `tag`."""
        return create_rng(self._seed, tag)


def create_rng(*parts: str | int) -> Rng:
    """Build a stream from a seed and any number of key parts.

    Parts are joined with a separator that cannot appear in a normal id, so
    `create_rng(1, "ab", "c")` and `create_rng(1, "a", "bc")` do not collide.
    """
    return Rng(hash_string(_SEED_SEPARATOR.join(str(part) for part in parts)))


def jitter_for(seed: int, tag: str, advisor_id: str, option_id: str) -> float:
    """A signed perturbation in `[-JITTER, +JITTER]`, keyed on the ids involved.

    Keying on ids means the same advisor/option pair jitters identically even
    when the rest of the court changes — a stable court is a court whose
    verdicts can be compared across sessions.
    """
    rng = create_rng(seed, tag, advisor_id, option_id)
    return round_dp((rng.next() * 2.0 - 1.0) * JITTER, 4)


# --------------------------------------------------------------------------- #
# Move selection
# --------------------------------------------------------------------------- #


def matching_moves(advisor: Advisor, dilemma: Dilemma) -> list[ArgumentMove]:
    """Moves apt for this dilemma, heaviest first, ties broken on move id.

    A move with no `appliesTo` is always available; otherwise one of the
    dilemma's tags must match.
    """
    tags = set(dilemma.tags)
    applicable = [
        move
        for move in advisor.moves
        if not move.applies_to or any(tag in tags for tag in move.applies_to)
    ]
    return sorted(applicable, key=lambda move: (-move.weight, move.id))


def premises_for(advisor: Advisor, dilemma: Dilemma) -> list[ArgumentMove]:
    """Round 1: the advisor's best-matching non-attacking moves."""
    return [move for move in matching_moves(advisor, dilemma) if move.kind == "premise"]


def objection_for(advisor: Advisor, dilemma: Dilemma, rival_option_id: str) -> ArgumentMove | None:
    """Round 2: the advisor's strongest applicable objection.

    A move tagged with the rival's own option id is aimed at that option
    specifically; otherwise the top objection answers the strongest rival.
    """
    matching = [move for move in matching_moves(advisor, dilemma) if move.kind == "objection"]
    for move in matching:
        if rival_option_id in move.applies_to:
            return move
    return matching[0] if matching else None


def appeal_for(advisor: Advisor, dilemma: Dilemma) -> ArgumentMove | None:
    """Round 3: an `appeal` or `synthesis` move.

    Appeals come first, because a losing advisor asking for a re-hearing is
    more characteristic of a deliberation than a synthesis, which is what you
    offer once you already hold the floor.
    """
    candidates = [
        move for move in matching_moves(advisor, dilemma) if move.kind in ("appeal", "synthesis")
    ]
    if not candidates:
        return None
    return sorted(
        candidates,
        key=lambda move: (0 if move.kind == "appeal" else 1, -move.weight, move.id),
    )[0]


# --------------------------------------------------------------------------- #
# Traces
# --------------------------------------------------------------------------- #


def build_trace(
    advisor: Advisor,
    vector: AxiomVector,
    option: DilemmaOption,
    *,
    stage: int,
    tag: str,
    seed: int,
    jitter_option_id: str | None = None,
    move: ArgumentMove | None = None,
) -> TraceEntry:
    """One scored (advisor, option) pair with the whole arithmetic attached.

    The formula, in the order the numbers are produced:

    * `subtotal   = round4(sum_i weight_i * delta_i)`
    * `normalized = round4(subtotal / sum_i weight_i)` — the ballot's score
    * `jitter     = round4((u * 2 - 1) * JITTER)` for a seeded draw `u`
    * `total      = round4(subtotal + jitter)`
    * `score      = round4(normalized + jitter)`

    `total` and `score` differ on purpose: `total` is the documented formula's
    headline, `score` is the weight-normalised number the ballot ranks. Both are
    shipped so no consumer has to recompute one.
    """
    terms = axiom_contributions(vector, option.deltas)
    subtotal = round_dp(total_of([term.product for term in terms]), 4)
    weight_sum = round_dp(total_of(vector.to_array()), 4)
    normalized = round_dp(safe_div(subtotal, weight_sum), 4) if weight_sum else 0.0
    jitter = jitter_for(seed, tag, advisor.id, jitter_option_id or option.id)

    return TraceEntry(
        advisor_id=advisor.id,
        advisor_name=advisor.name,
        kingdom_id=advisor.kingdom_id,
        round=stage,
        kind=move.kind if move else None,
        option_id=option.id,
        move_id=move.id if move else None,
        claim=move.claim if move else None,
        premise=move.support if move else None,
        leans_on=list(move.leans_on) if move else [],
        move_weight=round_dp(move.weight, 4) if move else None,
        contributions=terms,
        subtotal=subtotal,
        weight_sum=weight_sum,
        normalized=normalized,
        jitter=jitter,
        total=round_dp(subtotal + jitter, 4),
        score=round_dp(normalized + jitter, 4),
    )


# --------------------------------------------------------------------------- #
# Ballots, decision, majority, dissent, synthesis
# --------------------------------------------------------------------------- #


@dataclass(frozen=True)
class BallotScore:
    advisor_id: str
    option_id: str
    #: Conviction in [0, 1]. Higher means more certain, not more agreeable.
    score: float


@dataclass(frozen=True)
class StanceAdvisor:
    advisor_id: str
    advisor_name: str
    kingdom_id: str | None
    top_option_id: str | None
    #: Explicit override. `None` derives the stance from `top_option_id`.
    stance: str | None = None


def weighted_ballot(
    scores: Sequence[BallotScore], option_ids: Sequence[str] = ()
) -> tuple[list[BallotTally], float]:
    """Tally scores into per-option totals and shares.

    Options nobody scored are kept with a zero tally — the council has to be
    able to say "this option was available and no one wanted it", which is a
    fact and not a silence.
    """
    ids = sorted({*option_ids, *(score.option_id for score in scores)})

    tallies: list[BallotTally] = []
    for option_id in ids:
        cast = [score for score in scores if score.option_id == option_id]
        tallies.append(
            BallotTally(
                option_id=option_id,
                total=round_dp(total_of([score.score for score in cast]), 4),
                share=0.0,
                mean=round_dp(mean_of([score.score for score in cast]), 4),
                votes=len(cast),
                supporters=sorted(score.advisor_id for score in cast),
            )
        )

    grand_total = round_dp(total_of([tally.total for tally in tallies]), 4)
    with_shares = [
        tally.model_copy(update={"share": round_dp(safe_div(tally.total, grand_total), 4)})
        for tally in tallies
    ]
    return sorted(with_shares, key=lambda tally: (-tally.total, tally.option_id)), grand_total


def confidence_from(relative_margin: float, participation: float) -> float:
    """Blend how decisive the numbers were with how many advisors backed them.

    A 60/40 split that every advisor agrees on is a firmer verdict than the
    same split produced by two camps — and a unanimous court that barely scored
    anything is not a firm verdict at all.
    """
    return round_dp(
        clamp(
            0.6 * clamp(relative_margin, 0.0, 1.0) + 0.4 * clamp(participation, 0.0, 1.0),
            0.0,
            1.0,
        ),
        4,
    )


def personal_tops(scores: Sequence[BallotScore]) -> dict[str, str]:
    """Each advisor's own first-ranked option, derived from their cast scores."""
    tops: dict[str, str] = {}
    for advisor_id in sorted({score.advisor_id for score in scores}):
        own = sorted(
            (score for score in scores if score.advisor_id == advisor_id),
            key=lambda score: (-score.score, score.option_id),
        )
        tops[advisor_id] = own[0].option_id
    return tops


def decision(scores: Sequence[BallotScore], options: Sequence[DilemmaOption]) -> DecisionRecord:
    """Decide the case.

    **Tie-break policy, in order** (each step fully determines the next, so the
    result is a pure function of its inputs):

    1. highest ballot total;
    2. highest mean score per advisor — a unanimous preference beats a split one
       carrying the same total;
    3. lowest `risk` — the court does not hand a tied victory to the more
       dangerous course;
    4. lexicographically smallest id — a total tie-break, so two councils with
       identical numbers always produce identical output.
    """
    if not options:
        return _no_verdict()

    # An empty court has no convictions to add up. `weighted_ballot` still returns
    # one zeroed tally per option, so without this guard the court would "decide"
    # the case by falling through to the lexicographic tie-break — inventing a
    # winner out of an empty room.
    if not scores:
        return _no_verdict()

    by_id = {option.id: option for option in options}
    tallies, _grand = weighted_ballot(scores, [option.id for option in options])
    if not tallies:
        return _no_verdict()

    ordered = sorted(
        tallies,
        key=lambda tally: (
            -tally.total,
            -tally.mean,
            by_id[tally.option_id].risk if tally.option_id in by_id else 0.0,
            tally.option_id,
        ),
    )
    first = ordered[0]
    second = ordered[1] if len(ordered) > 1 else None

    margin = round_dp(first.total - (second.total if second else 0.0), 4)
    tied_on_total = second is not None and first.total == second.total
    relative_margin = round_dp(clamp(safe_div(margin, max(first.total, 1e-9)), 0.0, 1.0), 4)

    tops = personal_tops(scores)
    backing = sum(1 for top in tops.values() if top == first.option_id)
    participation = round_dp(safe_div(backing, len(tops)), 4)

    winner = by_id.get(first.option_id)
    winner_label = winner.label if winner else first.option_id
    rationale = [
        f"{winner_label} carried {format_number(first.share * 100, 1)}% of the court's conviction"
    ]
    if second is not None:
        runner = by_id.get(second.option_id)
        rationale.append(
            f"a margin of {format_number(margin)} over "
            f"{runner.label if runner else second.option_id}"
        )
    if tied_on_total:
        rationale.append("the totals were level and the tie-break decided it")
    rationale.append(f"{backing} of {len(tops)} advisors put it first")

    return DecisionRecord(
        winner_id=first.option_id,
        winner_label=winner_label,
        margin=margin,
        ratio=round_dp(safe_div(first.total, max(second.total if second else 0.0, 1e-9)), 4),
        confidence=confidence_from(relative_margin, participation),
        participation=participation,
        runner_up_id=second.option_id if second else None,
        tie_broken=tied_on_total,
        rationale=f"{', '.join(rationale)}.",
    )


def _no_verdict() -> DecisionRecord:
    """The verdict for a court that was given nothing to decide."""
    return DecisionRecord(
        winner_id="",
        winner_label="",
        margin=0.0,
        ratio=1.0,
        confidence=0.0,
        participation=0.0,
        runner_up_id=None,
        tie_broken=False,
        rationale="No options were put to the court, so there is no verdict to record.",
    )


def super_majority(
    option_id: str, advisors: Sequence[StanceAdvisor], threshold: float = 2.0 / 3.0
) -> SuperMajority:
    """Did the court actually agree?

    **Policy.** An advisor whose own top option differs from the one on the
    table abstains: they were asked about a course they had already ranked
    below another, and counting them as opposition would manufacture a conflict
    the deliberation did not produce. Abstentions therefore do not enter the
    ratio (the standard parliamentary convention) but *do* count against a raw
    floor, so a court of ten with three silent members cannot clear a two-thirds
    bar on seven votes alone.
    """
    yes = 0
    no = 0
    abstainers = 0
    for advisor in advisors:
        if advisor.stance is not None:
            stance = advisor.stance
        elif advisor.top_option_id is None:
            stance = "abstain"
        else:
            stance = "for" if advisor.top_option_id == option_id else "abstain"
        if stance == "for":
            yes += 1
        elif stance == "against":
            no += 1
        else:
            abstainers += 1

    ratio = round_dp(safe_div(yes, yes + no), 4)
    support = round_dp(safe_div(yes, len(advisors)), 4)
    required = math.ceil(threshold * len(advisors))
    return SuperMajority(
        option_id=option_id,
        satisfied=yes > 0 and ratio >= threshold and yes >= required,
        threshold=round_dp(threshold, 4),
        yes=yes,
        no=no,
        abstainers=abstainers,
        ratio=ratio,
        support=support,
        required=required,
    )


def minority_report(
    scores: Sequence[BallotScore], winner_id: str, advisors: Sequence[Advisor]
) -> MinorityReport:
    """Who dissented, and what their best argument was.

    "Strongest" is the highest-weighted objection or appeal made by a
    dissenter, ties broken on advisor id then move id — so the same sitting
    always surfaces the same objection, never whichever happened to be
    enumerated last.
    """
    tops: dict[str, tuple[str, float]] = {}
    for advisor in advisors:
        own = [score for score in scores if score.advisor_id == advisor.id]
        if not own:
            continue
        best = max(own, key=lambda score: score.score)
        tops[advisor.id] = (best.option_id, best.score)

    winner_scores = [score.score for score in scores if score.option_id == winner_id]

    dissenters = sorted(
        (
            DissentEntry(
                advisor_id=advisor.id,
                advisor_name=advisor.name,
                kingdom_id=advisor.kingdom_id,
                preferred_option_id=tops[advisor.id][0],
                gap_to_winner=round_dp(max(0.0, tops[advisor.id][1] - mean_of(winner_scores)), 4),
            )
            for advisor in advisors
            if advisor.id in tops and tops[advisor.id][0] != winner_id
        ),
        key=lambda entry: (-entry.gap_to_winner, entry.advisor_id),
    )

    dissent_ids = {entry.advisor_id for entry in dissenters}
    candidates = sorted(
        (
            (advisor, move)
            for advisor in advisors
            if advisor.id in dissent_ids
            for move in advisor.moves
            if move.kind in ("objection", "appeal")
        ),
        key=lambda pair: (-pair[1].weight, pair[0].id, pair[1].id),
    )

    strongest: MinorityStrongest | None = None
    if candidates:
        advisor, move = candidates[0]
        strongest = MinorityStrongest(
            advisor_id=advisor.id,
            advisor_name=advisor.name,
            move_id=move.id,
            claim=move.claim,
            support=move.support,
            weight=round_dp(move.weight, 4),
            leans_on=list(move.leans_on),
        )

    if not dissenters:
        summary = "No advisor preferred a different course."
    else:
        plural = "" if len(dissenters) == 1 else "s"
        who = strongest.advisor_name if strongest else "the minority"
        claim = strongest.claim if strongest else "no recorded objection"
        summary = (
            f"{len(dissenters)} advisor{plural} preferred another course; "
            f'{who} put it best as "{claim}".'
        )

    return MinorityReport(
        winner_id=winner_id, dissenters=dissenters, strongest=strongest, summary=summary
    )


def synthesis(
    advisors: Sequence[Advisor],
    winner_id: str,
    margin: float,
    scores: Sequence[BallotScore] = (),
) -> SynthesisMove | None:
    """The court's settling statement, drawn from the advisors' own moves.

    A margin *below* `CLOSE_MARGIN` means the court was split, so the synthesis
    is built from the *dissenting* advisors' bridge moves — the bridge that
    actually had to be built. At or above that margin the court was decisive,
    and the synthesis comes from the winning side's premises, which is what a
    settled court says. Within the eligible pool the highest weight wins, ties
    broken on advisor id then move id.

    NOTE: the threshold direction here must match
    `packages/core/src/council/consensus.ts`, which is the reference
    implementation the TypeScript tests pin. A council whose synthesis is drawn
    from the wrong side is a parity bug, not a stylistic difference.
    """
    close = margin < CLOSE_MARGIN
    tops = personal_tops(scores)
    wanted = ("synthesis", "appeal") if close else ("premise", "synthesis")

    def eligible(advisor: Advisor) -> bool:
        backed = tops.get(advisor.id) == winner_id
        return backed != close  # close -> dissenting; decisive -> winning side

    pool = [
        (advisor, move)
        for advisor in advisors
        if eligible(advisor)
        for move in advisor.moves
        if move.kind in wanted
    ]
    if not pool and close:
        # No dissenting advisor offered a bridge move; fall back to the whole
        # court so the council always records something it can render.
        pool = [
            (advisor, move)
            for advisor in advisors
            for move in advisor.moves
            if move.kind in ("synthesis", "appeal", "premise")
        ]
    if not pool:
        return None

    pool.sort(key=lambda pair: (-pair[1].weight, pair[0].id, pair[1].id))
    advisor, move = pool[0]
    return SynthesisMove(
        id=f"synthesis.{advisor.id}.{move.id}",
        kind="synthesis",
        claim=move.claim,
        support=move.support,
        weight=round_dp(move.weight, 4),
        leans_on=list(move.leans_on),
        applies_to=list(move.applies_to),
        source_advisor_id=advisor.id,
        source_move_id=move.id,
        source_advisor_name=advisor.name,
        close=close,
    )


# --------------------------------------------------------------------------- #
# The sitting
# --------------------------------------------------------------------------- #


@dataclass(frozen=True)
class CouncilInput:
    """Everything the engine needs, and nothing it would have to fetch itself."""

    dilemma: Dilemma
    advisors: tuple[Advisor, ...]
    kingdoms: tuple[Kingdom, ...] = ()
    seed: int = 0
    rounds: int = 3
    quorum: int | None = None


_ZERO_VECTOR = AxiomVector(welfare=0.0, rights=0.0, virtue=0.0, care=0.0, justice=0.0, agency=0.0)


def court_vector(weights: Mapping[str, AxiomVector]) -> AxiomVector:
    """The court's blended view: the mean of every advisor's weighed vector."""
    vectors = list(weights.values())
    if not vectors:
        return _ZERO_VECTOR.model_copy(deep=True)
    return AxiomVector(
        **{
            key: round_dp(total_of([vector.get(key) for vector in vectors]) / len(vectors), 4)
            for key in AXIOM_KEYS
        }
    )


def court_spread(advisors: Sequence[Advisor], weights: Mapping[str, AxiomVector]) -> float:
    """How far the most distant advisor sits from the court's blended position.

    Measured against each advisor's *personal* profile rather than their weighed
    one: the question being asked is how far an individual's own commitments
    sit from the institution they are sitting in, and the institution's weight
    on them would hide exactly the distance being measured.
    """
    if not advisors:
        return 0.0
    court = court_vector(weights)
    return round_dp(max(cosine_distance(advisor.axioms, court) for advisor in advisors), 4)


def utilon_total(dilemma: Dilemma, option: DilemmaOption) -> float:
    """The welfare-weighted axis average for an option — `aggregate().total`."""
    weight_sum = total_of([party.welfare for party in dilemma.stakeholders])
    if weight_sum == 0:
        return 0.0
    per_axis = [
        total_of([party.welfare * option.deltas.get(key) for party in dilemma.stakeholders])
        / weight_sum
        for key in AXIOM_KEYS
    ]
    return round_dp(total_of(per_axis) / len(AXIOM_KEYS), 4)


def run_council(council_input: CouncilInput) -> CouncilResult:
    """Convene a court and return the whole sitting.

    Rounds are fixed by contract — 1 = positions, 2 = objections, 3 = appeals. A
    `rounds` below 1 is clamped to 1 and above 3 to 3, because a fourth round
    would have no new procedure to run and would only invent variation.

    The ballot uses each advisor's *kingdom-weighted* vector, so a Citadel Kant
    and an unaffiliated Kant are not the same witness. The trace shows the same
    weights it scored with, so the arithmetic on screen is the arithmetic that
    decided the case.
    """
    dilemma = council_input.dilemma
    advisors = tuple(council_input.advisors)
    seed = council_input.seed
    rounds = clamp(math.trunc(council_input.rounds), 1, 3)

    kingdom_by_id = {kingdom.id: kingdom for kingdom in council_input.kingdoms}
    weights = {
        advisor.id: weigh_advisor(
            advisor,
            kingdom_by_id.get(advisor.kingdom_id) if advisor.kingdom_id else None,
        )
        for advisor in advisors
    }

    traces: list[TraceEntry] = []
    ballot_traces: list[TraceEntry] = []
    positions: list[PositionRecord] = []
    objections: list[ObjectionRecord] = []
    appeals: list[AppealRecord] = []
    ballot_scores: list[BallotScore] = []

    # ---- Round 1: positions ------------------------------------------------ #
    for advisor in advisors:
        vector = weights[advisor.id]
        scored: list[RankedOption] = []
        for option in dilemma.options:
            raw = score_option_with(vector, option)
            jitter = jitter_for(seed, "r1", advisor.id, option.id)
            score = round_dp(raw + jitter, 4)
            scored.append(RankedOption(option_id=option.id, score=score, raw=round_dp(raw, 4)))
            ballot_scores.append(
                BallotScore(advisor_id=advisor.id, option_id=option.id, score=score)
            )

        ranking = sorted(scored, key=lambda entry: (-entry.score, entry.option_id))
        top_option_id = (
            ranking[0].option_id if ranking else (dilemma.options[0].id if dilemma.options else "")
        )
        premise_moves = premises_for(advisor, dilemma)
        best_premise = premise_moves[0] if premise_moves else None

        positions.append(
            PositionRecord(
                advisor_id=advisor.id,
                advisor_name=advisor.name,
                kingdom_id=advisor.kingdom_id,
                top_option_id=top_option_id,
                ranking=ranking,
                premise_move_ids=[move.id for move in premise_moves],
                profile=describe_profile(vector),
                balance=balance(vector),
            )
        )

        # One trace per advisor *per option*: the ballot is the answer, and a
        # trace that only shows the winner is a trace that hides the margins.
        for option in dilemma.options:
            trace = build_trace(
                advisor,
                vector,
                option,
                stage=1,
                tag="r1",
                seed=seed,
                move=best_premise if option.id == top_option_id else None,
            )
            ballot_traces.append(trace)
            traces.append(trace)

    # ---- Round 2: objections ----------------------------------------------- #
    if rounds >= 2:
        for advisor in advisors:
            own = next((p for p in positions if p.advisor_id == advisor.id), None)
            if own is None:
                continue
            # The strongest rival is the best option that is not the advisor's own.
            rival = next((r for r in own.ranking if r.option_id != own.top_option_id), None)
            if rival is None:
                continue
            move = objection_for(advisor, dilemma, rival.option_id)
            defended = next((o for o in dilemma.options if o.id == own.top_option_id), None)
            if move is None or defended is None:
                continue

            # The objection *answers* whoever ranked that rival first: a
            # deliberation is a conversation, and an argument nobody replies to
            # is not one.
            adversary = next(
                (
                    p
                    for p in sorted(positions, key=lambda entry: entry.advisor_id)
                    if p.top_option_id == rival.option_id and p.advisor_id != advisor.id
                ),
                None,
            )

            trace = build_trace(
                advisor,
                weights[advisor.id],
                defended,
                stage=2,
                tag="r2",
                seed=seed,
                jitter_option_id=rival.option_id,
                move=move,
            )
            objections.append(
                ObjectionRecord(
                    advisor_id=advisor.id,
                    advisor_name=advisor.name,
                    kingdom_id=advisor.kingdom_id,
                    defended_option_id=own.top_option_id,
                    targeted_option_id=rival.option_id,
                    adversary_id=adversary.advisor_id if adversary else "",
                    adversary_name=(
                        adversary.advisor_name if adversary else "the advocates of that course"
                    ),
                    move_id=move.id,
                    claim=move.claim,
                    trace=trace,
                )
            )
            traces.append(trace)

    # ---- Round 3: appeals -------------------------------------------------- #
    if rounds >= 3:
        provisional = decision(ballot_scores, dilemma.options)
        tallies, _grand = weighted_ballot(ballot_scores, [option.id for option in dilemma.options])
        # Conviction is weighted by how close the vote was: a court that was
        # nearly split hears the appeals, a court that was not does not.
        leader_total = tallies[0].total if tallies else 1.0
        closeness = clamp(1.0 - safe_div(provisional.margin, leader_total), 0.0, 1.0)
        losers = {tally.option_id for tally in tallies[1:]}

        for advisor in advisors:
            own = next((p for p in positions if p.advisor_id == advisor.id), None)
            if own is None or own.top_option_id not in losers:
                continue
            move = appeal_for(advisor, dilemma)
            option = next((o for o in dilemma.options if o.id == own.top_option_id), None)
            if move is None or option is None:
                continue

            trace = build_trace(
                advisor,
                weights[advisor.id],
                option,
                stage=3,
                tag="r3",
                seed=seed,
                move=move,
            )
            appeals.append(
                AppealRecord(
                    advisor_id=advisor.id,
                    advisor_name=advisor.name,
                    kingdom_id=advisor.kingdom_id,
                    option_id=own.top_option_id,
                    kind=move.kind,
                    move_id=move.id,
                    claim=move.claim,
                    conviction=round_dp(clamp(closeness * move.weight, 0.0, 1.0), 4),
                    trace=trace,
                )
            )
            traces.append(trace)

    # ---- Verdict ------------------------------------------------------------ #
    verdict = decision(ballot_scores, dilemma.options)
    stances = [
        StanceAdvisor(
            advisor_id=position.advisor_id,
            advisor_name=position.advisor_name,
            kingdom_id=position.kingdom_id,
            top_option_id=position.top_option_id,
        )
        for position in positions
    ]
    majority = super_majority(verdict.winner_id, stances)
    dissent = minority_report(ballot_scores, verdict.winner_id, advisors)
    settling = synthesis(advisors, verdict.winner_id, verdict.margin, ballot_scores)
    ballots, ballots_total = weighted_ballot(ballot_scores, [o.id for o in dilemma.options])

    court_weights = court_vector(weights)
    winner_option = next((o for o in dilemma.options if o.id == verdict.winner_id), None)
    runner_up = next((o for o in dilemma.options if o.id == verdict.runner_up_id), None)
    deciding = (
        deciding_axis(court_weights, winner_option, runner_up)
        if winner_option is not None and runner_up is not None
        else dominant_axiom(court_weights)
    )
    band = utilon_scale(utilon_total(dilemma, winner_option) if winner_option else 0.0)

    default_quorum = math.ceil(len(advisors) / 2)
    quorum = clamp(
        math.trunc(council_input.quorum if council_input.quorum is not None else default_quorum),
        0,
        len(advisors),
    )

    return CouncilResult(
        dilemma_id=dilemma.id,
        seed=seed,
        rounds=rounds,
        quorum=quorum,
        participating=len(advisors),
        positions=positions,
        objections=objections,
        appeals=appeals,
        ballots=ballots,
        ballots_total=ballots_total,
        decision=verdict,
        super_majority=majority,
        dissent=dissent,
        synthesis=settling,
        traces=traces,
        narrative=narrate(
            dilemma=dilemma,
            positions=positions,
            objections=objections,
            appeals=appeals,
            verdict=verdict,
            majority=majority,
            dissent=dissent,
            deciding=deciding,
            court_weights=court_weights,
            band_label=band.label,
            seed=seed,
            rounds=rounds,
        ),
        deciding_axis=deciding,
        utilon_band=band.band,
        utilon_value=band.value,
        court_vector=court_weights,
        court_spread=court_spread(advisors, weights),
    )


# --------------------------------------------------------------------------- #
# Narrative
# --------------------------------------------------------------------------- #


def narrate(
    *,
    dilemma: Dilemma,
    positions: Sequence[PositionRecord],
    objections: Sequence[ObjectionRecord],
    appeals: Sequence[AppealRecord],
    verdict: DecisionRecord,
    majority: SuperMajority,
    dissent: MinorityReport,
    deciding: AxiomKey,
    court_weights: AxiomVector,
    band_label: str,
    seed: int,
    rounds: int,
) -> list[str]:
    """Prose describing the sitting, every line derived from a computed number.

    There is no random prose here and no sentence that could not be
    reconstructed from the result object, which is what lets the app show prose
    and arithmetic side by side without the two ever disagreeing.
    """
    lines: list[str] = []
    winner = next((o for o in dilemma.options if o.id == verdict.winner_id), None)
    runner_up = next((o for o in dilemma.options if o.id == verdict.runner_up_id), None)

    lines.append(
        f'The court of {len(positions)} sat on "{dilemma.title}" for '
        f"{rounds} round{'' if rounds == 1 else 's'}, seed {seed}."
    )

    if winner is not None:
        against = f' over "{runner_up.label}"' if runner_up is not None else ""
        confidence = format_number(float(round_dp(verdict.confidence * 100, 0)), 0)
        lines.append(
            f'They returned "{winner.label}" at {confidence}% confidence, '
            f"by a margin of {format_number(verdict.margin)}{against}."
        )
    else:
        lines.append("No option could be returned: the court scored nothing at all.")

    backing = [p for p in positions if p.top_option_id == verdict.winner_id]
    if backing:
        share = 0.0 if not positions else round_dp(len(backing) / len(positions) * 100, 0)
        lines.append(
            f"{', '.join(p.advisor_name for p in backing)} carried it — "
            f"{len(backing)} of {len(positions)}, {format_number(share, 0)}% of the bench."
        )

    ranked = sorted(AXIOM_KEYS, key=lambda key: (-court_weights.get(key), AXIOM_KEYS.index(key)))
    # Skip the axis already named: listing it again among "the next two" would
    # read as a contradiction in the same sentence about which axis decided.
    runners_up = [key for key in ranked if key != deciding][:2]
    lines.append(
        f"The axis that decided the sitting was {deciding}, at "
        f"{format_number(court_weights.get(deciding), 2)} court weight; the next two were "
        f"{' and '.join(runners_up)}."
    )

    if objections:
        targets = sorted({objection.targeted_option_id for objection in objections})
        verb = " was" if len(objections) == 1 else "s were"
        lines.append(f"{len(objections)} objection{verb} lodged against {', '.join(targets)}.")
    else:
        lines.append(
            "No objection was lodged; every advisor found a course they could defend without one."
        )

    if majority.satisfied:
        lines.append(
            f"The verdict clears the super-majority: {majority.yes} for, "
            f"{majority.no} against, {majority.abstainers} abstaining."
        )
    else:
        lines.append(
            f"The verdict does not clear a super-majority: {majority.yes} for, "
            f"{majority.no} against, {majority.abstainers} abstaining, and "
            f"{majority.required} were needed."
        )

    if dissent.dissenters:
        sharpest = dissent.strongest.claim if dissent.strongest else "unrecorded"
        names = ", ".join(entry.advisor_name for entry in dissent.dissenters)
        lines.append(f'{names} sat elsewhere; the sharpest objection was "{sharpest}".')
    else:
        lines.append(
            "No advisor preferred a different course, so the bench was unanimous on first reading."
        )

    if appeals:
        plural = "" if len(appeals) == 1 else "s"
        lines.append(
            f"{len(appeals)} appeal{plural} entered in the third round by advisors whose "
            "course had lost."
        )

    lines.append(
        f"On the utilon scale the outcome is {band_label}; the court sits at "
        f"{describe_profile(court_weights)} with a balance of "
        f"{format_number(balance(court_weights), 2)}."
    )

    return lines[:8]


# --------------------------------------------------------------------------- #
# Argument graph
# --------------------------------------------------------------------------- #


@dataclass(frozen=True)
class Graph:
    """A move/attack DAG. `dangling` is surfaced, never thrown."""

    nodes: list[GraphNode] = field(default_factory=list)
    edges: list[GraphEdge] = field(default_factory=list)
    dangling: list[str] = field(default_factory=list)


def _resolve_targets(
    move: ArgumentMove,
    all_moves: Sequence[ArgumentMove],
    overrides: Mapping[str, Sequence[str]] | None,
) -> list[str]:
    """Targets, resolved in this order with the first hit winning:

    1. an explicit override entry,
    2. an `attack:` / `objection:` / `vs:` prefix on the move id,
    3. a `->` arrow inside the move id,
    4. an `appliesTo` entry that names another move in this graph.

    `ArgumentMove` has no `targets` field, so a caller that already knows what
    a move is aimed at should say so explicitly rather than have it guessed
    from a string convention.
    """
    explicit = overrides.get(move.id) if overrides else None
    if explicit is not None:
        return list(explicit)

    for prefix in _TARGET_PREFIXES:
        if move.id.startswith(prefix):
            rest = move.id[len(prefix) :].strip()
            return [rest] if rest else []
    arrow = move.id.find(_TARGET_ARROW)
    if arrow >= 0:
        rest = move.id[arrow + len(_TARGET_ARROW) :].strip()
        if rest:
            return [rest]
    known = {candidate.id for candidate in all_moves}
    via_tags = [tag for tag in move.applies_to if tag in known]
    return list(via_tags) if via_tags else []


def build_graph(
    moves: Sequence[ArgumentMove],
    advisor_ids: Sequence[str] = (),
    targets: Mapping[str, Sequence[str]] | None = None,
    advisor_of: Mapping[str, str] | None = None,
) -> Graph:
    """Build the DAG from raw moves.

    Move ids are namespaced by advisor ("kant.premise"), so the segment before
    the first dot identifies the speaker unless `advisor_of` says otherwise.
    Edge kind follows the node's own kind: objections and appeals *attack* what
    they point at, premises and syntheses *support* it.
    """
    known_advisors = set(advisor_ids)
    nodes: list[GraphNode] = []
    for move in moves:
        speaker = (advisor_of or {}).get(move.id)
        if speaker is None:
            prefix = move.id.split(".", 1)[0]
            speaker = prefix if prefix in known_advisors else move.id
        nodes.append(
            GraphNode(
                id=move.id,
                move_id=move.id,
                advisor_id=speaker,
                kind=move.kind,
                claim=move.claim,
                support=move.support,
                weight=round_dp(move.weight, 4),
                leans_on=list(move.leans_on),
                targets=_resolve_targets(move, moves, targets),
            )
        )

    known_ids = {node.id for node in nodes}
    dangling: list[str] = []
    edges: list[GraphEdge] = []
    for node in nodes:
        for target in node.targets:
            if target not in known_ids:
                dangling.append(f"{node.id} -> {target}")
                continue
            edges.append(
                GraphEdge(
                    from_=node.id,
                    to=target,
                    kind="attacks" if node.kind in ("objection", "appeal") else "supports",
                )
            )

    return Graph(nodes=nodes, edges=edges, dangling=dangling)


def argument_graph_for_council(
    ballot_traces: Sequence[TraceEntry],
    positions: Sequence[PositionRecord],
    objections: Sequence[ObjectionRecord],
    appeals: Sequence[AppealRecord],
    settling: SynthesisMove | None,
) -> Graph:
    """The graph of an actual sitting, built from the deliberation's own records.

    An objection targets the premise move of the advisor it answers; an appeal
    targets the premise move of another advisor who outranked it; the settling
    synthesis, when there is one, *supports* the premise it was drawn from. A
    target that matches no node is dropped rather than invented, so the graph
    never claims an argument nobody made.
    """
    premise_of = {
        position.advisor_id: (position.premise_move_ids[0] if position.premise_move_ids else None)
        for position in positions
    }
    speakers = {trace.advisor_id for trace in ballot_traces if trace.move_id is not None}

    nodes: list[GraphNode] = []
    seen: set[str] = set()
    targets_by_node: dict[str, list[str]] = {}

    def add_from_trace(trace: TraceEntry) -> None:
        if trace.move_id is None or trace.move_id in seen:
            return
        seen.add(trace.move_id)
        nodes.append(
            GraphNode(
                id=trace.move_id,
                move_id=trace.move_id,
                advisor_id=trace.advisor_id,
                kind=trace.kind or "premise",
                claim=trace.claim or "",
                support=trace.premise or "",
                weight=round_dp(trace.move_weight or 0.0, 4),
                leans_on=list(trace.leans_on),
                targets=list(targets_by_node.get(trace.move_id, [])),
            )
        )

    # Premise nodes first: an objection can only point at something that
    # already exists, and declaration order is the topological tie-break.
    for position in positions:
        for trace in ballot_traces:
            if trace.advisor_id == position.advisor_id and trace.move_id is not None:
                add_from_trace(trace)
                break

    for objection in objections:
        answer = premise_of.get(objection.adversary_id)
        if answer:
            targets_by_node.setdefault(objection.move_id, []).append(answer)
        add_from_trace(objection.trace)

    for appeal in appeals:
        rival = next(
            (
                premise_of[other]
                for other in sorted(speakers)
                if other != appeal.advisor_id and premise_of.get(other)
            ),
            None,
        )
        if rival:
            targets_by_node.setdefault(appeal.move_id, []).append(rival)
        add_from_trace(appeal.trace)

    if settling is not None:
        supported = premise_of.get(settling.source_advisor_id)
        if supported and supported not in seen:
            nodes.append(
                GraphNode(
                    id=settling.id,
                    move_id=settling.source_move_id,
                    advisor_id=settling.source_advisor_id,
                    kind="synthesis",
                    claim=settling.claim,
                    support=settling.support,
                    weight=round_dp(settling.weight, 4),
                    leans_on=list(settling.leans_on),
                    targets=[supported] if supported else [],
                )
            )

    known_ids = {node.id for node in nodes}
    edges: list[GraphEdge] = []
    dangling: list[str] = []
    for node in nodes:
        for target in node.targets:
            if target not in known_ids:
                dangling.append(f"{node.id} -> {target}")
                continue
            edges.append(
                GraphEdge(
                    from_=node.id,
                    to=target,
                    kind="attacks" if node.kind in ("objection", "appeal") else "supports",
                )
            )

    return Graph(nodes=nodes, edges=edges, dangling=dangling)


def node_index(graph: Graph) -> dict[str, GraphNode]:
    """Index a graph by node id for O(1) neighbour lookups."""
    return {node.id: node for node in graph.nodes}


def targeted_nodes(graph: Graph, node_id: str) -> list[GraphNode]:
    """Nodes `node_id` itself presses against."""
    index = node_index(graph)
    out: list[GraphNode] = []
    for node in graph.nodes:
        if node.id != node_id:
            continue
        for target in node.targets:
            found = index.get(target)
            if found is not None:
                out.append(found)
    return out


def advisors_in_graph(graph: Graph, advisors: Sequence[Advisor]) -> list[Advisor]:
    """Advisors referenced by a graph, in first-appearance order."""
    by_id = {advisor.id: advisor for advisor in advisors}
    order: list[str] = []
    for node in graph.nodes:
        if node.advisor_id not in order:
            order.append(node.advisor_id)
    return [by_id[advisor_id] for advisor_id in order if advisor_id in by_id]


def topological_order(graph: Graph) -> tuple[list[str], list[list[str]]]:
    """Kahn's algorithm with a declaration-order tie-break, so the order is stable.

    Cycles are *returned*, not raised: a genuinely circular debate is a real
    philosophical situation, and the app renders it as one.
    """
    ids = [node.id for node in graph.nodes]
    known = set(ids)
    indegree: dict[str, int] = {node_id: 0 for node_id in ids}
    outgoing: dict[str, list[str]] = {node_id: [] for node_id in ids}

    for edge in graph.edges:
        if edge.from_ not in known or edge.to not in known:
            continue
        indegree[edge.to] = indegree[edge.to] + 1
        outgoing[edge.from_].append(edge.to)

    order: list[str] = []
    remaining = set(ids)
    guard = len(ids) + 1

    while remaining and guard > 0:
        guard -= 1
        # Declaration order, not set insertion order, so the tie-break is a
        # property of the graph rather than of hash iteration.
        ready = next(
            (node_id for node_id in ids if node_id in remaining and indegree[node_id] == 0),
            None,
        )
        if ready is None:
            break
        remaining.discard(ready)
        order.append(ready)
        for following in outgoing[ready]:
            indegree[following] = indegree[following] - 1

    cycles = [] if not remaining else _find_cycles(ids, graph, remaining)
    return order, cycles


def _find_cycles(declaration: Sequence[str], graph: Graph, remaining: set[str]) -> list[list[str]]:
    """Depth-first search restricted to the unresolved nodes, collecting back-edges."""
    scope = set(remaining)
    outgoing: dict[str, list[str]] = {node_id: [] for node_id in scope}
    for edge in graph.edges:
        if edge.from_ in scope and edge.to in scope:
            outgoing[edge.from_].append(edge.to)

    cycles: list[list[str]] = []
    seen_keys: set[str] = set()
    colour: dict[str, int] = {}
    stack: list[str] = []

    def visit(node_id: str) -> None:
        colour[node_id] = 1
        stack.append(node_id)
        for following in outgoing.get(node_id, []):
            state = colour.get(following, 0)
            if state == 0:
                visit(following)
            elif state == 1 and following in stack:
                cycle = stack[stack.index(following) :]
                # Canonicalise so one loop is not reported from two entry points.
                key = "|".join(sorted(cycle))
                if key not in seen_keys:
                    seen_keys.add(key)
                    cycles.append(cycle)
        stack.pop()
        colour[node_id] = 2

    for node_id in declaration:
        if colour.get(node_id, 0) == 0:
            visit(node_id)
    return cycles


def inherited_weight(graph: Graph) -> dict[str, float]:
    """Effective weight of every node.

    **Rule.** Process nodes in topological order and set

        `effective(n) = clamp01(own(n) + INHERITANCE * sum(incoming effective(m)))`

    where incoming edges are signed: `supports` adds its neighbour's effective
    weight, `attacks` subtracts it. The factor is 0.4 so influence decays along a
    chain instead of compounding into certainty. The result is clamped to
    `[0, 1]` because a move's weight is contractually in that range.

    Nodes inside a cycle cannot be ordered, so they are resolved in declaration
    order from the weights already computed — deterministic, and honest about
    the fact that a circular argument has no fixed point here.
    """
    order, cycles = topological_order(graph)
    cyclic = {node_id for cycle in cycles for node_id in cycle}
    sequence = [*order, *(node.id for node in graph.nodes if node.id in cyclic)]
    index = node_index(graph)

    result: dict[str, float] = {}
    for node_id in sequence:
        node = index.get(node_id)
        if node is None:
            continue
        carried = 0.0
        for edge in graph.edges:
            if edge.to != node_id:
                continue
            neighbour = result.get(edge.from_)
            # Neighbours later in the sequence sit inside a cycle and are not
            # resolved yet; counting them would make the result order-dependent.
            if neighbour is None:
                continue
            carried += neighbour if edge.kind == "supports" else -neighbour
        result[node_id] = round_dp(clamp(node.weight + INHERITANCE * carried, 0.0, 1.0), 4)
    return result


def is_well_formed(graph: Graph) -> tuple[bool, list[str]]:
    """No dangling targets, no self-attack, no cycles — all reported, not just the first."""
    problems = [f"dangling target: {entry}" for entry in graph.dangling]
    problems.extend(f"self-attack: {node.id}" for node in graph.nodes if node.id in node.targets)
    _order, cycles = topological_order(graph)
    problems.extend(f"cycle: {' -> '.join(cycle)}" for cycle in cycles)
    return (not problems), problems


def to_mermaid(graph: Graph) -> str:
    """Render as a mermaid `flowchart TD`.

    Labels are quoted unconditionally: a bare label containing a space, a
    bracket or a slash is a parse error in the diagram renderer, and this
    string is embedded in prose docs as well as in the app.
    """
    lines = ["flowchart TD"]
    alias: dict[str, str] = {}
    for index, node in enumerate(graph.nodes):
        safe = f"n{index}"
        alias[node.id] = safe
        label = f"{node.kind} · {node.claim}".replace('"', "#quot;")
        lines.append(f'  {safe}["{label}"]')
    for edge in graph.edges:
        arrow = "-.->" if edge.kind == "attacks" else "-->"
        lines.append(f"  {alias[edge.from_]} {arrow} {alias[edge.to]}")
    lines.append("  %% attacks = dotted, supports = solid")
    return "\n".join(lines)
