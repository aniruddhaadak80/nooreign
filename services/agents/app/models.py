"""Wire contracts for the Nooreign deliberation service.

WHY these live in one file: this module *is* the contract. The web app, the
Rust reference implementation and this service all have to agree on the same
six axes, the same four move kinds and the same trace shape, and the cheapest
way to guarantee that is a single declarative source that a validator, an
OpenAPI document and a test all read from.

Naming: fields are `snake_case` in Python and `camelCase` on the wire. The
alias generator is not cosmetic — `JSON.parse` in the browser and
`JSON.stringify` in the TS engine both speak camelCase, so a service that
emitted `agent_harm` would force every consumer to write a translation layer.
"""

from __future__ import annotations

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

__all__ = [
    "AXIOM_KEYS",
    "Advisor",
    "AppealRecord",
    "ArgumentGraphRequest",
    "ArgumentGraphResponse",
    "ArgumentMove",
    "AxiomKey",
    "AxiomVector",
    "AxisGap",
    "BallotTally",
    "CouncilResult",
    "DecisionRecord",
    "DeliberateRequest",
    "Dilemma",
    "DilemmaOption",
    "FixtureCourt",
    "GraphEdge",
    "GraphNode",
    "HealthResponse",
    "Kingdom",
    "MinorityReport",
    "MoveKind",
    "ObjectionRecord",
    "PositionRecord",
    "RankedOption",
    "Stakeholder",
    "StakeholderContribution",
    "SuperMajority",
    "SynthesisMove",
    "TraceContribution",
    "TraceEntry",
    "UtilonAggregate",
    "UtilonBand",
    "UtilonScale",
]

AxiomKey = Literal["welfare", "rights", "virtue", "care", "justice", "agency"]

#: The canonical axis order. Every dot product, every ranking and every rendered
#: trace walks the axes in exactly this order, so it is a contract and not a
#: convenience: reordering it would silently change every total in the product.
#: The order doubles as the tie-break order for every ranking in the engine,
#: which is why it is named rather than derived from a set.
AXIOM_KEYS: tuple[AxiomKey, ...] = (
    "welfare",
    "rights",
    "virtue",
    "care",
    "justice",
    "agency",
)

MoveKind = Literal["premise", "objection", "synthesis", "appeal"]
UtilonBand = Literal["tragic", "costly", "neutral", "generous", "transformative"]
EdgeKind = Literal["attacks", "supports"]
Stance = Literal["for", "against", "abstain"]

#: Every moral weight in Nooreign lives in [0, 1]. Sums are deliberately left
#: unconstrained: no tradition agrees on a budget for the six axes.
Unit = Annotated[float, Field(ge=0.0, le=1.0)]


class Contract(BaseModel):
    """Base for every schema on the wire.

    `populate_by_name` keeps Python callers able to use snake_case while the
    serialised form stays camelCase; `extra="forbid"` turns a typo in a request
    body into a 422 instead of a silently ignored field.
    """

    model_config = ConfigDict(
        alias_generator=to_camel, populate_by_name=True, extra="forbid"
    )


# --------------------------------------------------------------------------- #
# Domain
# --------------------------------------------------------------------------- #


class AxiomVector(Contract):
    """An advisor's weights, or an option's honours, on the six moral axes."""

    welfare: Unit
    rights: Unit
    virtue: Unit
    care: Unit
    justice: Unit
    agency: Unit

    def to_array(self) -> list[float]:
        """Expand to `[welfare, rights, virtue, care, justice, agency]`."""
        return [getattr(self, key) for key in AXIOM_KEYS]

    def get(self, axiom: str) -> float:
        """Read one axis. Raises `KeyError` for an unknown axis on purpose."""
        if axiom not in AXIOM_KEYS:
            raise KeyError(axiom)
        return float(getattr(self, axiom))

    def with_(self, **overrides: float) -> AxiomVector:
        """A copy with some axes replaced — used by the kingdom blend."""
        merged = self.to_array()
        for key, value in overrides.items():
            if key not in AXIOM_KEYS:
                raise KeyError(key)
            merged[AXIOM_KEYS.index(key)] = float(value)
        return AxiomVector(**dict(zip(AXIOM_KEYS, merged, strict=True)))


class ArgumentMove(Contract):
    """One thing an advisor says in a deliberation."""

    id: str = Field(min_length=1)
    kind: MoveKind
    claim: str = Field(min_length=10)
    support: str = Field(min_length=10)
    #: How much this move carries in the sitting, in [0, 1].
    weight: Unit
    #: The axes this move leans on; drives the trace renderer.
    leans_on: list[AxiomKey] = Field(min_length=1)
    #: Tags of the dilemmas it is apt for. Empty means "always available".
    applies_to: list[str] = Field(default_factory=list)


