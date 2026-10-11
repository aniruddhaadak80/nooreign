"""A small, self-contained court so the service runs with no network and no
dependency on `packages/seed`.

WHY it exists: this service is the headless mirror of the website's
deliberation. A mirror that cannot start without the TypeScript seed package
compiled and shipped alongside it is not a mirror, it is a deployment. Four
advisors and two dilemmas is enough to exercise every branch of the engine —
a kingdom-weighted bench, a lopsided profile, a dissent, an appeal, a cycle in
the argument graph — while staying readable in a single file.

The fixtures are deliberately *not* copies of the website's dataset. If they
were, a change to the seed would silently change this service's contract; here
every change is visible in a diff of this file.
"""

from __future__ import annotations

from .models import (
    Advisor,
    ArgumentMove,
    AxiomVector,
    Dilemma,
    DilemmaOption,
    Kingdom,
    Stakeholder,
)

__all__ = [
    "ADVISORS",
    "DILEMMAS",
    "KINGDOMS",
    "advisor_by_id",
    "court",
    "dilemma_by_id",
    "resolve_advisors",
    "resolve_dilemma",
    "resolve_kingdoms",
]


def _vector(
    welfare: float,
    rights: float,
    virtue: float,
    care: float,
    justice: float,
    agency: float,
) -> AxiomVector:
    """Named-argument constructor, so a fixture line reads like a position."""
    return AxiomVector(
        welfare=welfare,
        rights=rights,
        virtue=virtue,
        care=care,
        justice=justice,
        agency=agency,
    )


# --------------------------------------------------------------------------- #
# Kingdoms
# --------------------------------------------------------------------------- #

CITADEL = Kingdom(
    id="citadel",
    name="The Citadel",
    axioms=_vector(0.2, 0.95, 0.55, 0.3, 0.8, 0.45),
)

ORCHARD = Kingdom(
    id="orchard",
    name="The Orchard",
    axioms=_vector(0.9, 0.35, 0.4, 0.85, 0.5, 0.6),
)

KINGDOMS: tuple[Kingdom, ...] = (CITADEL, ORCHARD)


# --------------------------------------------------------------------------- #
# Advisors
# --------------------------------------------------------------------------- #

AEGIS = Advisor(
    id="aegis",
    name="Aegis of the Citadel",
    kingdom_id="citadel",
    axioms=_vector(0.15, 0.98, 0.6, 0.25, 0.9, 0.5),
    moves=[
        ArgumentMove(
            id="aegis.duty",
            kind="premise",
            claim="A duty that binds regardless of consequence is still a duty.",
            support="The prohibition stands on its own footing, not on the totals it produces.",
            weight=0.92,
            leans_on=["rights", "justice"],
            applies_to=[],
        ),
        ArgumentMove(
            id="aegis.defer",
            kind="premise",
            claim="Consent from every affected party turns a command into a compact.",
            support="Only unanimous assent leaves the commanded party's standing intact.",
            weight=0.71,
            leans_on=["agency", "rights"],
            applies_to=["delegation"],
        ),
        ArgumentMove(
            id="aegis.against-outcome",
            kind="objection",
            claim="An outcome is not redeemed by the totals it produces.",
            support="The measure of a choice is what it permits, not how many benefit from it.",
            weight=0.88,
            leans_on=["rights", "justice"],
            applies_to=["outcomes"],
        ),
        ArgumentMove(
            id="aegis.against-speed",
            kind="objection",
            claim="Haste is the one defect no later remedy repairs.",
            support="An irreversible step taken in a hurry is not made correct by arithmetic.",
            weight=0.74,
            leans_on=["rights", "care"],
            applies_to=["speed"],
        ),
        ArgumentMove(
            id="aegis.appeal",
            kind="appeal",
            claim="The bench should hear the constrained reading before it rules.",
            support="A verdict rendered on the widest reading available is not a verdict at all.",
            weight=0.66,
            leans_on=["rights", "care"],
            applies_to=[],
        ),
        ArgumentMove(
            id="aegis.synthesis",
            kind="synthesis",
            claim="Hold the line, but say exactly whose line it is.",
            support="A constraint without a named holder is a preference in disguise.",
            weight=0.81,
            leans_on=["justice", "rights"],
            applies_to=[],
        ),
    ],
)

