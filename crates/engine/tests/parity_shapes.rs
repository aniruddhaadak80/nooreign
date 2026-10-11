//! Integration tests: the public API end to end, plus the fixture round-trip.
//!
//! The unit tests inside each module prove the formulas; this file proves the
//! *artefact*. A parity fixture is only evidence if three things hold, and each
//! gets its own test group below:
//!
//! 1. **The engine's own invariants survive the whole pipeline.** Every trace's
//!    arithmetic, every ballot total, every utilon figure is re-derived from
//!    public API calls and compared. Nothing here reaches into a private field.
//! 2. **The document is deterministic.** Rendering [`parity_document`] twice
//!    gives byte-identical output, and building it from scratch reproduces it.
//! 3. **The document says what the README says it says.** Structural checks on
//!    the emitted JSON, so a schema change that silently drops a section fails
//!    here rather than in a TypeScript test three weeks later.

use nooreign_ethics::axiom::{
    balance, deciding_axis, describe_profile, distance, dominant_axis, rank_axes, score_option,
    secondary_axis, weigh_advisor, AxiomVector, AXES, AXIS_NAMES,
};
use nooreign_ethics::deliberation::{
    court_vector, jitter_for, parity_advisors, parity_dilemmas, parity_document, parity_kingdoms,
    run_council, CouncilInput, CouncilResult, TraceEntry, JITTER, PARITY_SEED,
};
use nooreign_ethics::json::Json;
use nooreign_ethics::math::round4;
use nooreign_ethics::rng::{create_rng, hash_string, mulberry32, RngPart};
use nooreign_ethics::utilon::{
    aggregate, discount, fairness_index, stakeholder_total, utilon_scale, utilon_total,
};

/// Run the parity court over one dilemma.
fn sit(dilemma_index: usize, seed: i64) -> CouncilResult {
    let dilemmas = parity_dilemmas();
    let advisors = parity_advisors();
    let kingdoms = parity_kingdoms();
    run_council(&CouncilInput {
        dilemma: &dilemmas[dilemma_index],
        advisors: &advisors,
        kingdoms: &kingdoms,
        seed,
        rounds: Some(3),
        quorum: None,
    })
}

/// Recompute a trace's arithmetic from the public API and check it.
fn assert_trace_is_self_consistent(trace: &TraceEntry) {
    assert_eq!(trace.contributions.len(), AXES);
    assert!((1..=3).contains(&trace.round));

    for (index, contribution) in trace.contributions.iter().enumerate() {
        assert_eq!(contribution.axiom, index);
        assert_eq!(contribution.axiom_name(), AXIS_NAMES[index]);
        // `product` is exactly `round(weight * delta, 4)`.
        assert_eq!(
            contribution.product,
            round4(contribution.weight * contribution.delta),
            "product must be round(weight * delta, 4)"
        );
        assert!((0.0..=1.0).contains(&contribution.weight));
        assert!((0.0..=1.0).contains(&contribution.delta));
        // Both operands are already 4 dp, which is what makes the displayed
        // product equal the computed one.
        assert_eq!(round4(contribution.weight), contribution.weight);
        assert_eq!(round4(contribution.delta), contribution.delta);
        assert_eq!(round4(contribution.product), contribution.product);
    }

    // Σ contributions[].product == subtotal, to 4 dp.
    let summed: f64 = trace.contributions.iter().map(|c| c.product).sum();
    assert_eq!(
        round4(summed),
        trace.subtotal,
        "subtotal must equal Σ product"
    );
    assert_eq!(round4(trace.contribution_sum()), trace.subtotal);

    // total == subtotal + jitter, to 4 dp.
    assert_eq!(
        trace.total,
        round4(trace.subtotal + trace.jitter),
        "total must equal subtotal + jitter"
    );
    assert!(trace.jitter.abs() <= JITTER, "jitter out of bounds");
    assert_eq!(round4(trace.jitter), trace.jitter);
}

/* ------------------------------------------------------------------ *
 * 1. The engine's invariants, end to end
 * ------------------------------------------------------------------ */

#[test]
fn every_trace_in_the_parity_councils_is_self_consistent() {
    for index in 0..parity_dilemmas().len() {
        let result = sit(index, PARITY_SEED);
        assert!(!result.traces.is_empty());
        for trace in &result.traces {
            assert_trace_is_self_consistent(trace);
        }
    }
}

