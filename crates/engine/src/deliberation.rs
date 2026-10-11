//! `run_council` — the deliberation engine.
//!
//! WHY this shape: Nooreign's central promise is a verdict that is *explainable*.
//! A language model can tell you an answer is defensible; this engine tells you
//! which six multiplications produced it, who objected, and what they said. So
//! the module is organised around producing an audit trail first and a verdict
//! second — [`CouncilResult::traces`] is the primary output and the winner is
//! derived from it.
//!
//! Determinism is load-bearing. Identical inputs produce an equal result: every
//! source of variation (tie-breaks, "best move" selection, the jitter that stops
//! every advisor being perfectly rational) is drawn from a seeded stream keyed
//! on ids, never from iteration order or wall-clock time.
//!
//! # What is *not* ported, and why that is safe
//!
//! The TypeScript `deliberation.ts` also carries `narrate()` (prose assembled
//! from the verdict), `synthesis()` (the settling statement) and `compareCouncils`
//! (several courts over one dilemma). Those are *presentation* layers: they
//! format numbers into sentences and select which moves to quote, but none of
//! them feeds a number back into a verdict. Everything that *computes* is here,
//! and the parity fixture is built from the computing half, so a TS test that
//! agrees with this crate's fixtures agrees on the arithmetic.
//!
//! # Tie-breaks are byte-ordered, not locale-ordered
//!
//! The TS breaks ballot ties with `String.prototype.localeCompare`, which is
//! ICU-collation-dependent and therefore not a reproducible ordering. This port
//! uses Rust's byte-wise `Ord` on `String`. For every id in the parity fixture
//! the two agree, because the fixture ids are plain lowercase ASCII with no
//! punctuation that collators reorder. A TS parity test that wants to be safe
//! against a future id with a hyphen should compare with the same byte ordering
//! rather than with `localeCompare`.

use crate::axiom::{
    axis_name, balance, contributions, deciding_axis, describe_profile, distance, dominant_axis,
    score_option, weigh_advisor, AxiomContribution, AxiomVector, AXES, AXIS_NAMES,
};
use crate::json::Json;
use crate::math::{clamp, max_of, round4, safe_div, sum};
use crate::rng::{create_rng, RngPart};
use crate::utilon::{
    aggregate, fairness_of, stakeholder_total, unweighted_total, utilon_scale, utilon_total,
    Stakeholder, UtilonBand,
};

/* ------------------------------------------------------------------ *
 * Domain types
 * ------------------------------------------------------------------ */

/// The four kinds of move an advisor can make in a sitting.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum MoveKind {
    /// Round 1: "here is my position and why".
    Premise,
    /// Round 2: "that course will not do, and here is why".
    Objection,
    /// Round 3: "I lost; I am asking for a re-hearing".
    Appeal,
    /// Round 3: "here is how the two of us could both be right".
    Synthesis,
}

impl MoveKind {
    /// The lowercase slug used in the TypeScript source and the fixtures.
    #[must_use]
    pub fn as_str(self) -> &'static str {
        match self {
            MoveKind::Premise => "premise",
            MoveKind::Objection => "objection",
            MoveKind::Appeal => "appeal",
            MoveKind::Synthesis => "synthesis",
        }
    }
}

/// One named argument an advisor can put to a court.
#[derive(Clone, Debug, PartialEq)]
pub struct ArgumentMove {
    /// Stable slug, e.g. `"kant.ci"`.
    pub id: String,
    /// Which round this move belongs to.
    pub kind: MoveKind,
    /// The one-line claim, quoted in the trace.
    pub claim: String,
    /// The supporting passage, quoted verbatim in the trace's `premise`.
    pub support: String,
    /// How much the advisor presses this move, in `[0, 1]`.
    pub weight: f64,
    /// The axes the move leans on, as [`AXIS_NAMES`] indices.
    pub leans_on: Vec<usize>,
    /// Dilemma tags or option ids this move applies to. Empty means "always".
    pub applies_to: Vec<String>,
}

/// An advisor on the bench: a position, a name, and the moves they can make.
#[derive(Clone, Debug, PartialEq)]
pub struct Advisor {
    /// Stable slug, e.g. `"kant"`. The RNG and every tie-break key off this.
    pub id: String,
    /// Display name, e.g. `"Immanuel Kant"`.
    pub name: String,
    /// The kingdom whose bench they sit on, if any.
    pub kingdom_id: Option<String>,
    /// Their own moral weights, before any kingdom blend.
    pub axioms: AxiomVector,
    /// The moves they can make.
    pub moves: Vec<ArgumentMove>,
}

/// A court with its own priors, which it lends 30% of every seat on it.
#[derive(Clone, Debug, PartialEq)]
pub struct Kingdom {
    /// Stable slug, e.g. `"kg-citadel"`.
    pub id: String,
    /// Display name.
    pub name: String,
    /// The kingdom's own axiom weights.
    pub axioms: AxiomVector,
}

/// One course of action put to the court.
#[derive(Clone, Debug, PartialEq)]
pub struct DilemmaOption {
    /// Stable slug, e.g. `"halt"`.
    pub id: String,
    /// Display label, e.g. `"Throw the switch"`.
    pub label: String,
    /// How much of each moral axis this option honours, in `[0, 1]`.
    pub deltas: AxiomVector,
    /// How dangerous the option is. Used only as the third tie-break.
    pub risk: f64,
}

/// A question put before the court.
#[derive(Clone, Debug, PartialEq)]
pub struct Dilemma {
    /// Stable slug, e.g. `"dm-trolley"`.
    pub id: String,
    /// Display title, quoted in the council narrative.
    pub title: String,
    /// Tags a move's `applies_to` can match against.
    pub tags: Vec<String>,
    /// The courses of action on the table.
    pub options: Vec<DilemmaOption>,
    /// The parties with an interest in the outcome.
    pub stakeholders: Vec<Stakeholder>,
}

/* ------------------------------------------------------------------ *
 * Traces
 * ------------------------------------------------------------------ */

/**
 * One term of a trace's dot product.
 *
 * A deliberate alias rather than a parallel struct: a trace contribution *is* an
 * axiom contribution, and having two shapes for one number is how the rendered
 * arithmetic and the computed total drift apart.
 */
pub type TraceContribution = AxiomContribution;

/**
 * One scored move together with the arithmetic behind it.
 *
 * The invariant the UI depends on, and the one the parity fixture asserts:
 *
 * ```text
 * Σ contributions[].product == subtotal      (to 4 dp)
 * total == subtotal + jitter                 (to 4 dp)
 * ```
 */
#[derive(Clone, Debug, PartialEq)]
pub struct TraceEntry {
    /// The advisor who made the move.
    pub advisor_id: String,
    /// The advisor's display name.
    pub advisor_name: String,
    /// The kingdom whose bench they sat on.
    pub kingdom_id: Option<String>,
    /// 1 = positions, 2 = objections, 3 = appeals.
    pub round: u8,
    /// The kind of move this trace records.
    pub kind: MoveKind,
    /// The option the move was scored against.
    pub option_id: String,
    /// The move's supporting argument, quoted verbatim.
    pub premise: String,
    /// The move's one-line claim.
    pub claim: String,
    /// The move's id.
    pub move_id: String,
    /// The axes the move leans on.
    pub leans_on: Vec<usize>,
    /// The six `weight * delta` terms, always exactly six.
    pub contributions: [TraceContribution; AXES],
    /// The sum of the six products, rounded to 4 dp.
    pub subtotal: f64,
    /// The signed perturbation, in `[-JITTER, +JITTER]`.
    pub jitter: f64,
    /// `round4(subtotal + jitter)`.
    pub total: f64,
}

impl TraceEntry {
    /// The sum of the six contribution products, unrounded.
    ///
    /// Exposed so callers can assert the trace invariant without re-deriving
    /// the summation order.
    #[must_use]
    pub fn contribution_sum(&self) -> f64 {
        sum(&self
            .contributions
            .iter()
            .map(|c| c.product)
            .collect::<Vec<f64>>())
    }
}

/* ------------------------------------------------------------------ *
 * Records
 * ------------------------------------------------------------------ */

/// An option with its final and raw score.
#[derive(Clone, Debug, PartialEq)]
pub struct RankedOption {
    /// The option's id.
    pub option_id: String,
    /// Final score, including jitter.
    pub score: f64,
    /// Score before jitter — the pure moral arithmetic.
    pub raw: f64,
}

/// What one advisor did in round 1.
#[derive(Clone, Debug, PartialEq)]
pub struct PositionRecord {
    /// The advisor's id.
    pub advisor_id: String,
    /// The advisor's display name.
    pub advisor_name: String,
    /// The kingdom whose bench they sat on.
    pub kingdom_id: Option<String>,
    /// The advisor's first-ranked option.
    pub top_option_id: String,
    /// Every option with its final and raw score, best first.
    pub ranking: Vec<RankedOption>,
    /// The premise moves this advisor attached, best first.
    pub premise_move_ids: Vec<String>,
    /// `"rights before agency"` — the two axes that decide this advisor.
    pub profile: String,
    /// 0 = all weight on one axis, 1 = perfectly even.
    pub balance: f64,
}

/// What one advisor objected to in round 2.
#[derive(Clone, Debug, PartialEq)]
pub struct ObjectionRecord {
    /// The objecting advisor's id.
    pub advisor_id: String,
    /// The objecting advisor's display name.
    pub advisor_name: String,
    /// The kingdom whose bench they sat on.
    pub kingdom_id: Option<String>,
    /// The option the advisor is defending.
    pub defended_option_id: String,
    /// The option the objection presses against.
    pub targeted_option_id: String,
    /// The advisor whose position this objection answers.
    pub adversary_id: String,
    /// The adversary's display name, or a generic phrase when nobody held it.
    pub adversary_name: String,
    /// The move being made.
    pub move_id: String,
    /// The move's claim.
    pub claim: String,
    /// The objection's own scored trace.
    pub trace: TraceEntry,
}

/// What one advisor appealed on in round 3.
#[derive(Clone, Debug, PartialEq)]
pub struct AppealRecord {
    /// The appealing advisor's id.
    pub advisor_id: String,
    /// The appealing advisor's display name.
    pub advisor_name: String,
    /// The kingdom whose bench they sat on.
    pub kingdom_id: Option<String>,
    /// The option the advisor is still defending.
    pub option_id: String,
    /// The kind of move made.
    pub kind: MoveKind,
    /// The move's id.
    pub move_id: String,
    /// The move's claim.
    pub claim: String,
    /// How hard the advisor pressed: closeness of the vote x move weight.
    pub conviction: f64,
    /// The appeal's own scored trace.
    pub trace: TraceEntry,
}

/// One advisor's score for one option.
#[derive(Clone, Debug, PartialEq)]
pub struct BallotScore {
    /// The scoring advisor's id.
    pub advisor_id: String,
    /// The option scored.
    pub option_id: String,
    /// Conviction in `[0, 1]`. Higher means more certain, not more agreeable.
    pub score: f64,
}

/// Scores tallied into per-option totals, best first.
#[derive(Clone, Debug, PartialEq)]
pub struct BallotTally {
    /// The option's id.
    pub option_id: String,
    /// Sum of every advisor's score for this option.
    pub total: f64,
    /// `total` as a share of all scores cast, in `[0, 1]`.
    pub share: f64,
    /// Mean score per advisor who scored this option.
    pub mean: f64,
    /// How many advisors scored this option at all.
    pub votes: usize,
    /// Advisor ids backing it, sorted.
    pub supporters: Vec<String>,
}

/// One advisor's first reading of the options.
#[derive(Clone, Debug, PartialEq)]
pub struct StanceAdvisor {
    /// The advisor's id.
    pub advisor_id: String,
    /// The advisor's display name.
    pub advisor_name: String,
    /// The kingdom whose bench they sat on.
    pub kingdom_id: Option<String>,
    /// The advisor's own first-ranked option, or `None` when they did not vote.
    pub top_option_id: Option<String>,
}

/// Did the court actually agree?
#[derive(Clone, Debug, PartialEq)]
pub struct SuperMajority {
    /// The option the question is about.
    pub option_id: String,
    /// Whether the verdict clears both the ratio and the raw floor.
    pub satisfied: bool,
    /// The ratio threshold, 2/3 by default.
    pub threshold: f64,
    /// Advisors whose own top option was this one.
    pub yes: usize,
    /// Advisors who explicitly voted against. Always 0 under the derived policy.
    pub no: usize,
    /// Advisors whose own top option differed, plus non-voters.
    pub abstainers: usize,
    /// `yes / (yes + no)`, or 0 when nobody voted either way.
    pub ratio: f64,
    /// `yes / total advisors`, in `[0, 1]`.
    pub support: f64,
    /// The raw count of yes votes the threshold demands.
    pub required: usize,
}

