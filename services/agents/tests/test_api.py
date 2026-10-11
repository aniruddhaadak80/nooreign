"""HTTP-level tests for the deliberation service.

These exercise the FastAPI surface itself — routing, validation, status codes and
the JSON contract — rather than the engine, which `test_deliberation.py` covers
directly. The distinction matters: an engine that is correct but unreachable is
not a service.

The wire format is camelCase on purpose. It is the same shape the TypeScript
council engine returns, so a consumer written against the website's `/api/deliberate`
needs no translation layer to talk to this service.
"""

from __future__ import annotations

from typing import Any

import pytest
from fastapi.testclient import TestClient
from services.agents.app.main import app

AXES = {"welfare", "rights", "virtue", "care", "justice", "agency"}


@pytest.fixture(scope="module")
def client() -> TestClient:
    with TestClient(app) as test_client:
        yield test_client


def deliberate(client: TestClient, **payload: Any) -> dict[str, Any]:
    """POST /deliberate and assert it succeeded, returning the decoded body."""
    response = client.post("/deliberate", json={"seed": 2406, **payload})
    assert response.status_code == 200, response.text
    body: dict[str, Any] = response.json()
    return body


# --------------------------------------------------------------------------- #
# Health and fixtures
# --------------------------------------------------------------------------- #


def test_healthz_reports_the_contract(client: TestClient) -> None:
    response = client.get("/healthz")
    assert response.status_code == 200

    body = response.json()
    assert body["status"] == "ok"
    assert body["deterministic"] is True
    assert set(body["axes"]) == AXES
    assert body["advisorCount"] >= 4
    assert body["dilemmaCount"] >= 2


def test_fixtures_expose_a_self_contained_court(client: TestClient) -> None:
    response = client.get("/fixtures")
    assert response.status_code == 200

    body = response.json()
    assert len(body["advisors"]) >= 4
    assert len(body["kingdoms"]) >= 2
    assert len(body["dilemmas"]) >= 2
    # Every advisor carries the same six axes the engine scores over.
    for advisor in body["advisors"]:
        assert set(advisor["axioms"]) == AXES


# --------------------------------------------------------------------------- #
# Deliberation
# --------------------------------------------------------------------------- #


def test_deliberate_returns_a_full_sitting(client: TestClient) -> None:
    body = deliberate(client, dilemmaId="delegation", advisorIds=["aegis", "quill"])

    assert body["dilemmaId"] == "delegation"
    assert body["seed"] == 2406
    assert body["participating"] == 2
    assert body["traces"], "a sitting with no traces is not auditable"
    assert len(body["positions"]) == 2
    assert body["decision"]["winnerId"]
    assert body["decision"]["winnerLabel"]


def test_deliberate_is_byte_for_byte_deterministic(client: TestClient) -> None:
    """The whole product rests on this: same inputs, same response, every time."""

    def call() -> dict[str, Any]:
        return deliberate(
            client, dilemmaId="harvest", advisorIds=["aegis", "meridian", "quill"], seed=17
        )

    assert call() == call()


def test_changing_the_seed_changes_the_sitting(client: TestClient) -> None:
    payload = {"dilemmaId": "delegation", "advisorIds": ["aegis", "vessel"]}
    first = deliberate(client, **payload, seed=1)
    second = deliberate(client, **payload, seed=999)

    assert first["seed"] != second["seed"]
    assert first["traces"] != second["traces"]


def test_trace_arithmetic_is_self_consistent(client: TestClient) -> None:
    body = deliberate(client, dilemmaId="delegation", advisorIds=["aegis", "quill", "vessel"])

    for trace in body["traces"]:
        contributions = trace["contributions"]
        assert len(contributions) == 6, "every axis must appear in the trace"
        for contribution in contributions:
            assert contribution["product"] == pytest.approx(
                contribution["weight"] * contribution["delta"], abs=5e-5
            )
            assert contribution["axiom"] in AXES
        # The engine ships both numbers deliberately: `total` is the raw dot
        # product the trace documents, `score` is the weight-normalised number the
        # ballot ranks, and `jitter` moves both.
        summed = round(sum(c["product"] for c in contributions), 4)
        assert trace["subtotal"] == pytest.approx(summed, abs=1e-4)
        assert trace["normalized"] == pytest.approx(
            trace["subtotal"] / trace["weightSum"], abs=1e-4
        )
        assert trace["total"] == pytest.approx(
            round(trace["subtotal"] + trace["jitter"], 4), abs=1e-4
        )
        assert trace["score"] == pytest.approx(
            round(trace["normalized"] + trace["jitter"], 4), abs=1e-4
        )
        # Jitter is a nudge, never a decision-maker.
        assert abs(trace["jitter"]) <= 0.050001


def test_ballots_are_a_partition_of_the_court_conviction(client: TestClient) -> None:
    body = deliberate(client, dilemmaId="harvest", advisorIds=["aegis", "meridian"])

    shares = sum(ballot["share"] for ballot in body["ballots"])
    assert shares == pytest.approx(1.0, abs=1e-3)

    winner = next(
        ballot for ballot in body["ballots"] if ballot["optionId"] == body["decision"]["winnerId"]
    )
    assert winner["total"] == max(ballot["total"] for ballot in body["ballots"])
    assert winner["votes"] <= body["participating"]