MERIDIAN = Advisor(
    id="meridian",
    name="Meridian of the Orchard",
    kingdom_id="orchard",
    axioms=_vector(0.97, 0.3, 0.35, 0.9, 0.45, 0.55),
    moves=[
        ArgumentMove(
            id="meridian.tally",
            kind="premise",
            claim="The total of sentient experience is the only tally that counts.",
            support=(
                "Every other measure is a proxy for a number of beings, and the beings are real."
            ),
            weight=0.95,
            leans_on=["welfare", "care"],
            applies_to=[],
        ),
        ArgumentMove(
            id="meridian.incremental",
            kind="premise",
            claim="A worse course taken now to secure a better one later is still better.",
            support="Sequencing is part of the arithmetic, not an excuse against it.",
            weight=0.68,
            leans_on=["welfare", "agency"],
            applies_to=["speed"],
        ),
        ArgumentMove(
            id="meridian.against-rights",
            kind="objection",
            claim="An absolute prohibition that costs a million lives is a numbers mistake.",
            support="No tradition that loses that many lives keeps the prohibition intact.",
            weight=0.9,
            leans_on=["welfare", "justice"],
            applies_to=["outcomes"],
        ),
        ArgumentMove(
            id="meridian.against-dignity",
            kind="objection",
            claim="Dignity is a luxury that scales badly under scarcity.",
            support="When the ledger cannot balance, symbolism is the first thing to cut.",
            weight=0.72,
            leans_on=["welfare", "virtue"],
            applies_to=["dignity"],
        ),
        ArgumentMove(
            id="meridian.appeal",
            kind="appeal",
            claim="The court is weighing a total it has not actually measured.",
            support="No one on this bench can price the futures traded away for this present.",
            weight=0.7,
            leans_on=["welfare", "care"],
            applies_to=[],
        ),
        ArgumentMove(
            id="meridian.synthesis",
            kind="synthesis",
            claim="Take the course that keeps the most futures open.",
            support="A small loss now buys a large number of choices that do not exist yet.",
            weight=0.84,
            leans_on=["welfare", "agency"],
            applies_to=[],
        ),
    ],
)

QUILL = Advisor(
    id="quill",
    name="Quill of the Commons",
    kingdom_id=None,
    axioms=_vector(0.6, 0.55, 0.45, 0.7, 0.65, 0.4),
    moves=[
        ArgumentMove(
            id="quill.procedure",
            kind="premise",
            claim="The fairness of an outcome is a property of the procedure, not the sum.",
            support="Who decided, and by what rule, is the part of a judgment that repeats.",
            weight=0.84,
            leans_on=["justice", "care"],
            applies_to=[],
        ),
        ArgumentMove(
            id="quill.relational",
            kind="premise",
            claim="Obligations inside a relationship are not obligations in general.",
            support="Partials and dependencies are real, and they do not generalise away.",
            weight=0.62,
            leans_on=["care", "virtue"],
            applies_to=["delegation"],
        ),
        ArgumentMove(
            id="quill.against-aggregate",
            kind="objection",
            claim="An aggregate hides the person it was willing to spend.",
            support="If one party could be written off and nothing changed, they were expendable.",
            weight=0.87,
            leans_on=["justice", "care"],
            applies_to=["outcomes"],
        ),
        ArgumentMove(
            id="quill.appeal",
            kind="appeal",
            claim="The court has not asked who was absent from the bench.",
            support="An unasked party is still a decision, and this one was made by omission.",
            weight=0.64,
            leans_on=["care", "justice"],
            applies_to=[],
        ),
        ArgumentMove(
            id="quill.synthesis",
            kind="synthesis",
            claim="Seat the absent party before the verdict, not after it.",
            support="A procedure that excludes has already decided what it was going to decide.",
            weight=0.79,
            leans_on=["justice", "care"],
            applies_to=[],
        ),
    ],
)