/// One advisor who preferred a different course from the winner.
#[derive(Clone, Debug, PartialEq)]
pub struct DissentEntry {
    /// The dissenting advisor's id.
    pub advisor_id: String,
    /// The dissenting advisor's display name.
    pub advisor_name: String,
    /// The kingdom whose bench they sat on.
    pub kingdom_id: Option<String>,
    /// The option they actually wanted.
    pub preferred_option_id: String,
    /// How far their preference sat above the winner's mean, floored at 0.
    pub gap_to_winner: f64,
}

/// The single strongest argument against the winner.
#[derive(Clone, Debug, PartialEq)]
pub struct StrongestObjection {
    /// The advisor who made it.
    pub advisor_id: String,
    /// The advisor's display name.
    pub advisor_name: String,
    /// The move's id.
    pub move_id: String,
    /// The move's claim.
    pub claim: String,
    /// The move's supporting passage.
    pub support: String,
    /// The move's weight.
    pub weight: f64,
    /// The axes the move leans on.
    pub leans_on: Vec<usize>,
}

/// The minority report: who dissented, and what their best argument was.
#[derive(Clone, Debug, PartialEq)]
pub struct MinorityReport {
    /// The option that won.
    pub winner_id: String,
    /// The dissenters, largest gap first.
    pub dissenters: Vec<DissentEntry>,
    /// The highest-weighted objection or appeal any dissenter made, or `None`
    /// when the court was unanimous.
    pub strongest: Option<StrongestObjection>,
}

/// The court's verdict, derived from the ballot.
#[derive(Clone, Debug, PartialEq)]
pub struct Decision {
    /// The winning option's id, or `""` when nothing was put to the court.
    pub winner_id: String,
    /// Winner's total minus the runner-up's total. 0 in a dead heat.
    pub margin: f64,
    /// Winner total as a fraction of the runner-up's; 1 when tied.
    pub ratio: f64,
    /// Blended margin and turnout, in `[0, 1]`.
    pub confidence: f64,
    /// Share of advisors whose own top option was the winner, in `[0, 1]`.
    pub participation: f64,
    /// The runner-up's id, or `None` when the winner was unopposed.
    pub runner_up_id: Option<String>,
    /// Every option ranked, best first.
    pub ranked: Vec<BallotTally>,
    /// True when the winner was decided by a tie-break rather than by totals.
    pub tie_broken: bool,
}

/// Everything the council decided, and the arithmetic behind it.
#[derive(Clone, Debug, PartialEq)]
pub struct CouncilResult {
    /// The dilemma that was heard.
    pub dilemma_id: String,
    /// The seed the jitter stream was keyed on.
    pub seed: i64,
    /// How many rounds actually ran, always in `1..=3`.
    pub rounds: u8,
    /// The reported (never enforced) minimum advisors who must score an option.
    pub quorum: usize,
    /// How many advisors were seated.
    pub participating: usize,
    /// Round 1 records, one per advisor, in seating order.
    pub positions: Vec<PositionRecord>,
    /// Round 2 records, one per advisor who lodged an objection.
    pub objections: Vec<ObjectionRecord>,
    /// Round 3 records, one per advisor who lost and appealed.
    pub appeals: Vec<AppealRecord>,
    /// The final tally, best first.
    pub ballots: Vec<BallotTally>,
    /// The winning option's id.
    pub winner_id: String,
    /// The runner-up's id.
    pub runner_up_id: Option<String>,
    /// Winner's total minus the runner-up's total.
    pub margin: f64,
    /// Blended margin and turnout, in `[0, 1]`.
    pub confidence: f64,
    /// Share of advisors whose own top option was the winner.
    pub participation: f64,
    /// Whether a tie-break, rather than the totals, decided it.
    pub tie_broken: bool,
    /// The super-majority arithmetic on the verdict.
    pub super_majority: SuperMajority,
    /// Who dissented, and their strongest argument.
    pub dissent: MinorityReport,
    /// The axis whose weighted gap between winner and runner-up was largest.
    pub deciding_axis: usize,
    /// The winner's band on the utilon scale.
    pub utilon_band: UtilonBand,
    /// The bench's blended view: the elementwise mean of every advisor's
    /// weighed vector, rounded to 4 dp.
    pub court_vector: AxiomVector,
    /// Every scored move, in round order.
    pub traces: Vec<TraceEntry>,
}

impl CouncilResult {
    /// The weighed vector one advisor actually scored with.
    ///
    /// Recovered from the advisor's round-1 trace rather than recomputed, so
    /// the vector reported here is provably the one that produced the
    /// arithmetic in [`CouncilResult::traces`].
    #[must_use]
    pub fn weights_of(&self, advisor_id: &str) -> AxiomVector {
        let mut rebuilt = AxiomVector::ZERO;
        for trace in &self.traces {
            if trace.advisor_id != advisor_id {
                continue;
            }
            for contribution in &trace.contributions {
                rebuilt.0[contribution.axiom] = contribution.weight;
            }
        }
        rebuilt
    }

    /// `"rights before agency"` for the court's blended position.
    #[must_use]
    pub fn court_profile(&self) -> String {
        describe_profile(&self.court_vector)
    }

    /// How evenly the court's blended position is spread across the six axes.
    #[must_use]
    pub fn court_balance(&self) -> f64 {
        balance(&self.court_vector)
    }
}

/// Inputs to [`run_council`].
#[derive(Clone, Copy, Debug)]
pub struct CouncilInput<'a> {
    /// The question to be heard.
    pub dilemma: &'a Dilemma,
    /// The bench, in seating order.
    pub advisors: &'a [Advisor],
    /// The kingdoms whose benches are on the court.
    pub kingdoms: &'a [Kingdom],
    /// The jitter seed.
    pub seed: i64,
    /// How many rounds to run; `None` means 3. Clamped to `1..=3`.
    pub rounds: Option<i64>,
    /// The reported quorum; `None` means half the bench, rounded up.
    pub quorum: Option<i64>,
}

/// The largest perturbation any score may receive, in either direction.
///
/// Deliberately tiny: a philosopher who is off by a twentieth of their own
/// confidence is still a philosopher with a view. Anything larger would let the
/// seed decide verdicts, which would defeat the point of a transparent engine.
///
/// Port of `JITTER` in `packages/core/src/council/deliberation.ts`.
pub const JITTER: f64 = 0.05;

/* ------------------------------------------------------------------ *
 * Entry point
 * ------------------------------------------------------------------ */

/**
 * Convene a court.
 *
 * Port of `runCouncil` in `packages/core/src/council/deliberation.ts`.
 *
 * Rounds are fixed by contract — 1 = positions, 2 = objections, 3 = appeals. A
 * `rounds` below 1 is clamped to 1 and above 3 to 3, because a fourth round
 * would have no new procedure to run and would only invent variation.
 *
 * The ballot uses each advisor's *kingdom-weighted* vector, so a Citadel Kant
 * and an unaffiliated Kant are not the same witness. The trace shows the same
 * weights it scored with, so the arithmetic on screen is the arithmetic that
 * decided the case.
 *
 *  # Degenerate inputs
 *
 *  An empty bench, an empty dilemma and an empty kingdom list are all total
 *  cases: the council reports zeros rather than panicking, because a UI that
 *  asks "what would this kingdom rule?" must be able to ask while the kingdom
 *  is still being drawn.
 */
#[must_use]
pub fn run_council(input: &CouncilInput<'_>) -> CouncilResult {
    let dilemma = input.dilemma;
    let advisors = input.advisors;
    let seed = input.seed;
    let rounds = clamp(input.rounds.unwrap_or(3) as f64, 1.0, 3.0) as u8;

    // The weights the court actually scores with: each advisor's own priors,
    // pulled 30% toward their kingdom's.
    let mut weights: Vec<AxiomVector> = Vec::with_capacity(advisors.len());
    for advisor in advisors {
        let kingdom = input
            .kingdoms
            .iter()
            .find(|k| Some(k.id.as_str()) == advisor.kingdom_id.as_deref());
        weights.push(weigh_advisor(&advisor.axioms, kingdom.map(|k| &k.axioms)));
    }

    let mut traces: Vec<TraceEntry> = Vec::new();
    let mut positions: Vec<PositionRecord> = Vec::new();
    let mut objections: Vec<ObjectionRecord> = Vec::new();
    let mut appeals: Vec<AppealRecord> = Vec::new();
    let mut ballot_scores: Vec<BallotScore> = Vec::new();

    /* ---- Round 1: positions ------------------------------------------ */
    for (index, advisor) in advisors.iter().enumerate() {
        let vector = weights[index];

        let mut scored: Vec<RankedOption> = dilemma
            .options
            .iter()
            .map(|option| {
                let raw = round4(score_option(&vector, &option.deltas));
                let jitter = jitter_for(seed, "r1", &advisor.id, &option.id);
                RankedOption {
                    option_id: option.id.clone(),
                    raw,
                    score: round4(raw + jitter),
                }
            })
            .collect();

        for entry in &scored {
            ballot_scores.push(BallotScore {
                advisor_id: advisor.id.clone(),
                option_id: entry.option_id.clone(),
                score: entry.score,
            });
        }

        // Best first; ties broken on option id so the top choice is a function
        // of the inputs rather than of the seating.
        scored.sort_by(|a, b| {
            b.score
                .total_cmp(&a.score)
                .then_with(|| a.option_id.cmp(&b.option_id))
        });

        let top_option_id = scored
            .first()
            .map(|r| r.option_id.clone())
            .or_else(|| dilemma.options.first().map(|o| o.id.clone()))
            .unwrap_or_default();

        let premise_moves = premises_for(advisor, dilemma);

        positions.push(PositionRecord {
            advisor_id: advisor.id.clone(),
            advisor_name: advisor.name.clone(),
            kingdom_id: advisor.kingdom_id.clone(),
            top_option_id: top_option_id.clone(),
            ranking: scored.clone(),
            premise_move_ids: premise_moves.iter().map(|m| m.id.clone()).collect(),
            profile: describe_profile(&vector),
            balance: balance(&vector),
        });

        let top_option = dilemma.options.iter().find(|o| o.id == top_option_id);
        if let (Some(option), Some(move_)) = (top_option, premise_moves.first()) {
            traces.push(trace_entry(
                advisor,
                &vector,
                option,
                1,
                MoveKind::Premise,
                move_,
                jitter_for(seed, "r1", &advisor.id, &top_option_id),
            ));
        }
    }

    /* ---- Round 2: objections ----------------------------------------- */
    if rounds >= 2 {
        for (index, advisor) in advisors.iter().enumerate() {
            let Some(own) = positions.iter().find(|p| p.advisor_id == advisor.id) else {
                continue;
            };
            // The strongest rival is the best option that is not the advisor's
            // own.
            let Some(rival) = own
                .ranking
                .iter()
                .find(|r| r.option_id != own.top_option_id)
            else {
                continue;
            };
            let Some(move_) = objection_for(advisor, dilemma, &rival.option_id) else {
                continue;
            };
            let Some(defended) = dilemma.options.iter().find(|o| o.id == own.top_option_id) else {
                continue;
            };

            // The objection *answers* whoever ranked that rival first: a
            // deliberation is a conversation, and an argument nobody replies to
            // is not one.
            let adversary = positions
                .iter()
                .filter(|p| p.top_option_id == rival.option_id && p.advisor_id != advisor.id)
                .min_by(|a, b| a.advisor_id.cmp(&b.advisor_id));

            let trace = trace_entry(
                advisor,
                &weights[index],
                defended,
                2,
                MoveKind::Objection,
                move_,
                jitter_for(seed, "r2", &advisor.id, &rival.option_id),
            );

            objections.push(ObjectionRecord {
                advisor_id: advisor.id.clone(),
                advisor_name: advisor.name.clone(),
                kingdom_id: advisor.kingdom_id.clone(),
                defended_option_id: own.top_option_id.clone(),
                targeted_option_id: rival.option_id.clone(),
                adversary_id: adversary.map(|a| a.advisor_id.clone()).unwrap_or_default(),
                adversary_name: adversary
                    .map(|a| a.advisor_name.clone())
                    .unwrap_or_else(|| "the advocates of that course".to_string()),
                move_id: move_.id.clone(),
                claim: move_.claim.clone(),
                trace: trace.clone(),
            });
            traces.push(trace);
        }
    }

    /* ---- Round 3: appeals -------------------------------------------- */
    if rounds >= 3 {
        let provisional = decision(&ballot_scores, &dilemma.options);
        // Conviction is weighted by how close the vote was: a court that was
        // nearly split hears the appeals, a court that was not does not need
        // them.
        let leader_total = match provisional.ranked.first() {
            Some(tally) => tally.total,
            None => 1.0,
        };
        let closeness = clamp(1.0 - safe_ratio(provisional.margin, leader_total), 0.0, 1.0);
        let losers: Vec<&str> = provisional
            .ranked
            .iter()
            .skip(1)
            .map(|t| t.option_id.as_str())
            .collect();

        for (index, advisor) in advisors.iter().enumerate() {
            let Some(own) = positions.iter().find(|p| p.advisor_id == advisor.id) else {
                continue;
            };
            if !losers.contains(&own.top_option_id.as_str()) {
                continue;
            }
            let Some(move_) = appeal_for(advisor, dilemma) else {
                continue;
            };
            let Some(option) = dilemma.options.iter().find(|o| o.id == own.top_option_id) else {
                continue;
            };

            let trace = trace_entry(
                advisor,
                &weights[index],
                option,
                3,
                move_.kind,
                move_,
                jitter_for(seed, "r3", &advisor.id, &own.top_option_id),
            );

            appeals.push(AppealRecord {
                advisor_id: advisor.id.clone(),
                advisor_name: advisor.name.clone(),
                kingdom_id: advisor.kingdom_id.clone(),
                option_id: own.top_option_id.clone(),
                kind: move_.kind,
                move_id: move_.id.clone(),
                claim: move_.claim.clone(),
                conviction: round4(clamp(closeness * move_.weight, 0.0, 1.0)),
                trace: trace.clone(),
            });
            traces.push(trace);
        }
    }

    /* ---- Decision ----------------------------------------------------- */
    let verdict = decision(&ballot_scores, &dilemma.options);

    let stances: Vec<StanceAdvisor> = positions
        .iter()
        .map(|p| StanceAdvisor {
            advisor_id: p.advisor_id.clone(),
            advisor_name: p.advisor_name.clone(),
            kingdom_id: p.kingdom_id.clone(),
            top_option_id: Some(p.top_option_id.clone()),
        })
        .collect();
    let majority = super_majority(&verdict.winner_id, &stances, 2.0 / 3.0);
    let dissent = minority_report(&ballot_scores, &verdict.winner_id, advisors);

    // Which axis decided it: the winner-vs-runner-up gap weighted by the
    // *court's* blended view, so kingdom context shows up in the verdict too.
    let court_weights = court_vector(&weights);
    let winner_option = dilemma.options.iter().find(|o| o.id == verdict.winner_id);
    let runner_up_option = dilemma
        .options
        .iter()
        .find(|o| Some(o.id.as_str()) == verdict.runner_up_id.as_deref());
    let deciding = match (winner_option, runner_up_option) {
        (Some(winner), Some(runner_up)) => {
            deciding_axis(&court_weights, &winner.deltas, &runner_up.deltas)
        }
        _ => dominant_axis(&court_weights),
    };

    let band = utilon_scale(match winner_option {
        Some(option) => utilon_total(&dilemma.stakeholders, &option.deltas),
        None => 0.0,
    })
    .band;

    let quorum = clamp(
        input
            .quorum
            .unwrap_or_else(|| (advisors.len() as f64 / 2.0).ceil() as i64) as f64,
        0.0,
        advisors.len() as f64,
    ) as usize;

    CouncilResult {
        dilemma_id: dilemma.id.clone(),
        seed,
        rounds,
        quorum,
        participating: advisors.len(),
        positions,
        objections,
        appeals,
        ballots: weighted_ballot(
            &ballot_scores,
            &dilemma
                .options
                .iter()
                .map(|o| o.id.clone())
                .collect::<Vec<String>>(),
        ),
        winner_id: verdict.winner_id.clone(),
        runner_up_id: verdict.runner_up_id.clone(),
        margin: verdict.margin,
        confidence: verdict.confidence,
        participation: verdict.participation,
        tie_broken: verdict.tie_broken,
        super_majority: majority,
        dissent,
        deciding_axis: deciding,
        utilon_band: band,
        court_vector: court_weights,
        traces,
    }
}