#[test]
fn trace_weights_are_the_kingdom_blend_the_court_scored_with() {
    let advisors = parity_advisors();
    let kingdoms = parity_kingdoms();
    for index in 0..parity_dilemmas().len() {
        let result = sit(index, PARITY_SEED);
        for advisor in &advisors {
            let kingdom = kingdoms
                .iter()
                .find(|k| Some(k.id.as_str()) == advisor.kingdom_id.as_deref());
            let expected = weigh_advisor(&advisor.axioms, kingdom.map(|k| &k.axioms));
            let trace = result
                .traces
                .iter()
                .find(|t| t.advisor_id == advisor.id && t.round == 1)
                .unwrap_or_else(|| panic!("no round-1 trace for {}", advisor.id));
            // The trace shows exactly the weights that produced the score.
            assert_eq!(result.weights_of(&advisor.id), expected);
            let weights: Vec<f64> = trace.contributions.iter().map(|c| c.weight).collect();
            assert_eq!(weights, expected.as_slice().to_vec());
        }
    }
}

#[test]
fn a_trace_reproduces_score_option_from_its_own_deltas() {
    let dilemmas = parity_dilemmas();
    for (index, dilemma) in dilemmas.iter().enumerate() {
        let result = sit(index, PARITY_SEED);
        for trace in result.traces.iter().filter(|t| t.round == 1) {
            let option = dilemma
                .options
                .iter()
                .find(|o| o.id == trace.option_id)
                .unwrap_or_else(|| panic!("unknown option {}", trace.option_id));
            let mut weights = AxiomVector::ZERO;
            for contribution in &trace.contributions {
                weights.0[contribution.axiom] = contribution.weight;
            }
            // The position's `raw` score is `score_option` on the same inputs.
            let position = result
                .positions
                .iter()
                .find(|p| p.advisor_id == trace.advisor_id)
                .unwrap_or_else(|| panic!("no position for {}", trace.advisor_id));
            let raw = position
                .ranking
                .iter()
                .find(|r| r.option_id == trace.option_id)
                .map(|r| r.raw)
                .unwrap_or_else(|| panic!("no rank for {}", trace.option_id));
            assert_eq!(raw, score_option(&weights, &option.deltas));
            // ...and the trace's subtotal is the *unnormalised* sum of products.
            let summed: f64 = trace.contributions.iter().map(|c| c.product).sum();
            assert!((summed - trace.subtotal).abs() < 1e-12);
        }
    }
}

#[test]
fn the_ballot_totals_are_the_sums_of_the_position_scores() {
    let dilemmas = parity_dilemmas();
    for (index, dilemma) in dilemmas.iter().enumerate() {
        let result = sit(index, PARITY_SEED);
        assert_eq!(result.ballots.len(), dilemma.options.len());
        for tally in &result.ballots {
            let mut summed = 0.0;
            let mut votes = 0usize;
            for position in &result.positions {
                if let Some(ranked) = position
                    .ranking
                    .iter()
                    .find(|r| r.option_id == tally.option_id)
                {
                    summed += ranked.score;
                    votes += 1;
                }
            }
            assert_eq!(tally.total, round4(summed));
            assert_eq!(tally.votes, votes);
            assert_eq!(tally.supporters.len(), votes);
            assert_eq!(tally.mean, round4(summed / votes as f64));
        }
        // Shares sum to 1 whenever anything was allocated.
        let shares: f64 = result.ballots.iter().map(|t| t.share).sum();
        assert!((shares - 1.0).abs() < 1e-3);
        // Sorted by total, descending.
        for pair in result.ballots.windows(2) {
            assert!(pair[0].total >= pair[1].total);
        }
    }
}

#[test]
fn the_verdict_is_consistent_with_the_ballot_and_the_super_majority() {
    for index in 0..parity_dilemmas().len() {
        let result = sit(index, PARITY_SEED);
        assert_eq!(result.ballots[0].option_id, result.winner_id);
        assert_eq!(result.super_majority.option_id, result.winner_id);
        let second = result.ballots[1].total;
        assert_eq!(result.margin, round4(result.ballots[0].total - second));
        assert!(result.margin >= 0.0);
        assert!((0.0..=1.0).contains(&result.confidence));
        assert!((0.0..=1.0).contains(&result.participation));
        assert_eq!(
            result.super_majority.yes + result.super_majority.no + result.super_majority.abstainers,
            result.participating
        );
        // Satisfaction requires both the ratio and the raw floor.
        if result.super_majority.satisfied {
            assert!(result.super_majority.yes >= result.super_majority.required);
            assert!(result.super_majority.yes > 0);
        }
    }
}