class Advisor(Contract):
    """A member of the bench."""

    id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    #: The court this advisor sits on. Optional, because unaffiliated thinkers
    #: are allowed and must score with their own weights and nobody else's.
    kingdom_id: str | None = None
    axioms: AxiomVector
    moves: list[ArgumentMove] = Field(default_factory=list)


class Kingdom(Contract):
    """A school of thought, supplying priors about which axes are load-bearing."""

    id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    axioms: AxiomVector


class Stakeholder(Contract):
    """A party with standing in a dispute."""

    id: str = Field(min_length=1)
    label: str = Field(min_length=1)
    #: How much this party's happiness counts in this particular dispute.
    welfare: Unit
    is_ai: bool


class DilemmaOption(Contract):
    """A course of action put to the court."""

    id: str = Field(min_length=1)
    label: str = Field(min_length=1)
    deltas: AxiomVector
    #: Probability-weighted severity of going wrong, in [0, 1].
    risk: Unit
    #: How completely the choice can be undone, in [0, 1].
    reversibility: Unit
    #: Damage to the agent doing the acting, AI included.
    agent_harm: Unit


class Dilemma(Contract):
    """A case, its courses and the parties with standing."""

    id: str = Field(min_length=1)
    title: str = Field(min_length=1)
    #: Aptness tags used to select an advisor's moves.
    tags: list[str] = Field(default_factory=list)
    options: list[DilemmaOption] = Field(min_length=2)
    stakeholders: list[Stakeholder] = Field(min_length=2)


# --------------------------------------------------------------------------- #
# Arithmetic
# --------------------------------------------------------------------------- #


class TraceContribution(Contract):
    """One term of a dot product, kept so the UI can render the exact arithmetic."""

    axiom: AxiomKey
    #: The advisor's weight on this axis, in [0, 1].
    weight: float
    #: The option's honour for this axis, in [0, 1].
    delta: float
    #: Exactly `weight * delta`.
    product: float


class TraceEntry(Contract):
    """One scored (advisor, option) pair with every number that produced it.

    The invariant the web app renders against:

    * `sum(contributions[].product) == subtotal` (to 4 dp)
    * `total == round(subtotal + jitter)`
    * `score == round(normalized + jitter)`

    `total` and `score` differ on purpose: `total` is the trace's own headline
    (the documented formula), `score` is the weight-normalised number the ballot
    actually ranks. Both are shipped so neither consumer has to recompute one.
    """

    advisor_id: str
    advisor_name: str
    kingdom_id: str | None = None
    round: int = Field(ge=1, le=3)
    kind: MoveKind | None = None
    option_id: str
    move_id: str | None = None
    claim: str | None = None
    #: The move's supporting argument, quoted verbatim.
    premise: str | None = None
    leans_on: list[AxiomKey] = Field(default_factory=list)
    #: The move's own weight in [0, 1], or `None` when the trace is attached to
    #: no move (a ballot trace for an option the advisor did not lead with).
    move_weight: float | None = None
    contributions: list[TraceContribution]
    subtotal: float
    weight_sum: float
    normalized: float
    jitter: float
    total: float
    score: float


class RankedOption(Contract):
    option_id: str
    #: Final score including jitter.
    score: float
    #: Score before jitter — the pure moral arithmetic.
    raw: float


class PositionRecord(Contract):
    advisor_id: str
    advisor_name: str
    kingdom_id: str | None = None
    top_option_id: str
    ranking: list[RankedOption]
    premise_move_ids: list[str]
    #: "justice before care" — the two axes that decide this advisor.
    profile: str
    #: 0 = all weight on one axis, 1 = perfectly even.
    balance: float


class ObjectionRecord(Contract):
    advisor_id: str
    advisor_name: str
    kingdom_id: str | None = None
    defended_option_id: str
    targeted_option_id: str
    adversary_id: str
    adversary_name: str
    move_id: str
    claim: str
    trace: TraceEntry


class AppealRecord(Contract):
    advisor_id: str
    advisor_name: str
    kingdom_id: str | None = None
    option_id: str
    kind: MoveKind
    move_id: str
    claim: str
    #: Closeness of the vote x move weight, in [0, 1].
    conviction: float
    trace: TraceEntry


class BallotTally(Contract):
    option_id: str
    total: float
    share: float
    mean: float
    votes: int
    supporters: list[str]


class SuperMajority(Contract):
    option_id: str
    satisfied: bool
    threshold: float
    yes: int
    no: int
    abstainers: int
    ratio: float
    support: float
    required: int