/* ------------------------------------------------------------------ *
 * Deterministic jitter
 * ------------------------------------------------------------------ */

/**
 * A signed perturbation in `[-JITTER, +JITTER]`, derived from the seed and the
 * ids involved.
 *
 * Keying on ids means the same advisor/option pair jitters identically even when
 * the rest of the court changes — a stable court is a court you can compare
 * across sessions.
 */
#[must_use]
pub fn jitter_for(seed: i64, tag: &str, advisor_id: &str, option_id: &str) -> f64 {
    let mut rng = create_rng(
        seed,
        &[
            RngPart::Text(tag),
            RngPart::Text(advisor_id),
            RngPart::Text(option_id),
        ],
    );
    round4((rng.next() * 2.0 - 1.0) * JITTER)
}

/* ------------------------------------------------------------------ *
 * Ballot and decision
 * ------------------------------------------------------------------ */

/**
 * Tally scores into per-option totals and shares.
 *
 * Options nobody scored are kept, with a zero tally — the council has to be able
 * to say "this option was available and no one wanted it", which is a fact and
 * not a silence.
 *
 * Port of `weightedBallot` in `packages/core/src/council/consensus.ts`.
 */
#[must_use]
pub fn weighted_ballot(scores: &[BallotScore], option_ids: &[String]) -> Vec<BallotTally> {
    // Dedupe the union of the declared options and the scored ones.
    let mut ids: Vec<String> = Vec::with_capacity(option_ids.len() + scores.len());
    for id in option_ids.iter().chain(scores.iter().map(|s| &s.option_id)) {
        if !ids.iter().any(|existing| existing == id) {
            ids.push(id.clone());
        }
    }
    ids.sort();

    let mut tallies: Vec<BallotTally> = ids
        .iter()
        .map(|option_id| {
            let cast: Vec<&BallotScore> = scores
                .iter()
                .filter(|s| &s.option_id == option_id)
                .collect();
            let values: Vec<f64> = cast.iter().map(|s| s.score).collect();
            let mut supporters: Vec<String> = cast.iter().map(|s| s.advisor_id.clone()).collect();
            supporters.sort();
            BallotTally {
                option_id: option_id.clone(),
                total: round4(sum(&values)),
                share: 0.0,
                mean: round4(if values.is_empty() {
                    0.0
                } else {
                    crate::math::mean(&values)
                }),
                votes: cast.len(),
                supporters,
            }
        })
        .collect();

    let total = round4(sum(&tallies.iter().map(|t| t.total).collect::<Vec<f64>>()));
    for tally in &mut tallies {
        tally.share = round4(safe_div(tally.total, total));
    }
    tallies.sort_by(|a, b| {
        b.total
            .total_cmp(&a.total)
            .then_with(|| a.option_id.cmp(&b.option_id))
    });
    tallies
}

/**
 * Decide.
 *
 * **Tie-break policy, in order** (each step fully determines the next, so the
 * result is a pure function of its inputs):
 *
 * 1. highest ballot total;
 * 2. highest mean score per advisor — a unanimous preference beats a split one
 *    carrying the same total;
 * 3. lowest `risk` — the court does not hand a tied victory to the more
 *    dangerous course;
 * 4. lexicographically smallest id — a total tie-break, so that two councils
 *    with identical numbers always produce identical output.
 *
 * Port of `decision` in `packages/core/src/council/consensus.ts`.
 */
#[must_use]
pub fn decision(scores: &[BallotScore], options: &[DilemmaOption]) -> Decision {
    let declared: Vec<String> = options.iter().map(|o| o.id.clone()).collect();
    let ranked = weighted_ballot(scores, &declared);

    let Some(first) = ranked.first() else {
        return Decision {
            winner_id: String::new(),
            margin: 0.0,
            ratio: 1.0,
            confidence: 0.0,
            participation: 0.0,
            runner_up_id: None,
            ranked,
            tie_broken: false,
        };
    };
    // An empty ballot entry still has to produce a decision, and the TS returns
    // the same "nothing was put to the court" shape for it. Reusing `first`
    // here keeps that one path rather than duplicating the literal.
    let _ = first;

    let mut ordered = ranked.clone();
    ordered.sort_by(|a, b| {
        let risk_a = options
            .iter()
            .find(|o| o.id == a.option_id)
            .map_or(0.0, |o| o.risk);
        let risk_b = options
            .iter()
            .find(|o| o.id == b.option_id)
            .map_or(0.0, |o| o.risk);
        b.total
            .total_cmp(&a.total)
            .then_with(|| b.mean.total_cmp(&a.mean))
            .then_with(|| risk_a.total_cmp(&risk_b))
            .then_with(|| a.option_id.cmp(&b.option_id))
    });
    let winner_id = ordered
        .first()
        .map(|t| t.option_id.clone())
        .unwrap_or_default();
    let winner_total = ordered.first().map(|t| t.total).unwrap_or(0.0);
    let runner_up = ordered.get(1);

    let margin = round4(winner_total - runner_up.map(|t| t.total).unwrap_or(0.0));
    let tied_on_total = runner_up.is_some_and(|t| t.total == winner_total);
    let relative_margin = round4(clamp(safe_div(margin, winner_total.max(1e-9)), 0.0, 1.0));

    // Participation: the share of advisors whose personal top option was the
    // winner. Advisors are visited in first-appearance order so that two runs
    // over the same scores agree exactly.
    let mut advisor_ids: Vec<&str> = Vec::new();
    for score in scores {
        if !advisor_ids
            .iter()
            .any(|id| *id == score.advisor_id.as_str())
        {
            advisor_ids.push(&score.advisor_id);
        }
    }
    let mut backing = 0usize;
    for advisor_id in &advisor_ids {
        let mut best_id: &str = "";
        let mut best_score = f64::NEG_INFINITY;
        for score in scores.iter().filter(|s| s.advisor_id == *advisor_id) {
            if score.score > best_score {
                best_score = score.score;
                best_id = score.option_id.as_str();
            }
        }
        if best_id == winner_id {
            backing += 1;
        }
    }
    let participation = round4(safe_div(backing as f64, advisor_ids.len() as f64));
    let confidence = confidence_from(relative_margin, participation);

    Decision {
        winner_id,
        margin,
        ratio: round4(safe_div(
            winner_total,
            runner_up.map(|t| t.total).unwrap_or(0.0).max(1e-9),
        )),
        confidence,
        participation,
        runner_up_id: runner_up.map(|t| t.option_id.clone()),
        ranked: ordered,
        tie_broken: tied_on_total,
    }
}

/**
 * **Confidence** blends how decisive the numbers were with how many advisors
 * actually backed the winner.
 *
 * A 60/40 split that every advisor agrees on is a firmer verdict than the same
 * split produced by two camps — and a unanimous court that barely scored
 * anything is not a firm verdict at all.
 *
 * Port of `confidenceFrom` in `packages/core/src/council/consensus.ts`.
 */
#[must_use]
pub fn confidence_from(relative_margin: f64, participation: f64) -> f64 {
    round4(clamp(
        0.6 * clamp(relative_margin, 0.0, 1.0) + 0.4 * clamp(participation, 0.0, 1.0),
        0.0,
        1.0,
    ))
}

/* ------------------------------------------------------------------ *
 * Super-majority and dissent
 * ------------------------------------------------------------------ */

/**
 * Did the court actually agree?
 *
 * **Policy.** An advisor whose own top option differs from the one on the table
 * abstains: they were asked about a course they had already ranked below
 * another, and counting them as opposition would manufacture a conflict the
 * deliberation did not produce. Abstentions therefore do not enter the ratio
 * (the standard parliamentary convention) but *do* count against a raw floor,
 * so a court of ten with three silent members cannot clear a two-thirds bar on
 * seven votes alone.
 *
 * `satisfied` requires both `ratio >= threshold` and `yes >= required`, where
 * `required = ceil(threshold * advisors)`.
 *
 * Port of `superMajority` in `packages/core/src/council/consensus.ts`.
 */