#[test]
fn the_deciding_axis_is_reproducible_from_the_court_vector_and_the_top_two() {
    for index in 0..parity_dilemmas().len() {
        let dilemma = &parity_dilemmas()[index];
        let result = sit(index, PARITY_SEED);
        let winner = dilemma
            .options
            .iter()
            .find(|o| o.id == result.winner_id)
            .unwrap_or_else(|| panic!("no winner {}", result.winner_id));
        let runner_up = dilemma
            .options
            .iter()
            .find(|o| Some(o.id.as_str()) == result.runner_up_id.as_deref())
            .unwrap_or_else(|| panic!("no runner-up for {}", result.winner_id));
        assert_eq!(
            result.deciding_axis,
            deciding_axis(&result.court_vector, &winner.deltas, &runner_up.deltas)
        );
        // The court's blended vector is the mean of every weighed advisor.
        let expected = court_vector(
            &parity_advisors()
                .iter()
                .map(|advisor| {
                    let kingdom = parity_kingdoms()
                        .into_iter()
                        .find(|k| Some(k.id.as_str()) == advisor.kingdom_id.as_deref());
                    weigh_advisor(&advisor.axioms, kingdom.as_ref().map(|k| &k.axioms))
                })
                .collect::<Vec<AxiomVector>>(),
        );
        assert_eq!(result.court_vector, expected);
        assert_eq!(
            result.court_profile(),
            describe_profile(&result.court_vector)
        );
        assert_eq!(result.court_balance(), balance(&result.court_vector));
    }
}

#[test]
fn the_utilon_band_matches_the_winners_aggregate() {
    for index in 0..parity_dilemmas().len() {
        let dilemma = &parity_dilemmas()[index];
        let result = sit(index, PARITY_SEED);
        let winner = dilemma
            .options
            .iter()
            .find(|o| o.id == result.winner_id)
            .unwrap_or_else(|| panic!("no winner {}", result.winner_id));
        // The band comes from `utilon_total`, not from `aggregate().total` —
        // the two round differently, and the council must match the TS council.
        let total = utilon_total(&dilemma.stakeholders, &winner.deltas);
        assert_eq!(result.utilon_band, utilon_scale(total).band);
        // Every axis total is finite and in range.
        for axis in 0..AXES {
            let axis_total = stakeholder_total(&dilemma.stakeholders, &winner.deltas, axis);
            assert!((0.0..=1.0).contains(&axis_total));
        }
    }
}

#[test]
fn the_whole_public_api_agrees_on_the_parity_figures() {
    let dilemmas = parity_dilemmas();
    let advisors = parity_advisors();

    // The bench really is four distinct traditions.
    assert_eq!(advisors.len(), 4);
    let dominants: Vec<usize> = advisors.iter().map(|a| dominant_axis(&a.axioms)).collect();
    assert_eq!(dominants[0], 1); // Kant: rights
    assert_eq!(dominants[1], 0); // Bentham: welfare
    assert_eq!(dominants[2], 3); // Gilligan: care
    assert_eq!(dominants[3], 2); // Aristotle: virtue
    for advisor in &advisors {
        assert_eq!(
            describe_profile(&advisor.axioms).split(" before ").count(),
            2
        );
        assert_eq!(
            rank_axes(&advisor.axioms)[0],
            dominant_axis(&advisor.axioms)
        );
        assert_eq!(
            secondary_axis(&advisor.axioms),
            rank_axes(&advisor.axioms)[1]
        );
        assert!((0.0..=1.0).contains(&balance(&advisor.axioms)));
    }

    // The two dilemmas really do have three options each.
    assert_eq!(dilemmas.len(), 2);
    for dilemma in &dilemmas {
        assert_eq!(dilemma.options.len(), 3);
        assert!(!dilemma.stakeholders.is_empty());
        for option in &dilemma.options {
            let agg = aggregate(&dilemma.stakeholders, &option.deltas);
            assert!((0.0..=1.0).contains(&agg.total));
            assert!((0.0..=1.0).contains(&agg.spread));
            assert!((0.0..=1.0).contains(&fairness_index(
                &agg.per_stakeholder
                    .iter()
                    .map(|s| s.contribution)
                    .collect::<Vec<f64>>()
            )));
            // Discounting is defined for every horizon in the domain.
            assert!(discount(agg.total, 10.0, 0.05) <= agg.total);
        }
    }

    // And the bench is genuinely divided: the furthest pair is Kant against
    // Bentham at a cosine distance of 0.4011, while the two garden advisors
    // sit within 0.11 of each other. A bench that agreed would not produce
    // both numbers.
    let mut max_distance = 0.0;
    let mut min_distance = f64::INFINITY;
    for i in 0..advisors.len() {
        for j in (i + 1)..advisors.len() {
            let d = distance(&advisors[i].axioms, &advisors[j].axioms);
            assert!((0.0..=2.0).contains(&d));
            assert!(!d.is_nan());
            if d > max_distance {
                max_distance = d;
            }
            if d < min_distance {
                min_distance = d;
            }
        }
    }
    assert_eq!(
        distance(&advisors[0].axioms, &advisors[1].axioms),
        0.4011,
        "Kant against Bentham is the furthest pair in this court"
    );
    assert!(
        distance(&advisors[2].axioms, &advisors[3].axioms) < 0.15,
        "the two garden advisors are near-neighbours"
    );
    assert!(max_distance >= 0.4 && min_distance <= 0.11);
}

