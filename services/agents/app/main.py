"""The Nooreign deliberation service: the website's council engine, headless.

WHY a second implementation at all: the web app runs the deliberation inside a
browser tab, which makes it awkward to script, awkward to diff, and impossible
to run in CI against a fixture. This service runs the *same* engine — same six
axes, same three rounds, same seeded PRNG, same 4 dp rounding — behind an HTTP
contract, so an experiment, a regression test or a colleague's script can
reproduce a verdict exactly rather than describing it.

Run it with:

    uvicorn services.agents.app.main:app --port 8000

No network calls, no API keys, no telemetry. Everything it knows lives in
`app/seed.py`.
"""

from __future__ import annotations

import os

from fastapi import APIRouter, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .deliberation import (
    CouncilInput,
    argument_graph_for_council,
    build_graph,
    inherited_weight,
    is_well_formed,
    run_council,
    to_mermaid,
    topological_order,
)
from .models import (
    AXIOM_KEYS,
    ArgumentGraphRequest,
    ArgumentGraphResponse,
    CouncilResult,
    DeliberateRequest,
    FixtureCourt,
    HealthResponse,
)
from .seed import (
    ADVISORS,
    DILEMMAS,
    KINGDOMS,
    resolve_advisors,
    resolve_dilemma,
    resolve_kingdoms,
)

__all__ = ["SERVICE_VERSION", "app", "router"]

SERVICE_VERSION = "1.0.0"

#: Origins the web app is served from. Overridable so a deployed copy does not
#: need a code change; empty means "same origin only".
_DEFAULT_ORIGINS = ("http://localhost:3000", "http://127.0.0.1:3000")


def _cors_origins() -> list[str]:
    configured = os.environ.get("NOOREIGN_CORS_ORIGINS")
    if configured is None:
        return list(_DEFAULT_ORIGINS)
    return [origin.strip() for origin in configured.split(",") if origin.strip()]


router = APIRouter()


@router.get("/healthz", response_model=HealthResponse, tags=["meta"])
def healthz() -> HealthResponse:
    """Liveness plus the shape of the contract.

    Deliberately carries no timestamp: a health check that changes every second
    breaks byte-for-byte comparison in tests and tells an operator nothing they
    do not already know.
    """
    return HealthResponse(
        status="ok",
        service="nooreign-agents",
        version=SERVICE_VERSION,
        deterministic=True,
        axes=list(AXIOM_KEYS),
        advisor_count=len(ADVISORS),
        dilemma_count=len(DILEMMAS),
    )


@router.get("/fixtures", response_model=FixtureCourt, tags=["meta"])
def fixtures() -> FixtureCourt:
    """The fixture court this service ships with.

    Discovery, not data: the web app needs the advisor and dilemma ids to ask
    `/deliberate` anything useful, and it should not have to hard-code them.
    """
    return FixtureCourt(
        advisors=list(ADVISORS), kingdoms=list(KINGDOMS), dilemmas=list(DILEMMAS)
    )


@router.post("/deliberate", response_model=CouncilResult, tags=["council"])
def deliberate(request: DeliberateRequest) -> CouncilResult:
    """Convene a court and return the whole sitting, traces included.

    Either `dilemmaId` (a fixture dilemma) or `dilemma` (inline) is required;
    `advisorIds` or `advisors` selects the bench and defaults to all four
    fixture advisors. `seed` and `rounds` fully determine the result: the same
    request always returns byte-identical JSON.
    """
    try:
        dilemma = resolve_dilemma(request.dilemma_id, request.dilemma)
        advisors = resolve_advisors(request.advisor_ids, request.advisors)
        kingdoms = resolve_kingdoms(request.kingdoms, advisors)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error

    return run_council(
        CouncilInput(
            dilemma=dilemma,
            advisors=advisors,
            kingdoms=kingdoms,
            seed=request.seed,
            rounds=request.rounds,
            quorum=request.quorum,
        )
    )


@router.post("/argument-graph", response_model=ArgumentGraphResponse, tags=["council"])
def argument_graph(request: ArgumentGraphRequest) -> ArgumentGraphResponse:
    """Build the move/attack DAG for a sitting and report its structure.

    With no `moves` supplied the graph is built from the deliberation itself:
    objections attack the premise of the advisor they answer, appeals attack the
    premise of whoever outranked them, and the settling synthesis supports the
    premise it came from.

    With `moves` supplied the graph is built from those moves alone, using the
    id conventions (`attack:<id>`, `->`, or an `appliesTo` entry naming another
    move) or the explicit `targets` map. That is the path for exploring a
    hand-built debate, cycles included — the engine reports them rather than
    refusing to draw them.
    """
    if request.moves is not None:
        moves = list(request.moves)
        dilemma_id = request.dilemma_id or "adhoc"
        advisor_ids = [advisor_id for advisor_id in (request.advisor_of or {}).values()]
        graph = build_graph(
            moves,
            advisor_ids=advisor_ids,
            targets=request.targets,
            advisor_of=request.advisor_of,
        )
    else:
        try:
            dilemma = resolve_dilemma(request.dilemma_id, None)
            advisors = resolve_advisors(request.advisor_ids, None)
            kingdoms = resolve_kingdoms(None, advisors)
        except ValueError as error:
            raise HTTPException(status_code=422, detail=str(error)) from error

        result = run_council(
            CouncilInput(
                dilemma=dilemma,
                advisors=advisors,
                kingdoms=kingdoms,
                seed=request.seed,
                rounds=request.rounds,
            )
        )
        ballot_traces = [trace for trace in result.traces if trace.round == 1]
        graph = argument_graph_for_council(
            ballot_traces,
            result.positions,
            result.objections,
            result.appeals,
            result.synthesis,
        )
        dilemma_id = result.dilemma_id

    order, cycles = topological_order(graph)
    well_formed, problems = is_well_formed(graph)
    return ArgumentGraphResponse(
        dilemma_id=dilemma_id,
        nodes=graph.nodes,
        edges=graph.edges,
        dangling=graph.dangling,
        order=order,
        cycles=cycles,
        well_formed=well_formed,
        problems=problems,
        inherited_weight=inherited_weight(graph),
        mermaid=to_mermaid(graph),
    )


app = FastAPI(
    title="Nooreign deliberation service",
    version=SERVICE_VERSION,
    summary="The council engine, headless.",
    description=(
        "Runs the same deliberation the Nooreign website runs: three rounds over "
        "six moral axes, seeded and deterministic to four decimal places. "
        "The trace is the answer - every response carries the per-axis "
        "`weight x delta` products, the subtotal, the jitter and the total."
    ),
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["content-type"],
)
app.include_router(router)


if __name__ == "__main__":  # pragma: no cover - convenience only
    # Imported lazily so the app object stays importable without uvicorn, which
    # keeps the test suite free of a server dependency.
    import uvicorn

    uvicorn.run(
        "services.agents.app.main:app", host="127.0.0.1", port=8000, reload=False
    )