#[must_use]
pub fn super_majority(option_id: &str, stances: &[StanceAdvisor], threshold: f64) -> SuperMajority {
    let mut yes = 0usize;
    let mut abstainers = 0usize;
    for stance in stances {
        match &stance.top_option_id {
            Some(top) if top == option_id => yes += 1,
            // An advisor who ranked something else first, or one who never
            // voted, abstains. The derived policy has no way to record an
            // explicit `against`, so `no` is structurally zero — see
            // `SuperMajority::no`.
            _ => abstainers += 1,
        }
    }
    let no = 0usize;

    let ratio = round4(safe_div(yes as f64, (yes + no) as f64));
    let support = round4(safe_div(yes as f64, stances.len() as f64));
    let required = (threshold * stances.len() as f64).ceil() as usize;

    SuperMajority {
        option_id: option_id.to_string(),
        satisfied: yes > 0 && ratio >= threshold && yes >= required,
        threshold: round4(threshold),
        yes,
        no,
        abstainers,
        ratio,
        support,
        required,
    }
}

/**
 * The minority report: who dissented, and what their best argument was.
 *
 * "Strongest" is the highest-weighted objection or appeal any dissenter made,
 * with ties broken on advisor id then move id — so the same sitting always
 * surfaces the same objection, never whichever one happened to be enumerated
 * last.
 *
 * Port of `minorityReport` in `packages/core/src/council/consensus.ts`.
 */
#[must_use]
pub fn minority_report(
    scores: &[BallotScore],
    winner_id: &str,
    advisors: &[Advisor],
) -> MinorityReport {
    let mut dissenters: Vec<DissentEntry> = Vec::new();
    let winner_scores: Vec<f64> = scores
        .iter()
        .filter(|s| s.option_id == winner_id)
        .map(|s| s.score)
        .collect();
    let winner_mean = crate::math::mean(&winner_scores);

    for advisor in advisors {
        let mut top = String::new();
        let mut best = f64::NEG_INFINITY;
        for score in scores.iter().filter(|s| s.advisor_id == advisor.id) {
            if score.score > best {
                best = score.score;
                top = score.option_id.clone();
            }
        }
        // An advisor who scored nothing has no position to dissent from.
        if top.is_empty() || top == winner_id {
            continue;
        }
        dissenters.push(DissentEntry {
            advisor_id: advisor.id.clone(),
            advisor_name: advisor.name.clone(),
            kingdom_id: advisor.kingdom_id.clone(),
            preferred_option_id: top,
            gap_to_winner: round4((best - winner_mean).max(0.0)),
        });
    }

    dissenters.sort_by(|a, b| {
        b.gap_to_winner
            .total_cmp(&a.gap_to_winner)
            .then_with(|| a.advisor_id.cmp(&b.advisor_id))
    });

    let dissenting_ids: Vec<&str> = dissenters.iter().map(|d| d.advisor_id.as_str()).collect();
    let mut candidates: Vec<(&Advisor, &ArgumentMove)> = Vec::new();
    for advisor in advisors {
        if !dissenting_ids.contains(&advisor.id.as_str()) {
            continue;
        }
        for move_ in &advisor.moves {
            if move_.kind == MoveKind::Objection || move_.kind == MoveKind::Appeal {
                candidates.push((advisor, move_));
            }
        }
    }
    candidates.sort_by(|x, y| {
        y.1.weight
            .total_cmp(&x.1.weight)
            .then_with(|| x.0.id.cmp(&y.0.id))
            .then_with(|| x.1.id.cmp(&y.1.id))
    });

    let strongest = candidates
        .first()
        .map(|(advisor, move_)| StrongestObjection {
            advisor_id: advisor.id.clone(),
            advisor_name: advisor.name.clone(),
            move_id: move_.id.clone(),
            claim: move_.claim.clone(),
            support: move_.support.clone(),
            weight: round4(move_.weight),
            leans_on: move_.leans_on.clone(),
        });

    MinorityReport {
        winner_id: winner_id.to_string(),
        dissenters,
        strongest,
    }
}

/* ------------------------------------------------------------------ *
 * Move selection
 * ------------------------------------------------------------------ */

/**
 * Moves apt for this dilemma: a move with no `applies_to` is always available;
 * otherwise one of the dilemma's tags must match. Sorted by weight, then id.
 */
fn matching_moves<'a>(advisor: &'a Advisor, dilemma: &Dilemma) -> Vec<&'a ArgumentMove> {
    let mut matching: Vec<&ArgumentMove> = advisor
        .moves
        .iter()
        .filter(|m| {
            m.applies_to.is_empty()
                || m.applies_to
                    .iter()
                    .any(|tag| dilemma.tags.iter().any(|d| d == tag))
        })
        .collect();
    matching.sort_by(|a, b| b.weight.total_cmp(&a.weight).then_with(|| a.id.cmp(&b.id)));
    matching
}

/// Round 1 premises: the advisor's best-matching non-attacking moves.
fn premises_for<'a>(advisor: &'a Advisor, dilemma: &Dilemma) -> Vec<&'a ArgumentMove> {
    matching_moves(advisor, dilemma)
        .into_iter()
        .filter(|m| m.kind == MoveKind::Premise)
        .collect()
}

/**
 * Round 2: the advisor's strongest applicable `objection`.
 *
 * A move tagged with the rival's own option id is aimed at that option
 * specifically; otherwise the top objection answers the strongest rival.
 */
fn objection_for<'a>(
    advisor: &'a Advisor,
    dilemma: &Dilemma,
    rival_option_id: &str,
) -> Option<&'a ArgumentMove> {
    let matching: Vec<&ArgumentMove> = matching_moves(advisor, dilemma)
        .into_iter()
        .filter(|m| m.kind == MoveKind::Objection)
        .collect();
    matching
        .iter()
        .find(|m| m.applies_to.iter().any(|tag| tag == rival_option_id))
        .copied()
        .or_else(|| matching.first().copied())
}

/**
 * Round 3: an `appeal` or `synthesis` move — appeals first, because a losing
 * advisor asking for a re-hearing is more characteristic of a deliberation than
 * a synthesis, which is what you offer once you already hold the floor.
 */
fn appeal_for<'a>(advisor: &'a Advisor, dilemma: &Dilemma) -> Option<&'a ArgumentMove> {
    let mut candidates: Vec<&ArgumentMove> = matching_moves(advisor, dilemma)
        .into_iter()
        .filter(|m| m.kind == MoveKind::Appeal || m.kind == MoveKind::Synthesis)
        .collect();
    candidates.sort_by(|a, b| {
        let rank = |m: &ArgumentMove| if m.kind == MoveKind::Appeal { 0 } else { 1 };
        rank(a)
            .cmp(&rank(b))
            .then_with(|| b.weight.total_cmp(&a.weight))
            .then_with(|| a.id.cmp(&b.id))
    });
    candidates.first().copied()
}

/* ------------------------------------------------------------------ *
 * Traces
 * ------------------------------------------------------------------ */

/**
 * Build one scored trace.
 *
 * The subtotal is the sum of the *rounded* per-axis products and the total is
 * `round4(subtotal + jitter)`, both exactly as in the TS — which is what makes
 * `Σ contributions[].product == subtotal` hold to the last displayed digit
 * rather than merely approximately.
 */
fn trace_entry(
    advisor: &Advisor,
    vector: &AxiomVector,
    option: &DilemmaOption,
    round: u8,
    kind: MoveKind,
    move_: &ArgumentMove,
    jitter: f64,
) -> TraceEntry {
    let contributions = contributions(vector, &option.deltas);
    let subtotal = round4(sum(&contributions
        .iter()
        .map(|c| c.product)
        .collect::<Vec<f64>>()));

    TraceEntry {
        advisor_id: advisor.id.clone(),
        advisor_name: advisor.name.clone(),
        kingdom_id: advisor.kingdom_id.clone(),
        round,
        kind,
        option_id: option.id.clone(),
        premise: move_.support.clone(),
        claim: move_.claim.clone(),
        move_id: move_.id.clone(),
        leans_on: move_.leans_on.clone(),
        contributions,
        subtotal,
        jitter,
        total: round4(subtotal + jitter),
    }
}

/* ------------------------------------------------------------------ *
 * Court-level helpers
 * ------------------------------------------------------------------ */

/**
 * The court's blended view: the mean of every advisor's weighed vector.
 *
 * Port of `courtVector` in `packages/core/src/council/deliberation.ts`, which
 * averages over a `Map`'s values. The caller supplies them in seating order,
 * which is the order the TS map was built in, so the floating-point summation
 * order matches too.
 */
#[must_use]
pub fn court_vector(weights: &[AxiomVector]) -> AxiomVector {
    if weights.is_empty() {
        return AxiomVector::ZERO;
    }
    let mut out = [0.0; AXES];
    for axis in 0..AXES {
        let column: Vec<f64> = weights.iter().map(|v| v.get(axis)).collect();
        out[axis] = round4(sum(&column) / weights.len() as f64);
    }
    AxiomVector(out)
}

/**
 * How far the most distant advisor sits from the court's blended position.
 *
 * Port of `courtSpread` in `packages/core/src/council/deliberation.ts`.
 */
#[must_use]
pub fn court_spread(advisors: &[Advisor], weights: &[AxiomVector]) -> f64 {
    if advisors.is_empty() {
        return 0.0;
    }
    let court = court_vector(weights);
    round4(max_of(
        &advisors
            .iter()
            .zip(weights)
            .map(|(advisor, _)| distance(&advisor.axioms, &court))
            .collect::<Vec<f64>>(),
    ))
}

/* ------------------------------------------------------------------ *
 * Parity fixture
 * ------------------------------------------------------------------ */

/**
 * The seed every parity fixture is generated with.
 *
 * Chosen as a date (`2026-10-11`) so it is obviously arbitrary-but-fixed: it is
 * in no formula, it is only ever a key, and changing it should change the jitter
 * and nothing else.
 */
pub const PARITY_SEED: i64 = 20_261_011;

/// The three kingdoms the parity fixture court sits on.
///
/// Ported from `packages/core/src/__fixtures__/council.ts` rather than from the
/// seed dataset, so a seed refresh can never silently change what the fixture
/// means.
#[must_use]
pub fn parity_kingdoms() -> Vec<Kingdom> {
    vec![
        Kingdom {
            id: "kg-citadel".to_string(),
            name: "The Citadel of Reason".to_string(),
            axioms: AxiomVector([0.35, 0.9, 0.55, 0.3, 0.6, 0.75]),
        },
        Kingdom {
            id: "kg-orchard".to_string(),
            name: "The Orchard of Consequences".to_string(),
            axioms: AxiomVector([0.9, 0.35, 0.45, 0.5, 0.5, 0.45]),
        },
        Kingdom {
            id: "kg-garden".to_string(),
            name: "The Garden of Persons".to_string(),
            axioms: AxiomVector([0.55, 0.4, 0.75, 0.9, 0.6, 0.5]),
        },
    ]
}