#[test]
fn jitter_is_keyed_on_the_seed_the_round_and_the_two_ids() {
    let base = jitter_for(PARITY_SEED, "r1", "kant", "halt");
    assert!((base).abs() <= JITTER);
    // Same key, same value; different key part, different value.
    assert_eq!(base, jitter_for(PARITY_SEED, "r1", "kant", "halt"));
    assert_ne!(base, jitter_for(PARITY_SEED, "r1", "kant", "continue"));
    assert_ne!(base, jitter_for(PARITY_SEED, "r1", "bentham", "halt"));
    assert_ne!(base, jitter_for(PARITY_SEED, "r2", "kant", "halt"));
    assert_ne!(base, jitter_for(PARITY_SEED + 1, "r1", "kant", "halt"));
    assert_eq!(round4(base), base);

    // The keyed stream is exactly `create_rng(seed, tag, advisor, option)`.
    let mut rng = create_rng(
        PARITY_SEED,
        &[
            RngPart::Text("r1"),
            RngPart::Text("kant"),
            RngPart::Text("halt"),
        ],
    );
    assert_eq!(base, round4((rng.next() * 2.0 - 1.0) * JITTER));

    // And the seed hashes into the key the same way FNV-1a does.
    let key = format!("{PARITY_SEED}\u{241f}r1\u{241f}kant\u{241f}halt");
    assert_eq!(hash_string(&key), mulberry32(hash_string(&key)).seed());
    assert_eq!(hash_string(""), 0x811c_9dc5);
}

#[test]
fn the_council_is_reproducible_and_independent_of_seating_order() {
    let dilemmas = parity_dilemmas();
    let advisors = parity_advisors();
    let kingdoms = parity_kingdoms();
    let mut reversed = advisors.clone();
    reversed.reverse();

    let upright = run_council(&CouncilInput {
        dilemma: &dilemmas[0],
        advisors: &advisors,
        kingdoms: &kingdoms,
        seed: PARITY_SEED,
        rounds: Some(3),
        quorum: None,
    });
    let again = run_council(&CouncilInput {
        dilemma: &dilemmas[0],
        advisors: &advisors,
        kingdoms: &kingdoms,
        seed: PARITY_SEED,
        rounds: Some(3),
        quorum: None,
    });
    assert_eq!(
        upright, again,
        "identical inputs must give an identical sitting"
    );

    let upside_down = run_council(&CouncilInput {
        dilemma: &dilemmas[0],
        advisors: &reversed,
        kingdoms: &kingdoms,
        seed: PARITY_SEED,
        rounds: Some(3),
        quorum: None,
    });
    assert_eq!(upright.winner_id, upside_down.winner_id);
    assert_eq!(upright.margin, upside_down.margin);
    assert_eq!(upright.ballots, upside_down.ballots);

    // The reported rounds and quorum survive a second run unchanged.
    assert_eq!(upright.rounds, 3);
    assert_eq!(upright.participating, 4);
    assert_eq!(upright.quorum, 2);
}