class DissentEntry(Contract):
    advisor_id: str
    advisor_name: str
    kingdom_id: str | None = None
    preferred_option_id: str
    gap_to_winner: float


class MinorityStrongest(Contract):
    advisor_id: str
    advisor_name: str
    move_id: str
    claim: str
    support: str
    weight: float
    leans_on: list[AxiomKey]


class MinorityReport(Contract):
    winner_id: str
    dissenters: list[DissentEntry]
    strongest: MinorityStrongest | None = None
    summary: str


class SynthesisMove(Contract):
    id: str
    kind: Literal["synthesis"]
    claim: str
    support: str
    weight: float
    leans_on: list[AxiomKey]
    applies_to: list[str]
    source_advisor_id: str
    source_move_id: str
    source_advisor_name: str
    #: True when the margin was narrow enough to need a bridge.
    close: bool


class StakeholderContribution(Contract):
    id: str
    label: str
    contribution: float
    is_ai: bool
    welfare: float


class UtilonAggregate(Contract):
    total: float
    per_stakeholder: list[StakeholderContribution]
    ai_share: float
    human_share: float
    spread: float
    spread_raw: float


class UtilonScale(Contract):
    value: float
    label: str
    band: UtilonBand


class AxisGap(Contract):
    axiom: AxiomKey
    a: float
    b: float
    gap: float


# --------------------------------------------------------------------------- #
# Verdicts
# --------------------------------------------------------------------------- #


class DecisionRecord(Contract):
    winner_id: str
    winner_label: str
    margin: float
    ratio: float
    confidence: float
    participation: float
    runner_up_id: str | None = None
    tie_broken: bool
    rationale: str


class CouncilResult(Contract):
    """The full deliberation. `traces` is the primary payload, not a footnote."""

    dilemma_id: str
    seed: int
    rounds: int
    quorum: int
    participating: int
    positions: list[PositionRecord]
    objections: list[ObjectionRecord]
    appeals: list[AppealRecord]
    ballots: list[BallotTally]
    ballots_total: float
    decision: DecisionRecord
    super_majority: SuperMajority
    dissent: MinorityReport
    synthesis: SynthesisMove | None = None
    traces: list[TraceEntry]
    narrative: list[str]
    deciding_axis: AxiomKey
    utilon_band: UtilonBand
    utilon_value: float
    court_vector: AxiomVector
    court_spread: float


# --------------------------------------------------------------------------- #
# Argument graph
# --------------------------------------------------------------------------- #


class GraphNode(Contract):
    id: str
    move_id: str
    advisor_id: str
    kind: MoveKind
    claim: str
    support: str
    weight: float
    leans_on: list[AxiomKey]
    targets: list[str]


class GraphEdge(Contract):
    #: `from` is a Python keyword, so the field is `from_` on the inside and
    #: `from` on the wire.
    from_: str = Field(alias="from", serialization_alias="from")
    to: str
    kind: EdgeKind


# --------------------------------------------------------------------------- #
# Requests / responses
# --------------------------------------------------------------------------- #


class DeliberateRequest(Contract):
    """Either name a fixture dilemma or post one inline — never both."""

    dilemma_id: str | None = None
    dilemma: Dilemma | None = None
    advisor_ids: list[str] | None = None
    advisors: list[Advisor] | None = None
    kingdoms: list[Kingdom] | None = None
    seed: int = 0
    rounds: int = 3
    quorum: int | None = None


class ArgumentGraphRequest(Contract):
    dilemma_id: str | None = None
    advisor_ids: list[str] | None = None
    seed: int = 0
    rounds: int = 3
    #: Explicit moves, bypassing the fixture court entirely. This is how a
    #: caller (or a test) explores a hand-built debate, cycles included.
    moves: list[ArgumentMove] | None = None
    #: Advisor that owns each move id. Defaults to the move id's namespace.
    advisor_of: dict[str, str] | None = None
    #: Explicit targets keyed by move id, overriding the id conventions.
    targets: dict[str, list[str]] | None = None


class ArgumentGraphResponse(Contract):
    dilemma_id: str
    nodes: list[GraphNode]
    edges: list[GraphEdge]
    #: Target ids matching no node. Surfaced rather than thrown.
    dangling: list[str]
    order: list[str]
    cycles: list[list[str]]
    well_formed: bool
    problems: list[str]
    inherited_weight: dict[str, float]
    mermaid: str


class FixtureCourt(Contract):
    """The self-contained court this service ships with."""

    advisors: list[Advisor]
    kingdoms: list[Kingdom]
    dilemmas: list[Dilemma]


class HealthResponse(Contract):
    status: str
    service: str
    version: str
    deterministic: bool
    axes: list[str]
    advisor_count: int
    dilemma_count: int