def test_the_synthesis_quote_is_traceable_to_a_real_advisor(client: TestClient) -> None:
    """A synthesis assembled from the argument moves must cite one verbatim."""
    body = deliberate(client, dilemmaId="delegation", advisorIds=["aegis", "quill"])
    synthesis = body["synthesis"]
    if synthesis is None:
        pytest.skip("this sitting is too one-sided to synthesise")

    assert synthesis["sourceAdvisorId"] in {position["advisorId"] for position in body["positions"]}
    assert synthesis["weight"] > 0
    assert set(synthesis["leansOn"]) <= AXES


# --------------------------------------------------------------------------- #
# Validation
# --------------------------------------------------------------------------- #


def test_unknown_dilemma_is_rejected_with_a_helpful_message(client: TestClient) -> None:
    response = client.post(
        "/deliberate", json={"dilemmaId": "no-such-case", "advisorIds": ["aegis"]}
    )
    assert response.status_code == 422
    detail = response.json()["detail"]
    assert "no-such-case" in detail
    # The error lists what *is* available — a 422 that only says "invalid" is useless.
    assert "delegation" in detail


def test_unknown_advisor_is_rejected(client: TestClient) -> None:
    response = client.post(
        "/deliberate", json={"dilemmaId": "delegation", "advisorIds": ["nobody"]}
    )
    assert response.status_code >= 400


def test_empty_request_is_rejected(client: TestClient) -> None:
    response = client.post("/deliberate", json={})
    assert response.status_code == 422
    assert "dilemma" in response.json()["detail"].lower()


def test_malformed_body_is_a_422(client: TestClient) -> None:
    assert (
        client.post(
            "/deliberate", json={"dilemmaId": "delegation", "seed": "not-a-number"}
        ).status_code
        == 422
    )


def test_inline_dilemma_is_accepted(client: TestClient) -> None:
    """A caller can post a whole case that exists nowhere in the fixture set."""
    fixture = client.get("/fixtures").json()["dilemmas"][0]
    inline = {**fixture, "id": "inline-case", "title": "An inline case"}

    body = deliberate(client, dilemma=inline, advisorIds=["aegis", "quill"])
    assert body["dilemmaId"] == "inline-case"
    assert body["traces"]


# --------------------------------------------------------------------------- #
# Argument graph
# --------------------------------------------------------------------------- #


def test_argument_graph_is_well_formed_for_the_fixture_court(client: TestClient) -> None:
    response = client.post("/argument-graph", json={"dilemmaId": "delegation", "seed": 2406})
    assert response.status_code == 200

    body = response.json()
    assert body["wellFormed"] is True
    assert body["cycles"] == []
    assert body["dangling"] == []
    assert body["nodes"], "an argument graph with no nodes is an empty room"
    assert body["mermaid"].startswith("flowchart TD")
    assert len(body["order"]) == len(body["nodes"])


def test_argument_graph_reports_a_cycle_instead_of_hanging(client: TestClient) -> None:
    """Two moves attacking each other is a real structure, not an error."""
    response = client.post(
        "/argument-graph",
        json={
            "moves": [
                {
                    "id": "m1-a",
                    "kind": "objection",
                    "claim": "The first objection, pressed firmly against the second.",
                    "support": "Because the premise it answers is weaker than it looks.",
                    "weight": 0.5,
                    "leansOn": ["rights"],
                    "appliesTo": [],
                },
                {
                    "id": "m2-b",
                    "kind": "objection",
                    "claim": "The answering objection, pressed back at the first.",
                    "support": "Because the first objection misreads what it is answering.",
                    "weight": 0.5,
                    "leansOn": ["care"],
                    "appliesTo": [],
                },
            ],
            "targets": {"m1-a": ["m2-b"], "m2-b": ["m1-a"]},
        },
    )
    assert response.status_code == 200

    body = response.json()
    assert body["wellFormed"] is False
    assert body["cycles"], "a mutual attack must be reported, not silently dropped"


def test_argument_graph_surfaces_dangling_targets(client: TestClient) -> None:
    response = client.post(
        "/argument-graph",
        json={
            "moves": [
                {
                    "id": "m1-a",
                    "kind": "objection",
                    "claim": "An objection aimed at a move that does not exist.",
                    "support": "Which is itself worth knowing about the debate.",
                    "weight": 0.4,
                    "leansOn": ["justice"],
                    "appliesTo": [],
                }
            ],
            "targets": {"m1-a": ["m-does-not-exist"]},
        },
    )
    assert response.status_code == 200

    body = response.json()
    # Dangling targets are reported as `source -> target` rather than thrown,
    # because an argument aimed at a missing premise is a finding, not a crash.
    assert body["dangling"] == ["m1-a -> m-does-not-exist"]
    assert body["wellFormed"] is False