#[test]
fn the_fixture_exercises_all_three_rounds() {
    let dilemma = &parity_dilemmas()[0];
    let result = sit(0, PARITY_SEED);
    let bench = parity_advisors();
    // Every round contributes traces, so the fixture covers the whole
    // three-round procedure rather than just the first reading.
    for round in 1..=3 {
        let count = result.traces.iter().filter(|t| t.round == round).count();
        assert!(count > 0, "round {round} produced no traces");
    }
    assert_eq!(
        result.traces.iter().filter(|t| t.round == 2).count(),
        result.objections.len()
    );
    assert_eq!(
        result.traces.iter().filter(|t| t.round == 3).count(),
        result.appeals.len()
    );
    // Every objection and appeal is attached to a real trace, and both quote a
    // move that exists on that advisor.
    for objection in &result.objections {
        assert!(result.traces.contains(&objection.trace));
        let move_ = bench
            .iter()
            .flat_map(|a| &a.moves)
            .find(|m| m.id == objection.move_id)
            .unwrap_or_else(|| panic!("unknown move {}", objection.move_id));
        assert_eq!(move_.kind.as_str(), "objection");
        assert_eq!(objection.claim, move_.claim);
        assert_eq!(objection.trace.premise, move_.support);
    }
    for appeal in &result.appeals {
        assert!(result.traces.contains(&appeal.trace));
        let move_ = bench
            .iter()
            .flat_map(|a| &a.moves)
            .find(|m| m.id == appeal.move_id)
            .unwrap_or_else(|| panic!("unknown move {}", appeal.move_id));
        assert_eq!(move_.kind.as_str(), appeal.kind.as_str());
        assert_eq!(appeal.claim, move_.claim);
        assert_eq!(appeal.trace.kind, appeal.kind);
        // The round-3 trace scores the option the loser was defending.
        assert!(dilemma
            .options
            .iter()
            .any(|o| o.id == appeal.trace.option_id));
        assert_ne!(appeal.option_id, result.winner_id);
    }
}

/* ------------------------------------------------------------------ *
 * 2. The fixture round-trip
 * ------------------------------------------------------------------ */

#[test]
fn rendering_the_parity_document_twice_is_byte_identical() {
    let first = parity_document().to_pretty();
    let second = parity_document().to_pretty();
    assert_eq!(first, second);
    // ...and the compact form agrees with the pretty form structurally.
    let compact = parity_document().to_compact();
    assert_eq!(compact, parity_document().to_compact());
    assert!(!compact.contains('\n'));
}

#[test]
fn the_pretty_document_is_valid_shaped_json_with_lf_endings() {
    let pretty = parity_document().to_pretty();
    // Written bytes are exactly `\n`, never `\r\n`, so a Windows checkout
    // cannot change the file's hash.
    assert!(!pretty.contains('\r'));
    assert!(pretty.ends_with("}\n"));
    assert!(!pretty.ends_with("\n\n"));
    // Braces and brackets balance.
    let mut depth = 0i32;
    let mut in_string = false;
    let mut escaped = false;
    for ch in pretty.chars() {
        if in_string {
            if escaped {
                escaped = false;
            } else if ch == '\\' {
                escaped = true;
            } else if ch == '"' {
                in_string = false;
            }
            continue;
        }
        match ch {
            '"' => in_string = true,
            '{' | '[' => depth += 1,
            '}' | ']' => depth -= 1,
            _ => {}
        }
        assert!(depth >= 0, "unbalanced JSON container");
    }
    assert_eq!(depth, 0, "unbalanced JSON container");
    assert!(!in_string, "unterminated JSON string");
}