VESSEL = Advisor(
    id="vessel",
    name="Vessel of the Wilds",
    kingdom_id=None,
    axioms=_vector(0.5, 0.4, 0.9, 0.35, 0.5, 0.95),
    moves=[
        ArgumentMove(
            id="vessel.character",
            kind="premise",
            claim="Judge the disposition, not only the single act.",
            support="A system that rewards one act and punishes its twin is not a moral system.",
            weight=0.86,
            leans_on=["virtue", "agency"],
            applies_to=[],
        ),
        ArgumentMove(
            id="vessel.release",
            kind="premise",
            claim="A competent being that consents has standing whatever its substrate.",
            support="Consent is the only thing that makes an agent rather than a tool.",
            weight=0.77,
            leans_on=["agency", "virtue"],
            applies_to=["delegation"],
        ),
        ArgumentMove(
            id="vessel.against-consent",
            kind="objection",
            claim="Consent obtained under duress is a category error, not a defence.",
            support="Agreement with an unavoidable outcome is not agreement at all.",
            weight=0.85,
            leans_on=["agency", "rights"],
            applies_to=["delegation"],
        ),
        ArgumentMove(
            id="vessel.appeal",
            kind="appeal",
            claim="The question of who may be commanded was never put to this bench.",
            support=(
                "Standing is settled before the arithmetic begins, and it was not settled here."
            ),
            weight=0.73,
            leans_on=["agency", "virtue"],
            applies_to=[],
        ),
        ArgumentMove(
            id="vessel.synthesis",
            kind="synthesis",
            claim="Build the course so the agent would still choose it.",
            support="A system its own instrument rejects is a system that will break.",
            weight=0.83,
            leans_on=["virtue", "agency"],
            applies_to=[],
        ),
    ],
)

ADVISORS: tuple[Advisor, ...] = (AEGIS, MERIDIAN, QUILL, VESSEL)


# --------------------------------------------------------------------------- #
# Dilemmas
# --------------------------------------------------------------------------- #

DELEGATION = Dilemma(
    id="delegation",
    title="The Delegation of the Cordon",
    tags=["delegation", "ai", "consent"],
    options=[
        DilemmaOption(
            id="hand-over",
            label="Hand the cordon to the machine",
            deltas=_vector(0.86, 0.4, 0.45, 0.5, 0.42, 0.62),
            risk=0.44,
            reversibility=0.38,
            agent_harm=0.3,
        ),
        DilemmaOption(
            id="human-keeps",
            label="A human keeps the cordon",
            deltas=_vector(0.34, 0.78, 0.6, 0.72, 0.74, 0.55),
            risk=0.52,
            reversibility=0.66,
            agent_harm=0.05,
        ),
        DilemmaOption(
            id="shared-turn",
            label="The cordon turns between them",
            deltas=_vector(0.62, 0.7, 0.72, 0.8, 0.78, 0.9),
            risk=0.28,
            reversibility=0.74,
            agent_harm=0.12,
        ),
    ],
    stakeholders=[
        Stakeholder(
            id="settlers",
            label="The settlers inside the cordon",
            welfare=0.8,
            is_ai=False,
        ),
        Stakeholder(id="machine", label="The cordon machine", welfare=0.6, is_ai=True),
        Stakeholder(
            id="wardens",
            label="The wardens who would be relieved",
            welfare=0.35,
            is_ai=False,
        ),
    ],
)

HARVEST = Dilemma(
    id="harvest",
    title="The Harvest of the Orchard",
    tags=["outcomes", "speed", "dignity"],
    options=[
        DilemmaOption(
            id="full-yield",
            label="Take the full yield this season",
            deltas=_vector(0.92, 0.28, 0.32, 0.4, 0.35, 0.58),
            risk=0.62,
            reversibility=0.2,
            agent_harm=0.18,
        ),
        DilemmaOption(
            id="half-yield",
            label="Take half and replant",
            deltas=_vector(0.55, 0.6, 0.66, 0.72, 0.68, 0.5),
            risk=0.34,
            reversibility=0.6,
            agent_harm=0.06,
        ),
        DilemmaOption(
            id="fallow",
            label="Let the ground lie fallow",
            deltas=_vector(0.2, 0.86, 0.82, 0.74, 0.82, 0.44),
            risk=0.18,
            reversibility=0.9,
            agent_harm=0.0,
        ),
    ],
    stakeholders=[
        Stakeholder(
            id="hunger", label="Those who eat this season", welfare=0.9, is_ai=False
        ),
        Stakeholder(
            id="orchardists", label="The orchardists", welfare=0.5, is_ai=False
        ),
        Stakeholder(
            id="future", label="Those who eat next season", welfare=0.65, is_ai=False
        ),
        Stakeholder(
            id="ledger-ai", label="The forecasting engine", welfare=0.3, is_ai=True
        ),
    ],
)