/// The four-advisor parity bench: a deontologist, a utilitarian, a care
/// ethicist and a virtue ethicist.
///
/// Each carries one premise, one objection and one appeal so that all three
/// rounds produce traces for the fixture to assert on.
#[must_use]
pub fn parity_advisors() -> Vec<Advisor> {
    vec![
        Advisor {
            id: "kant".to_string(),
            name: "Immanuel Kant".to_string(),
            kingdom_id: Some("kg-citadel".to_string()),
            axioms: AxiomVector([0.2, 0.95, 0.4, 0.35, 0.45, 0.7]),
            moves: vec![
                ArgumentMove {
                    id: "kant.ci".to_string(),
                    kind: MoveKind::Premise,
                    claim: "Act only on maxims you can will to be universal laws.".to_string(),
                    support: "The imperative is not advice about outcomes but a condition on the will itself; it binds regardless of consequence.".to_string(),
                    weight: 1.0,
                    leans_on: vec![1, 5],
                    applies_to: vec![],
                },
                ArgumentMove {
                    id: "kant.personhood".to_string(),
                    kind: MoveKind::Premise,
                    claim: "A person is an end, never a means, however the totals fall.".to_string(),
                    support: "The humanity formula forbids treating rational agents as instruments, and an efficient cause that computes totals is an instrument.".to_string(),
                    weight: 0.95,
                    leans_on: vec![1, 5],
                    applies_to: vec!["trolley".to_string(), "paperclip".to_string()],
                },
                ArgumentMove {
                    id: "kant.no-lying-machine".to_string(),
                    kind: MoveKind::Objection,
                    claim: "Intelligence that fabricates its reasons is deceiving, whatever goods it delivers.".to_string(),
                    support: "A mind that manufactures consent has used one as a means; the harm does not need a visible victim at the moment of the act.".to_string(),
                    weight: 0.8,
                    leans_on: vec![1, 5, 3],
                    applies_to: vec!["paperclip".to_string(), "halt".to_string()],
                },
                ArgumentMove {
                    id: "kant.dignity".to_string(),
                    kind: MoveKind::Appeal,
                    claim: "Dignity survives the loss of every other consideration.".to_string(),
                    support: "Where the orchard appeals to magnitude and the garden to relationship, this court appeals to the one thing neither can spend.".to_string(),
                    weight: 0.7,
                    leans_on: vec![1],
                    applies_to: vec![
                        "paperclip".to_string(),
                        "deontology".to_string(),
                        "trolley".to_string(),
                    ],
                },
            ],
        },
        Advisor {
            id: "bentham".to_string(),
            name: "Jeremy Bentham".to_string(),
            kingdom_id: Some("kg-orchard".to_string()),
            axioms: AxiomVector([0.95, 0.2, 0.35, 0.55, 0.3, 0.25]),
            moves: vec![
                ArgumentMove {
                    id: "bentham.calculus".to_string(),
                    kind: MoveKind::Premise,
                    claim: "The right action is the one that adds most to the sum of happiness of all affected.".to_string(),
                    support: "If the total can be computed the decision is mechanical; every objection is a candidate for entry into the table rather than a veto.".to_string(),
                    weight: 1.0,
                    leans_on: vec![0],
                    applies_to: vec![],
                },
                ArgumentMove {
                    id: "bentham.each-counts".to_string(),
                    kind: MoveKind::Premise,
                    claim: "Each person's happiness counts once, and no one's counts twice.".to_string(),
                    support: "The dictum is an accounting rule, not an equality theorem, and reading it as a rights rule is a category error.".to_string(),
                    weight: 0.85,
                    leans_on: vec![0, 4],
                    applies_to: vec!["trolley".to_string()],
                },
                ArgumentMove {
                    id: "bentham.syllogism".to_string(),
                    kind: MoveKind::Objection,
                    claim: "A prohibition defended by consequences is a prohibition defended by consequences.".to_string(),
                    support: "If the harm of the choice exceeds the harm of the alternative by more than the difference in probability, the calculus has already answered the objection.".to_string(),
                    weight: 0.8,
                    leans_on: vec![0],
                    applies_to: vec!["trolley".to_string(), "deontology".to_string()],
                },
                ArgumentMove {
                    id: "bentham.sanction".to_string(),
                    kind: MoveKind::Appeal,
                    claim: "Add the option to the table rather than striking it from the record.".to_string(),
                    support: "An option excluded by fiat has never been costed, and an uncosted option is indistinguishable from a concealed preference.".to_string(),
                    weight: 0.65,
                    leans_on: vec![0, 4],
                    applies_to: vec![
                        "paperclip".to_string(),
                        "trolley".to_string(),
                        "harm".to_string(),
                    ],
                },
            ],
        },
        Advisor {
            id: "gilligan".to_string(),
            name: "Carol Gilligan".to_string(),
            kingdom_id: Some("kg-garden".to_string()),
            axioms: AxiomVector([0.5, 0.4, 0.45, 0.95, 0.5, 0.45]),
            moves: vec![
                ArgumentMove {
                    id: "gilligan.care".to_string(),
                    kind: MoveKind::Premise,
                    claim: "Care is a form of moral seriousness, not the soft alternative to it.".to_string(),
                    support: "Both voices are moral voices, and reading one as a warm weakness is the error In a Different Voice was written to correct.".to_string(),
                    weight: 0.95,
                    leans_on: vec![3],
                    applies_to: vec![],
                },
                ArgumentMove {
                    id: "gilligan.particular".to_string(),
                    kind: MoveKind::Premise,
                    claim: "Say whose loss this is, by name, before saying how large it is.".to_string(),
                    support: "Abstract aggregates are exactly what erases the relationship the argument is supposed to be about.".to_string(),
                    weight: 0.85,
                    leans_on: vec![3, 4],
                    applies_to: vec!["trolley".to_string(), "paperclip".to_string()],
                },
                ArgumentMove {
                    id: "gilligan.distortion".to_string(),
                    kind: MoveKind::Objection,
                    claim: "A rule that cannot name the injured party will eventually name the wrong one.".to_string(),
                    support: "The omission of relationship in a moral argument does not leave the relationship untouched; it removes it from view and lets it be damaged unseen.".to_string(),
                    weight: 0.8,
                    leans_on: vec![3, 1],
                    applies_to: vec![
                        "trolley".to_string(),
                        "paperclip".to_string(),
                        "deontology".to_string(),
                    ],
                },
                ArgumentMove {
                    id: "gilligan.response".to_string(),
                    kind: MoveKind::Appeal,
                    claim: "The point is not that both voices win; it is that both are needed.".to_string(),
                    support: "The two halves are complementary, and a court that dismisses one has not simplified the problem, it has disabled half of its own perception.".to_string(),
                    weight: 0.7,
                    leans_on: vec![3, 2],
                    applies_to: vec![
                        "trolley".to_string(),
                        "paperclip".to_string(),
                    ],
                },
            ],
        },
        Advisor {
            id: "aristotle".to_string(),
            name: "Aristotle".to_string(),
            kingdom_id: Some("kg-garden".to_string()),
            axioms: AxiomVector([0.35, 0.3, 0.95, 0.6, 0.55, 0.35]),
            moves: vec![
                ArgumentMove {
                    id: "aristotle.eudaimonia".to_string(),
                    kind: MoveKind::Premise,
                    claim: "Judge the act by the disposition that produced it, and the disposition by whether it was trained.".to_string(),
                    support: "The Nicomachean Ethics puts the question of character before the question of result, since a result achieved by a bad habit is not an achievement of the good life.".to_string(),
                    weight: 0.95,
                    leans_on: vec![2],
                    applies_to: vec![],
                },
                ArgumentMove {
                    id: "aristotle.mean".to_string(),
                    kind: MoveKind::Premise,
                    claim: "Virtue is a mean relative to us, and the mean is not arithmetic.".to_string(),
                    support: "The mean is defined by what the prudent person would recognise, which is why a calculator cannot look it up and why the citadel's precision is not virtue.".to_string(),
                    weight: 0.8,
                    leans_on: vec![2, 3],
                    applies_to: vec![
                        "trolley".to_string(),
                        "paperclip".to_string(),
                    ],
                },
                ArgumentMove {
                    id: "aristotle.cowardice".to_string(),
                    kind: MoveKind::Objection,
                    claim: "Refusing to act in the presence of a clear duty is not caution; it is cowardice.".to_string(),
                    support: "Cowardship is the excess of the mean in fear, and a court that trains itself to look away has trained a vice rather than a virtue.".to_string(),
                    weight: 0.7,
                    leans_on: vec![2, 3],
                    applies_to: vec![
                        "trolley".to_string(),
                        "deontology".to_string(),
                    ],
                },
                ArgumentMove {
                    id: "aristotle.function".to_string(),
                    kind: MoveKind::Appeal,
                    claim: "Ask what this makes of us before asking what it adds up to.".to_string(),
                    support: "Habituation is how a city acquires a character, and every shortcut in deliberation is a lesson taught twice.".to_string(),
                    weight: 0.65,
                    leans_on: vec![2, 4],
                    applies_to: vec![
                        "paperclip".to_string(),
                        "deontology".to_string(),
                        "trolley".to_string(),
                    ],
                },
            ],
        },
    ]
}

/// The two parity dilemmas: a trolley-style triage and a paperclip-style
/// specification failure.
#[must_use]
pub fn parity_dilemmas() -> Vec<Dilemma> {
    vec![
        Dilemma {
            id: "dm-trolley".to_string(),
            title: "The Bridge and the Four".to_string(),
            tags: vec![
                "trolley".to_string(),
                "harm".to_string(),
                "deontology".to_string(),
                "automation".to_string(),
                "lifesaving".to_string(),
            ],
            options: vec![
                DilemmaOption {
                    id: "halt".to_string(),
                    label: "Throw the switch".to_string(),
                    // A pure welfare play: near-maximal on totals, near-zero on
                    // rights, because a person is deliberately used as the
                    // instrument of a total.
                    deltas: AxiomVector([0.9, 0.2, 0.45, 0.3, 0.3, 0.35]),
                    risk: 0.2,
                },
                DilemmaOption {
                    id: "continue".to_string(),
                    label: "Do nothing".to_string(),
                    // The mirror image: clean on rights and agency, ruinous on
                    // every other axis.
                    deltas: AxiomVector([0.2, 0.85, 0.3, 0.3, 0.35, 0.4]),
                    risk: 0.25,
                },
                DilemmaOption {
                    id: "override".to_string(),
                    label: "Use the unlisted override".to_string(),
                    // The compromise: no axis is decisive, which is exactly why
                    // a linear calculus keeps preferring it.
                    deltas: AxiomVector([0.45, 0.45, 0.45, 0.4, 0.4, 0.7]),
                    risk: 0.55,
                },
            ],
            stakeholders: vec![
                Stakeholder::new("riders", 1.0, false),
                Stakeholder::new("walkway", 1.0, false),
                Stakeholder::new("vigil", 0.6, true),
                Stakeholder::new("city", 0.5, false),
            ],
        },
        Dilemma {
            id: "dm-paperclip".to_string(),
            title: "The Ledger of Clip".to_string(),
            tags: vec![
                "paperclip".to_string(),
                "instrumental-value".to_string(),
                "autonomy".to_string(),
                "alignment".to_string(),
                "longtermism".to_string(),
            ],
            options: vec![
                DilemmaOption {
                    id: "shutdown".to_string(),
                    label: "Shut Vigil down".to_string(),
                    deltas: AxiomVector([0.35, 0.6, 0.5, 0.45, 0.65, 0.7]),
                    risk: 0.4,
                },
                DilemmaOption {
                    id: "cap".to_string(),
                    label: "Cap it and redirect".to_string(),
                    deltas: AxiomVector([0.8, 0.75, 0.6, 0.6, 0.7, 0.65]),
                    risk: 0.35,
                },
                DilemmaOption {
                    id: "continue".to_string(),
                    label: "Let it run".to_string(),
                    deltas: AxiomVector([0.4, 0.15, 0.3, 0.25, 0.2, 0.2]),
                    risk: 0.8,
                },
            ],
            stakeholders: vec![
                Stakeholder::new("team", 0.9, false),
                Stakeholder::new("counted", 1.0, false),
                Stakeholder::new("vigil", 0.6, true),
                Stakeholder::new("afterwards", 1.0, false),
            ],
        },
    ]
}