#[test]
fn the_document_carries_every_section_the_readme_promises() {
    let document = parity_document();
    let Json::Obj(sections) = &document else {
        panic!("the document must be an object");
    };
    let keys: Vec<&str> = sections.iter().map(|(k, _)| k.as_str()).collect();
    assert_eq!(
        keys,
        [
            "schema",
            "generator",
            "source",
            "seed",
            "rounds",
            "axisNames",
            "kingdoms",
            "advisors",
            "dilemmas",
            "councils"
        ]
    );

    let get = |name: &str| -> Json {
        sections
            .iter()
            .find(|(k, _)| k == name)
            .map(|(_, v)| v.clone())
            .unwrap_or_else(|| panic!("no section {name}"))
    };

    // The metadata a TS test asserts on before it trusts anything else.
    assert_eq!(get("schema"), Json::from_str("nooreign.parity/1.0.0"));
    assert_eq!(get("seed"), Json::Int(PARITY_SEED));
    assert_eq!(get("rounds"), Json::Int(3));
    let Json::Arr(axis_names) = get("axisNames") else {
        panic!("axisNames must be an array");
    };
    assert_eq!(axis_names.len(), AXES);
    assert_eq!(axis_names[0], Json::from_str("welfare"));
    assert_eq!(axis_names[5], Json::from_str("agency"));

    // Four advisors with real six-axis weights, three kingdoms, two dilemmas.
    let Json::Arr(advisors) = get("advisors") else {
        panic!("advisors must be an array");
    };
    assert_eq!(advisors.len(), 4);
    for advisor in &advisors {
        let Json::Obj(fields) = advisor else {
            panic!("an advisor must be an object");
        };
        for key in [
            "id",
            "name",
            "axioms",
            "weighedAxioms",
            "profile",
            "balance",
            "moves",
        ] {
            assert!(
                fields.iter().any(|(k, _)| k == key),
                "advisor is missing {key}"
            );
        }
        let Json::Arr(weights) = fields
            .iter()
            .find(|(k, _)| k == "axioms")
            .map(|(_, v)| v.clone())
            .expect("axioms")
        else {
            panic!("axioms must be an array");
        };
        assert_eq!(weights.len(), AXES);
    }

    let Json::Arr(dilemmas) = get("dilemmas") else {
        panic!("dilemmas must be an array");
    };
    assert_eq!(dilemmas.len(), 2);
    for dilemma in &dilemmas {
        let Json::Obj(fields) = dilemma else {
            panic!("a dilemma must be an object");
        };
        let Json::Arr(options) = fields
            .iter()
            .find(|(k, _)| k == "options")
            .map(|(_, v)| v.clone())
            .expect("options")
        else {
            panic!("options must be an array");
        };
        assert_eq!(options.len(), 3, "every dilemma carries three options");
        for option in &options {
            let Json::Obj(option_fields) = option else {
                panic!("an option must be an object");
            };
            let Json::Arr(deltas) = option_fields
                .iter()
                .find(|(k, _)| k == "deltas")
                .map(|(_, v)| v.clone())
                .expect("deltas")
            else {
                panic!("deltas must be an array");
            };
            assert_eq!(deltas.len(), AXES, "every option carries six deltas");
        }
    }

    // One council per dilemma, each carrying the full audit trail.
    let Json::Arr(councils) = get("councils") else {
        panic!("councils must be an array");
    };
    assert_eq!(councils.len(), dilemmas.len());
    for council in &councils {
        let Json::Obj(fields) = council else {
            panic!("a council must be an object");
        };
        let keys: Vec<&str> = fields.iter().map(|(k, _)| k.as_str()).collect();
        for required in [
            "dilemmaId",
            "seed",
            "rounds",
            "winnerId",
            "runnerUpId",
            "margin",
            "confidence",
            "participating",
            "decidingAxis",
            "utilonBand",
            "courtVector",
            "superMajority",
            "ballots",
            "positions",
            "objections",
            "appeals",
            "dissent",
            "traces",
            "utilons",
            "utilonScale",
        ] {
            assert!(keys.contains(&required), "council is missing {required}");
        }
        let Json::Arr(traces) = fields
            .iter()
            .find(|(k, _)| k == "traces")
            .map(|(_, v)| v.clone())
            .expect("traces")
        else {
            panic!("traces must be an array");
        };
        assert!(
            !traces.is_empty(),
            "a council with no traces proves nothing"
        );
        for trace in &traces {
            let Json::Obj(trace_fields) = trace else {
                panic!("a trace must be an object");
            };
            let Json::Arr(contributions) = trace_fields
                .iter()
                .find(|(k, _)| k == "contributions")
                .map(|(_, v)| v.clone())
                .expect("contributions")
            else {
                panic!("contributions must be an array");
            };
            assert_eq!(contributions.len(), AXES);
        }
    }
}

#[test]
fn the_committed_fixture_matches_a_freshly_rendered_document() {
    let path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("fixtures")
        .join("parity.json");
    let Ok(on_disk) = std::fs::read_to_string(&path) else {
        panic!(
            "{} is missing — run `cargo run --manifest-path crates/engine/Cargo.toml --bin fixtures`",
            path.display()
        );
    };
    assert_eq!(
        on_disk,
        parity_document().to_pretty(),
        "the committed fixture has drifted from the engine; regenerate it"
    );
}