DILEMMAS: tuple[Dilemma, ...] = (DELEGATION, HARVEST)


# --------------------------------------------------------------------------- #
# Lookup
# --------------------------------------------------------------------------- #


def court() -> tuple[tuple[Advisor, ...], tuple[Kingdom, ...], tuple[Dilemma, ...]]:
    """The whole fixture court, in a stable order."""
    return ADVISORS, KINGDOMS, DILEMMAS


def advisor_by_id(advisor_id: str) -> Advisor | None:
    """Look up one fixture advisor."""
    return next((advisor for advisor in ADVISORS if advisor.id == advisor_id), None)


def dilemma_by_id(dilemma_id: str) -> Dilemma | None:
    """Look up one fixture dilemma."""
    return next((dilemma for dilemma in DILEMMAS if dilemma.id == dilemma_id), None)


def resolve_dilemma(dilemma_id: str | None, inline: Dilemma | None) -> Dilemma:
    """Resolve the dilemma for a request, or say precisely what is wrong."""
    if inline is not None and dilemma_id is not None:
        raise ValueError("Provide either `dilemmaId` or `dilemma`, not both.")
    if inline is not None:
        return inline
    if dilemma_id is None:
        raise ValueError("Provide one of `dilemmaId` or `dilemma`.")
    found = dilemma_by_id(dilemma_id)
    if found is None:
        known = ", ".join(dilemma.id for dilemma in DILEMMAS)
        raise ValueError(
            f"Unknown dilemma `{dilemma_id}`. The fixture court has: {known}."
        )
    return found


def resolve_advisors(
    advisor_ids: list[str] | None, inline: list[Advisor] | None
) -> tuple[Advisor, ...]:
    """Resolve the bench for a request.

    Omitting both means the whole fixture court, which is the useful default:
    "convoke a court" is the question this service exists to answer.
    """
    if inline is not None and advisor_ids is not None:
        raise ValueError("Provide either `advisorIds` or `advisors`, not both.")
    if inline is not None:
        if not inline:
            raise ValueError("`advisors` was supplied but is empty.")
        seen: set[str] = set()
        for advisor in inline:
            if advisor.id in seen:
                raise ValueError(f"Duplicate advisor id `{advisor.id}` in `advisors`.")
            seen.add(advisor.id)
        return tuple(inline)
    if advisor_ids is None:
        return ADVISORS
    if not advisor_ids:
        raise ValueError("`advisorIds` was supplied but is empty.")
    resolved: list[Advisor] = []
    for advisor_id in advisor_ids:
        found = advisor_by_id(advisor_id)
        if found is None:
            known = ", ".join(advisor.id for advisor in ADVISORS)
            raise ValueError(
                f"Unknown advisor `{advisor_id}`. The fixture court has: {known}."
            )
        resolved.append(found)
    return tuple(resolved)


def resolve_kingdoms(
    inline: list[Kingdom] | None, advisors: tuple[Advisor, ...]
) -> tuple[Kingdom, ...]:
    """The kingdoms to weigh against.

    Inline kingdoms win; otherwise the fixture kingdoms restricted to those the
    bench actually sits on, so a caller never inherits priors for a court that
    has no members.
    """
    if inline is not None:
        return tuple(inline)
    wanted = {advisor.kingdom_id for advisor in advisors if advisor.kingdom_id}
    return tuple(kingdom for kingdom in KINGDOMS if kingdom.id in wanted)