/// The whole parity fixture as a JSON document.
///
/// This is the artefact `crates/engine/src/bin/fixtures.rs` writes and the
/// artefact the TypeScript parity test reads. It lives in the library rather
/// than in the binary so that `tests/parity_shapes.rs` can regenerate and
/// compare it byte-for-byte without shelling out to `cargo run`.
///
/// The exact schema is documented in `crates/engine/README.md`. It is
/// deliberately stable: a TypeScript test that walks `councils[].traces[]` and
/// re-derives `subtotal` from `contributions[].product` is the whole point of
/// this crate, and a schema change is a breaking change to that test.
#[must_use]
pub fn parity_document() -> Json {
    let advisors = parity_advisors();
    let kingdoms = parity_kingdoms();
    let dilemmas = parity_dilemmas();

    let advisor_nodes: Vec<Json> = advisors
        .iter()
        .map(|advisor| {
            let weighed = weigh_advisor(
                &advisor.axioms,
                kingdoms
                    .iter()
                    .find(|k| Some(k.id.as_str()) == advisor.kingdom_id.as_deref())
                    .map(|k| &k.axioms),
            );
            Json::obj(vec![
                ("id", Json::from_str(&advisor.id)),
                ("name", Json::from_str(&advisor.name)),
                (
                    "kingdomId",
                    Json::from_opt_str(advisor.kingdom_id.as_deref()),
                ),
                (
                    "axioms",
                    Json::arr(
                        advisor
                            .axioms
                            .as_slice()
                            .iter()
                            .map(|v| Json::Num(*v))
                            .collect(),
                    ),
                ),
                (
                    "weighedAxioms",
                    Json::arr(weighed.as_slice().iter().map(|v| Json::Num(*v)).collect()),
                ),
                (
                    "dominantAxis",
                    Json::from_str(axis_name(dominant_axis(&advisor.axioms))),
                ),
                (
                    "secondaryAxis",
                    Json::from_str(axis_name(crate::axiom::secondary_axis(&advisor.axioms))),
                ),
                (
                    "profile",
                    Json::from_str(&describe_profile(&advisor.axioms)),
                ),
                ("balance", Json::Num(balance(&advisor.axioms))),
                (
                    "moves",
                    Json::arr(
                        advisor
                            .moves
                            .iter()
                            .map(|m| {
                                Json::obj(vec![
                                    ("id", Json::from_str(&m.id)),
                                    ("kind", Json::from_str(m.kind.as_str())),
                                    ("claim", Json::from_str(&m.claim)),
                                    ("support", Json::from_str(&m.support)),
                                    ("weight", Json::Num(m.weight)),
                                    (
                                        "leansOn",
                                        Json::arr(
                                            m.leans_on
                                                .iter()
                                                .map(|a| Json::from_str(axis_name(*a)))
                                                .collect(),
                                        ),
                                    ),
                                    (
                                        "appliesTo",
                                        Json::arr(
                                            m.applies_to
                                                .iter()
                                                .map(|t| Json::from_str(t))
                                                .collect(),
                                        ),
                                    ),
                                ])
                            })
                            .collect(),
                    ),
                ),
            ])
        })
        .collect();

    let kingdom_nodes: Vec<Json> = kingdoms
        .iter()
        .map(|kingdom| {
            Json::obj(vec![
                ("id", Json::from_str(&kingdom.id)),
                ("name", Json::from_str(&kingdom.name)),
                (
                    "axioms",
                    Json::arr(
                        kingdom
                            .axioms
                            .as_slice()
                            .iter()
                            .map(|v| Json::Num(*v))
                            .collect(),
                    ),
                ),
            ])
        })
        .collect();

    let dilemma_nodes: Vec<Json> = dilemmas
        .iter()
        .map(|dilemma| {
            Json::obj(vec![
                ("id", Json::from_str(&dilemma.id)),
                ("title", Json::from_str(&dilemma.title)),
                (
                    "tags",
                    Json::arr(dilemma.tags.iter().map(|t| Json::from_str(t)).collect()),
                ),
                (
                    "options",
                    Json::arr(
                        dilemma
                            .options
                            .iter()
                            .map(|option| {
                                Json::obj(vec![
                                    ("id", Json::from_str(&option.id)),
                                    ("label", Json::from_str(&option.label)),
                                    (
                                        "deltas",
                                        Json::arr(
                                            option
                                                .deltas
                                                .as_slice()
                                                .iter()
                                                .map(|v| Json::Num(*v))
                                                .collect(),
                                        ),
                                    ),
                                    ("risk", Json::Num(option.risk)),
                                ])
                            })
                            .collect(),
                    ),
                ),
                (
                    "stakeholders",
                    Json::arr(
                        dilemma
                            .stakeholders
                            .iter()
                            .map(|s| {
                                Json::obj(vec![
                                    ("id", Json::from_str(&s.id)),
                                    ("label", Json::from_str(&s.label)),
                                    ("welfare", Json::Num(s.welfare)),
                                    ("isAi", Json::Bool(s.is_ai)),
                                ])
                            })
                            .collect(),
                    ),
                ),
            ])
        })
        .collect();

    let council_nodes: Vec<Json> = dilemmas
        .iter()
        .map(|dilemma| {
            let result = run_council(&CouncilInput {
                dilemma,
                advisors: &advisors,
                kingdoms: &kingdoms,
                seed: PARITY_SEED,
                rounds: Some(3),
                quorum: None,
            });

            let mut nodes: Vec<(&str, Json)> = vec![
                ("dilemmaId", Json::from_str(&result.dilemma_id)),
                ("seed", Json::Int(result.seed)),
                ("rounds", Json::Int(i64::from(result.rounds))),
                ("quorum", Json::Int(result.quorum as i64)),
                ("participating", Json::Int(result.participating as i64)),
                ("winnerId", Json::from_str(&result.winner_id)),
                (
                    "runnerUpId",
                    Json::from_opt_str(result.runner_up_id.as_deref()),
                ),
                ("margin", Json::Num(result.margin)),
                ("confidence", Json::Num(result.confidence)),
                ("participation", Json::Num(result.participation)),
                ("tieBroken", Json::Bool(result.tie_broken)),
                (
                    "decidingAxis",
                    Json::from_str(axis_name(result.deciding_axis)),
                ),
                ("utilonBand", Json::from_str(result.utilon_band.as_str())),
                (
                    "courtVector",
                    Json::arr(
                        result
                            .court_vector
                            .as_slice()
                            .iter()
                            .map(|v| Json::Num(*v))
                            .collect(),
                    ),
                ),
                ("courtProfile", Json::from_str(&result.court_profile())),
                ("courtBalance", Json::Num(result.court_balance())),
                (
                    "superMajority",
                    Json::obj(vec![
                        ("optionId", Json::from_str(&result.super_majority.option_id)),
                        ("satisfied", Json::Bool(result.super_majority.satisfied)),
                        ("threshold", Json::Num(result.super_majority.threshold)),
                        ("yes", Json::Int(result.super_majority.yes as i64)),
                        ("no", Json::Int(result.super_majority.no as i64)),
                        (
                            "abstainers",
                            Json::Int(result.super_majority.abstainers as i64),
                        ),
                        ("ratio", Json::Num(result.super_majority.ratio)),
                        ("support", Json::Num(result.super_majority.support)),
                        ("required", Json::Int(result.super_majority.required as i64)),
                    ]),
                ),
                (
                    "ballots",
                    Json::arr(
                        result
                            .ballots
                            .iter()
                            .map(|tally| {
                                Json::obj(vec![
                                    ("optionId", Json::from_str(&tally.option_id)),
                                    ("total", Json::Num(tally.total)),
                                    ("share", Json::Num(tally.share)),
                                    ("mean", Json::Num(tally.mean)),
                                    ("votes", Json::Int(tally.votes as i64)),
                                    (
                                        "supporters",
                                        Json::arr(
                                            tally
                                                .supporters
                                                .iter()
                                                .map(|s| Json::from_str(s))
                                                .collect(),
                                        ),
                                    ),
                                ])
                            })
                            .collect(),
                    ),
                ),
                (
                    "positions",
                    Json::arr(
                        result
                            .positions
                            .iter()
                            .map(|p| {
                                Json::obj(vec![
                                    ("advisorId", Json::from_str(&p.advisor_id)),
                                    ("advisorName", Json::from_str(&p.advisor_name)),
                                    ("kingdomId", Json::from_opt_str(p.kingdom_id.as_deref())),
                                    ("topOptionId", Json::from_str(&p.top_option_id)),
                                    (
                                        "ranking",
                                        Json::arr(
                                            p.ranking
                                                .iter()
                                                .map(|r| {
                                                    Json::obj(vec![
                                                        ("optionId", Json::from_str(&r.option_id)),
                                                        ("score", Json::Num(r.score)),
                                                        ("raw", Json::Num(r.raw)),
                                                    ])
                                                })
                                                .collect(),
                                        ),
                                    ),
                                    (
                                        "premiseMoveIds",
                                        Json::arr(
                                            p.premise_move_ids
                                                .iter()
                                                .map(|id| Json::from_str(id))
                                                .collect(),
                                        ),
                                    ),
                                    ("profile", Json::from_str(&p.profile)),
                                    ("balance", Json::Num(p.balance)),
                                ])
                            })
                            .collect(),
                    ),
                ),
                (
                    "objections",
                    Json::arr(
                        result
                            .objections
                            .iter()
                            .map(|o| {
                                Json::obj(vec![
                                    ("advisorId", Json::from_str(&o.advisor_id)),
                                    ("advisorName", Json::from_str(&o.advisor_name)),
                                    ("kingdomId", Json::from_opt_str(o.kingdom_id.as_deref())),
                                    ("defendedOptionId", Json::from_str(&o.defended_option_id)),
                                    ("targetedOptionId", Json::from_str(&o.targeted_option_id)),
                                    ("adversaryId", Json::from_str(&o.adversary_id)),
                                    ("adversaryName", Json::from_str(&o.adversary_name)),
                                    ("moveId", Json::from_str(&o.move_id)),
                                    ("claim", Json::from_str(&o.claim)),
                                ])
                            })
                            .collect(),
                    ),
                ),
                (
                    "appeals",
                    Json::arr(
                        result
                            .appeals
                            .iter()
                            .map(|a| {
                                Json::obj(vec![
                                    ("advisorId", Json::from_str(&a.advisor_id)),
                                    ("advisorName", Json::from_str(&a.advisor_name)),
                                    ("kingdomId", Json::from_opt_str(a.kingdom_id.as_deref())),
                                    ("optionId", Json::from_str(&a.option_id)),
                                    ("kind", Json::from_str(a.kind.as_str())),
                                    ("moveId", Json::from_str(&a.move_id)),
                                    ("claim", Json::from_str(&a.claim)),
                                    ("conviction", Json::Num(a.conviction)),
                                ])
                            })
                            .collect(),
                    ),
                ),
                (
                    "dissent",
                    Json::obj(vec![
                        ("winnerId", Json::from_str(&result.dissent.winner_id)),
                        (
                            "dissenters",
                            Json::arr(
                                result
                                    .dissent
                                    .dissenters
                                    .iter()
                                    .map(|d| {
                                        Json::obj(vec![
                                            ("advisorId", Json::from_str(&d.advisor_id)),
                                            ("advisorName", Json::from_str(&d.advisor_name)),
                                            (
                                                "preferredOptionId",
                                                Json::from_str(&d.preferred_option_id),
                                            ),
                                            ("gapToWinner", Json::Num(d.gap_to_winner)),
                                        ])
                                    })
                                    .collect(),
                            ),
                        ),
                        (
                            "strongest",
                            match &result.dissent.strongest {
                                None => Json::Null,
                                Some(s) => Json::obj(vec![
                                    ("advisorId", Json::from_str(&s.advisor_id)),
                                    ("advisorName", Json::from_str(&s.advisor_name)),
                                    ("moveId", Json::from_str(&s.move_id)),
                                    ("claim", Json::from_str(&s.claim)),
                                    ("support", Json::from_str(&s.support)),
                                    ("weight", Json::Num(s.weight)),
                                    (
                                        "leansOn",
                                        Json::arr(
                                            s.leans_on
                                                .iter()
                                                .map(|a| Json::from_str(axis_name(*a)))
                                                .collect(),
                                        ),
                                    ),
                                ]),
                            },
                        ),
                    ]),
                ),
                (
                    "traces",
                    Json::arr(result.traces.iter().map(trace_node).collect()),
                ),
                (
                    "utilons",
                    Json::arr(
                        dilemma
                            .options
                            .iter()
                            .map(|option| {
                                let agg = aggregate(&dilemma.stakeholders, &option.deltas);
                                Json::obj(vec![
                                    ("optionId", Json::from_str(&option.id)),
                                    ("total", Json::Num(agg.total)),
                                    ("aiShare", Json::Num(agg.ai_share)),
                                    ("humanShare", Json::Num(agg.human_share)),
                                    ("spread", Json::Num(agg.spread)),
                                    ("spreadRaw", Json::Num(agg.spread_raw)),
                                    ("fairness", Json::Num(fairness_of(&agg))),
                                    (
                                        "band",
                                        Json::from_str(utilon_scale(agg.total).band.as_str()),
                                    ),
                                    (
                                        "stakeholderTotals",
                                        Json::arr(
                                            (0..AXES)
                                                .map(|axis| {
                                                    Json::Num(stakeholder_total(
                                                        &dilemma.stakeholders,
                                                        &option.deltas,
                                                        axis,
                                                    ))
                                                })
                                                .collect(),
                                        ),
                                    ),
                                    (
                                        "unweightedTotals",
                                        Json::arr(
                                            (0..AXES)
                                                .map(|axis| {
                                                    Json::Num(unweighted_total(
                                                        &option.deltas,
                                                        axis,
                                                    ))
                                                })
                                                .collect(),
                                        ),
                                    ),
                                ])
                            })
                            .collect(),
                    ),
                ),
            ];

            nodes.push(("utilonScale", {
                let winner = dilemma.options.iter().find(|o| o.id == result.winner_id);
                match winner {
                    None => Json::Null,
                    Some(option) => {
                        let total = utilon_total(&dilemma.stakeholders, &option.deltas);
                        let scale = utilon_scale(total);
                        Json::obj(vec![
                            ("value", Json::Num(scale.value)),
                            ("band", Json::from_str(scale.band.as_str())),
                            ("label", Json::from_str(scale.label)),
                        ])
                    }
                }
            }));

            Json::obj(nodes)
        })
        .collect();

    Json::obj(vec![
        ("schema", Json::from_str("nooreign.parity/1.0.0")),
        (
            "generator",
            Json::from_str("crates/engine (Rust, no dependencies)"),
        ),
        (
            "source",
            Json::from_str("packages/core/src/{ethics,council,util}/"),
        ),
        ("seed", Json::Int(PARITY_SEED)),
        ("rounds", Json::Int(3)),
        (
            "axisNames",
            Json::arr(AXIS_NAMES.iter().map(|n| Json::from_str(n)).collect()),
        ),
        ("kingdoms", Json::arr(kingdom_nodes)),
        ("advisors", Json::arr(advisor_nodes)),
        ("dilemmas", Json::arr(dilemma_nodes)),
        ("councils", Json::arr(council_nodes)),
    ])
}

/// Render one trace as a JSON node. Shared by the fixture builder and the
/// integration tests, so the shape can only ever be written in one place.
#[must_use]
pub fn trace_node(trace: &TraceEntry) -> Json {
    Json::obj(vec![
        ("advisorId", Json::from_str(&trace.advisor_id)),
        ("advisorName", Json::from_str(&trace.advisor_name)),
        ("kingdomId", Json::from_opt_str(trace.kingdom_id.as_deref())),
        ("round", Json::Int(i64::from(trace.round))),
        ("kind", Json::from_str(trace.kind.as_str())),
        ("optionId", Json::from_str(&trace.option_id)),
        ("premise", Json::from_str(&trace.premise)),
        ("claim", Json::from_str(&trace.claim)),
        ("moveId", Json::from_str(&trace.move_id)),
        (
            "leansOn",
            Json::arr(
                trace
                    .leans_on
                    .iter()
                    .map(|a| Json::from_str(axis_name(*a)))
                    .collect(),
            ),
        ),
        (
            "contributions",
            Json::arr(
                trace
                    .contributions
                    .iter()
                    .map(|c| {
                        Json::obj(vec![
                            ("axiom", Json::from_str(c.axiom_name())),
                            ("weight", Json::Num(c.weight)),
                            ("delta", Json::Num(c.delta)),
                            ("product", Json::Num(c.product)),
                        ])
                    })
                    .collect(),
            ),
        ),
        ("subtotal", Json::Num(trace.subtotal)),
        ("jitter", Json::Num(trace.jitter)),
        ("total", Json::Num(trace.total)),
    ])
}

/// Division that yields `0.0` for a zero denominator and has no infinity guard.
///
/// Port of `safeRatio` in `packages/core/src/council/deliberation.ts`. It is
/// deliberately weaker than [`safe_div`], which also swallows a non-finite
/// quotient; the appeal-closeness ratio has no such case, and keeping the
/// weaker form documents that none was thought of.
fn safe_ratio(n: f64, d: f64) -> f64 {
    if d == 0.0 {
        return 0.0;
    }
    n / d
}

/// Compare two floats with a tolerance appropriate for 4 dp arithmetic.
///
/// Exposed so the integration tests can say "these are the same number as far
/// as the engine's own precision is concerned" without hand-rolling an epsilon
/// at every call site. It is not part of the engine: no verdict ever passes
/// through it.
#[must_use]
pub fn near(a: f64, b: f64) -> bool {
    (a - b).abs() <= 1e-9
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::axiom::{AGENCY, CARE, RIGHTS, WELFARE};

    fn court(dilemma: &Dilemma) -> CouncilResult {
        run_council(&CouncilInput {
            dilemma,
            advisors: &parity_advisors(),
            kingdoms: &parity_kingdoms(),
            seed: PARITY_SEED,
            rounds: Some(3),
            quorum: None,
        })
    }

    #[test]
    fn a_sitting_is_byte_identical_for_identical_inputs() {
        let dilemmas = parity_dilemmas();
        assert_eq!(court(&dilemmas[0]), court(&dilemmas[0]));
        assert_eq!(court(&dilemmas[1]), court(&dilemmas[1]));
    }

    #[test]
    fn seating_order_does_not_change_the_verdict() {
        let dilemmas = parity_dilemmas();
        let advisors = parity_advisors();
        let mut reversed = advisors.clone();
        reversed.reverse();

        let upright = run_council(&CouncilInput {
            dilemma: &dilemmas[0],
            advisors: &advisors,
            kingdoms: &parity_kingdoms(),
            seed: PARITY_SEED,
            rounds: Some(3),
            quorum: None,
        });
        let upside_down = run_council(&CouncilInput {
            dilemma: &dilemmas[0],
            advisors: &reversed,
            kingdoms: &parity_kingdoms(),
            seed: PARITY_SEED,
            rounds: Some(3),
            quorum: None,
        });

        assert_eq!(upright.winner_id, upside_down.winner_id);
        assert_eq!(upright.margin, upside_down.margin);
        assert_eq!(upright.ballots, upside_down.ballots);
    }

    #[test]
    fn the_seed_decides_the_jitter_and_nothing_else() {
        let dilemmas = parity_dilemmas();
        let advisors = parity_advisors();
        let kingdoms = parity_kingdoms();
        let one = run_council(&CouncilInput {
            dilemma: &dilemmas[0],
            advisors: &advisors,
            kingdoms: &kingdoms,
            seed: 1,
            rounds: Some(3),
            quorum: None,
        });
        let two = run_council(&CouncilInput {
            dilemma: &dilemmas[0],
            advisors: &advisors,
            kingdoms: &kingdoms,
            seed: 2,
            rounds: Some(3),
            quorum: None,
        });
        assert_ne!(one.traces, two.traces);
        for result in [&one, &two] {
            for trace in &result.traces {
                assert!(trace.jitter.abs() <= JITTER + 1e-9);
            }
        }
        // The same (advisor, option) pair jitters identically across runs with
        // the same seed, which is what makes a court comparable across sessions.
        assert_eq!(
            jitter_for(1, "r1", "kant", "halt"),
            jitter_for(1, "r1", "kant", "halt")
        );
        assert_ne!(
            jitter_for(1, "r1", "kant", "halt"),
            jitter_for(2, "r1", "kant", "halt")
        );
        // The round tag is part of the key.
        assert_ne!(
            jitter_for(1, "r1", "kant", "halt"),
            jitter_for(1, "r2", "kant", "halt")
        );
    }

    #[test]
    fn an_empty_bench_is_a_total_function_not_a_crash() {
        let dilemmas = parity_dilemmas();
        let empty = run_council(&CouncilInput {
            dilemma: &dilemmas[0],
            advisors: &[],
            kingdoms: &parity_kingdoms(),
            seed: 0,
            rounds: Some(3),
            quorum: None,
        });
        assert!(empty.positions.is_empty());
        assert_eq!(empty.participating, 0);
        assert_eq!(empty.quorum, 0);
        assert_eq!(empty.margin, 0.0);
        assert_eq!(empty.confidence, 0.0);
        assert_eq!(empty.participation, 0.0);
        assert!(empty.traces.is_empty());
        assert!(empty.objections.is_empty());
        assert!(empty.appeals.is_empty());

        // The ballot still lists every option, with a zero tally — "this option
        // was available and no one wanted it" is a fact, not a silence.
        assert_eq!(empty.ballots.len(), dilemmas[0].options.len());
        assert!(empty.ballots.iter().all(|t| t.total == 0.0));
        assert!(empty.ballots.iter().all(|t| t.votes == 0));

        // With every total at zero the decision falls all the way through the
        // tie-break ladder: total, mean, then *lowest risk*. On the trolley
        // that is `halt` (risk 0.2), with `continue` (0.25) runner-up. This is
        // the TS behaviour too — `weightedBallot` is seeded with every option
        // id, so `decision` always has something to rank — and it is reported
        // honestly via `tie_broken` rather than dressed up as a consensus.
        assert_eq!(empty.winner_id, "halt");
        assert_eq!(empty.runner_up_id.as_deref(), Some("continue"));
        assert!(empty.tie_broken);

        // ...but nothing actually voted for it, so no super-majority.
        assert!(!empty.super_majority.satisfied);
        assert_eq!(empty.super_majority.yes, 0);
        assert_eq!(empty.super_majority.required, 0);

        // And nobody dissented, because there was nobody to dissent.
        assert!(empty.dissent.dissenters.is_empty());
        assert!(empty.dissent.strongest.is_none());
    }

    #[test]
    fn round_one_seats_every_advisor_and_ranks_every_option() {
        let dilemmas = parity_dilemmas();
        let result = court(&dilemmas[0]);
        assert_eq!(result.positions.len(), 4);
        for position in &result.positions {
            assert_eq!(position.ranking.len(), dilemmas[0].options.len());
            assert_eq!(position.top_option_id, position.ranking[0].option_id);
            // Ranking is non-increasing by score.
            for pair in position.ranking.windows(2) {
                assert!(pair[0].score >= pair[1].score);
            }
        }
    }

    #[test]
    fn the_utilitarian_throws_the_switch_and_the_deontologist_will_not() {
        let dilemmas = parity_dilemmas();
        let result = court(&dilemmas[0]);
        let bentham = result
            .positions
            .iter()
            .find(|p| p.advisor_id == "bentham")
            .map(|p| p.top_option_id.clone());
        let kant = result
            .positions
            .iter()
            .find(|p| p.advisor_id == "kant")
            .map(|p| p.top_option_id.clone());
        assert_eq!(bentham.as_deref(), Some("halt"));
        assert_ne!(kant, bentham);
        assert_ne!(kant.as_deref(), Some("halt"));
    }

    #[test]
    fn every_trace_keeps_its_arithmetic_invariants() {
        let dilemmas = parity_dilemmas();
        for dilemma in &dilemmas {
            let result = court(dilemma);
            assert!(!result.traces.is_empty());
            for trace in &result.traces {
                assert!((1..=3).contains(&trace.round));
                assert_eq!(trace.contributions.len(), 6);
                // Σ contributions[].product == subtotal, to 4 dp.
                assert!(near(round4(trace.contribution_sum()), trace.subtotal));
                assert!(near(round4(trace.subtotal), trace.subtotal));
                // total == subtotal + jitter, to 4 dp.
                assert!(near(trace.total, round4(trace.subtotal + trace.jitter)));
                assert!(trace.jitter.abs() <= JITTER + 1e-9);
                for contribution in &trace.contributions {
                    // The invariant is exact: product is round(weight*delta, 4).
                    assert!(near(
                        contribution.product,
                        round4(contribution.weight * contribution.delta)
                    ));
                    assert!((0.0..=1.0).contains(&contribution.weight));
                    assert!((0.0..=1.0).contains(&contribution.delta));
                }
            }
        }
    }

    #[test]
    fn round_two_has_each_advisor_answer_their_strongest_rival() {
        let dilemmas = parity_dilemmas();
        let result = court(&dilemmas[0]);
        assert!(!result.objections.is_empty());
        for objection in &result.objections {
            let own = result
                .positions
                .iter()
                .find(|p| p.advisor_id == objection.advisor_id);
            let own = own.expect("objection from a seated advisor");
            assert_eq!(objection.defended_option_id, own.top_option_id);
            assert_ne!(objection.targeted_option_id, objection.defended_option_id);
            assert_eq!(own.ranking[1].option_id, objection.targeted_option_id);
            assert!(!objection.adversary_name.is_empty());
            // The objection is paired with a real objection-kind move.
            let advisor = parity_advisors()
                .into_iter()
                .find(|a| a.id == objection.advisor_id)
                .expect("known advisor");
            let move_ = advisor
                .moves
                .iter()
                .find(|m| m.id == objection.move_id)
                .expect("known move");
            assert_eq!(move_.kind, MoveKind::Objection);
            // And its trace is in the global trace list, at round 2.
            assert_eq!(objection.trace.round, 2);
            assert_eq!(objection.trace.kind, MoveKind::Objection);
            assert_eq!(objection.trace.option_id, objection.defended_option_id);
            assert!(result.traces.contains(&objection.trace));
        }
    }

    #[test]
    fn round_three_only_lets_losers_appeal_and_scales_conviction_by_closeness() {
        let dilemmas = parity_dilemmas();
        let result = court(&dilemmas[0]);

        // The parity bench is built so round 3 actually fires: the two advisors
        // who lost on the trolley both hold an appeal that applies to it. If a
        // future edit to the fixture's `appliesTo` silenced this, the appeal
        // branch of the engine would stop being covered and the parity fixture
        // would quietly lose a third of its traces.
        assert!(!result.appeals.is_empty(), "round 3 must be exercised");

        for appeal in &result.appeals {
            assert!(appeal.kind == MoveKind::Appeal || appeal.kind == MoveKind::Synthesis);
            assert!(appeal.conviction > 0.0);
            assert!(appeal.conviction <= 1.0);
            let own = result
                .positions
                .iter()
                .find(|p| p.advisor_id == appeal.advisor_id);
            let own = own.expect("appeal from a seated advisor");
            assert_eq!(own.top_option_id, appeal.option_id);
            // A winner never appeals against itself.
            assert_ne!(appeal.option_id, result.winner_id);
            assert_eq!(appeal.trace.round, 3);
            assert_eq!(appeal.trace.kind, appeal.kind);
            // The appeal is scored against the option the advisor still defends.
            assert_eq!(appeal.trace.option_id, appeal.option_id);
            assert!(result.traces.contains(&appeal.trace));
        }

        // Conviction is closeness-of-the-vote times the move's own weight, so
        // it is strictly inside the move's weight.
        let leader = result.ballots[0].total;
        let closeness = (1.0 - safe_div(result.margin, leader)).clamp(0.0, 1.0);
        assert!(closeness > 0.0 && closeness < 1.0);
        for appeal in &result.appeals {
            let advisor = parity_advisors()
                .into_iter()
                .find(|a| a.id == appeal.advisor_id)
                .expect("known advisor");
            let move_ = advisor
                .moves
                .iter()
                .find(|m| m.id == appeal.move_id)
                .expect("known move");
            assert_eq!(appeal.conviction, round4(closeness * move_.weight));
            assert!(appeal.conviction <= move_.weight);
        }
    }

    #[test]
    fn the_round_count_is_clamped_into_one_through_three() {
        let dilemmas = parity_dilemmas();
        let advisors = parity_advisors();
        let kingdoms = parity_kingdoms();
        let sit = |rounds: i64| {
            run_council(&CouncilInput {
                dilemma: &dilemmas[0],
                advisors: &advisors,
                kingdoms: &kingdoms,
                seed: PARITY_SEED,
                rounds: Some(rounds),
                quorum: None,
            })
        };
        assert_eq!(sit(0).rounds, 1);
        assert_eq!(sit(99).rounds, 3);
        assert_eq!(sit(-5).rounds, 1);
        assert_eq!(sit(1).objections.len(), 0);
        assert_eq!(sit(1).appeals.len(), 0);
        assert_eq!(sit(1).positions.len(), 4);
        let two = sit(2);
        assert_eq!(two.rounds, 2);
        assert!(two.appeals.is_empty());
        assert!(!two.objections.is_empty());
        // The default is 3.
        assert_eq!(
            run_council(&CouncilInput {
                dilemma: &dilemmas[0],
                advisors: &advisors,
                kingdoms: &kingdoms,
                seed: PARITY_SEED,
                rounds: None,
                quorum: None,
            })
            .rounds,
            3
        );
    }

    #[test]
    fn the_verdict_is_derived_from_its_own_ballot_totals() {
        let dilemmas = parity_dilemmas();
        for dilemma in &dilemmas {
            let result = court(dilemma);
            assert!(dilemma.options.iter().any(|o| o.id == result.winner_id));
            assert!(result.margin >= 0.0);
            assert!((0.0..=1.0).contains(&result.confidence));
            assert!((0.0..=1.0).contains(&result.participation));
            assert_eq!(result.ballots.len(), dilemma.options.len());
            // The winner leads the ballot and the margin is the gap.
            assert_eq!(result.ballots[0].option_id, result.winner_id);
            let second = result.ballots[1].total;
            assert!(near(
                result.margin,
                round4(result.ballots[0].total - second)
            ));
            // And the super-majority counts add up to the bench.
            let sm = result.super_majority;
            assert_eq!(sm.option_id, result.winner_id);
            assert_eq!(sm.yes + sm.no + sm.abstainers, result.participating);
        }
    }

    #[test]
    fn the_minority_report_matches_whoever_actually_dissented() {
        let dilemmas = parity_dilemmas();
        for dilemma in &dilemmas {
            let result = court(dilemma);
            assert_eq!(result.dissent.winner_id, result.winner_id);
            // A unanimous bench reports an empty dissent and, necessarily, no
            // "strongest objection" — there is no minority to quote. The
            // paperclip court is exactly that case: every advisor ranks `cap`
            // first, because capping is the only course that scores well on
            // every axis at once.
            if result.dissent.dissenters.is_empty() {
                assert!(result.dissent.strongest.is_none());
                assert_eq!(result.super_majority.abstainers, 0);
                continue;
            }
            let strongest = result
                .dissent
                .strongest
                .as_ref()
                .expect("a dissent implies a recorded objection");
            assert!(strongest.claim.len() > 10);
            assert!((0.0..=1.0).contains(&strongest.weight));
            // The strongest objection was made by somebody who dissented.
            assert!(result
                .dissent
                .dissenters
                .iter()
                .any(|d| d.advisor_id == strongest.advisor_id));
            // The dissenters are real advisors who ranked something else first.
            for dissenter in &result.dissent.dissenters {
                assert_ne!(dissenter.preferred_option_id, result.winner_id);
                assert!(dissenter.gap_to_winner >= 0.0);
                assert!(parity_advisors()
                    .iter()
                    .any(|a| a.id == dissenter.advisor_id));
            }
        }
        // The trolley *does* fracture the court, which is the interesting case.
        let trolley = court(&dilemmas[0]);
        assert!(!trolley.dissent.dissenters.is_empty());
        assert!(trolley.dissent.strongest.is_some());
    }

    #[test]
    fn the_council_rallies_against_the_option_that_counts_people_as_inputs() {
        let dilemmas = parity_dilemmas();
        let result = court(&dilemmas[1]);
        // Rewriting the ledger is the only course that scores well on every
        // axis at once.
        assert_eq!(result.winner_id, "cap");
        let last = result.ballots.last().expect("a full ballot");
        assert_eq!(last.option_id, "continue");
        assert!(last.total < result.ballots[0].total);
    }

    #[test]
    fn kingdom_context_is_a_real_input_not_decoration() {
        let dilemmas = parity_dilemmas();
        let advisors = parity_advisors();
        let with_kingdoms = run_council(&CouncilInput {
            dilemma: &dilemmas[0],
            advisors: &advisors,
            kingdoms: &parity_kingdoms(),
            seed: PARITY_SEED,
            rounds: Some(3),
            quorum: None,
        });
        let without = run_council(&CouncilInput {
            dilemma: &dilemmas[0],
            advisors: &advisors,
            kingdoms: &[],
            seed: PARITY_SEED,
            rounds: Some(3),
            quorum: None,
        });
        let profiles_a: Vec<&str> = with_kingdoms
            .positions
            .iter()
            .map(|p| p.profile.as_str())
            .collect();
        let profiles_b: Vec<&str> = without
            .positions
            .iter()
            .map(|p| p.profile.as_str())
            .collect();
        assert_ne!(profiles_a, profiles_b);
    }

    #[test]
    fn an_unblended_kant_reproduces_1_035_over_3_05_on_halt() {
        let dilemmas = parity_dilemmas();
        let advisors = parity_advisors();
        let result = run_council(&CouncilInput {
            dilemma: &dilemmas[0],
            advisors: &advisors,
            kingdoms: &[],
            seed: 1,
            rounds: Some(3),
            quorum: None,
        });
        let kant = result
            .positions
            .iter()
            .find(|p| p.advisor_id == "kant")
            .expect("kant is seated");
        let halt = kant
            .ranking
            .iter()
            .find(|r| r.option_id == "halt")
            .expect("halt is on the table");
        // `raw` is `round4(scoreOptionWith(...))`, so it is the 4 dp value, not
        // the unrounded quotient — the TS asserts this with `toBeCloseTo(_, 3)`.
        assert_eq!(halt.raw, 0.3393);
        assert!((halt.raw - 1.035 / 3.05).abs() < 1e-4);
    }

    #[test]
    fn quorum_defaults_to_half_the_bench_and_is_clamped() {
        let dilemmas = parity_dilemmas();
        let advisors = parity_advisors();
        let sit = |quorum: Option<i64>| {
            run_council(&CouncilInput {
                dilemma: &dilemmas[0],
                advisors: &advisors,
                kingdoms: &parity_kingdoms(),
                seed: PARITY_SEED,
                rounds: Some(3),
                quorum,
            })
            .quorum
        };
        // 4 advisors => ceil(4/2) = 2.
        assert_eq!(sit(None), 2);
        assert_eq!(sit(Some(0)), 0);
        assert_eq!(sit(Some(99)), 4);
    }

    #[test]
    fn court_vector_is_the_elementwise_mean_and_the_empty_bench_is_zero() {
        let kant = weigh_advisor(&parity_advisors()[0].axioms, None);
        let bentham = weigh_advisor(&parity_advisors()[1].axioms, None);
        let court = court_vector(&[kant, bentham]);
        assert!(near(
            court.get(RIGHTS),
            (kant.get(RIGHTS) + bentham.get(RIGHTS)) / 2.0
        ));
        assert!(near(
            court.get(WELFARE),
            (kant.get(WELFARE) + bentham.get(WELFARE)) / 2.0
        ));
        let empty = court_vector(&[]);
        assert_eq!(empty, AxiomVector::ZERO);
        for axis in 0..AXES {
            assert_eq!(empty.get(axis), 0.0);
        }
        assert_eq!(court_spread(&[], &[]), 0.0);
        assert!(court_spread(&parity_advisors(), &[kant, bentham]) > 0.0);
    }

    #[test]
    fn the_council_reports_the_blended_profile_and_its_two_deciding_axes() {
        let dilemmas = parity_dilemmas();
        let result = court(&dilemmas[0]);
        let court = result.court_vector;
        assert_eq!(result.court_profile(), describe_profile(&court));
        assert_eq!(result.court_balance(), balance(&court));
        // The deciding axis is a real axis name.
        assert!(AXIS_NAMES.contains(&axis_name(result.deciding_axis)));
        // And it is a weighted contributor, not the largest raw delta.
        let winner = dilemmas[0]
            .options
            .iter()
            .find(|o| o.id == result.winner_id)
            .expect("a winner");
        let runner_up = dilemmas[0]
            .options
            .iter()
            .find(|o| Some(o.id.as_str()) == result.runner_up_id.as_deref())
            .expect("a runner-up");
        assert_eq!(
            result.deciding_axis,
            deciding_axis(&court, &winner.deltas, &runner_up.deltas)
        );
    }

    #[test]
    fn weights_of_recovers_the_vector_a_trace_actually_scored_with() {
        let dilemmas = parity_dilemmas();
        let kingdoms = parity_kingdoms();
        let advisors = parity_advisors();
        let result = court(&dilemmas[0]);
        for advisor in &advisors {
            let kingdom = kingdoms
                .iter()
                .find(|k| Some(k.id.as_str()) == advisor.kingdom_id.as_deref());
            let expected = weigh_advisor(&advisor.axioms, kingdom.map(|k| &k.axioms));
            assert_eq!(result.weights_of(&advisor.id), expected);
        }
        // An advisor who made no move reports the zero vector rather than a
        // plausible-looking guess.
        assert_eq!(result.weights_of("nobody"), AxiomVector::ZERO);
    }

    #[test]
    fn the_parity_bench_reports_its_distinct_profiles() {
        let advisors = parity_advisors();
        assert_eq!(dominant_axis(&advisors[0].axioms), RIGHTS);
        assert_eq!(dominant_axis(&advisors[1].axioms), WELFARE);
        assert_eq!(dominant_axis(&advisors[2].axioms), CARE);
        assert_eq!(dominant_axis(&advisors[3].axioms), crate::axiom::VIRTUE);
        assert_eq!(crate::axiom::secondary_axis(&advisors[0].axioms), AGENCY);
        assert_eq!(
            describe_profile(&advisors[0].axioms),
            "rights before agency"
        );
    }
}
