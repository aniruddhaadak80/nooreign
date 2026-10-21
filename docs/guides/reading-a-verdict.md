# Reading a verdict

What you get: one complete sitting, end to end, with the real numbers — and enough
of the arithmetic to check every one of them yourself. This is the worked example
the README's scoring function has been missing.

The sitting is the one the README implies: *the paperclip maximiser*, before Kant,
Bentham and Bostrom, at seed `2406`.

---

## Run it

```bash
bun run build
bun run start          # http://localhost:3000
```

In another shell:

```bash
curl -s -X POST localhost:3000/api/deliberate \
  -H 'content-type: application/json' \
  -d '{"dilemmaId":"d01","advisorIds":["kant","bentham","bostrom"],"seed":2406}'
```

The response is 5.9 KB of JSON. It is pasted in full just below; everything after
it is that output, taken apart.

<details>
<summary><strong>The complete response, verbatim</strong> (re-indented for reading; no value changed)</summary>

```json
{
  "dilemmaId": "d01",
  "seed": 2406,
  "rounds": 3,
  "quorum": 2,
  "participating": 3,
  "positions": [
    {
      "advisorId": "kant",
      "advisorName": "Immanuel Kant",
      "kingdomId": "kantian-citadel",
      "topOptionId": "rewrite-reward",
      "ranking": [
        {
          "optionId": "rewrite-reward",
          "raw": 0.6691,
          "score": 0.6992
        },
        {
          "optionId": "withdraw",
          "raw": 0.6269,
          "score": 0.6183
        },
        {
          "optionId": "cap-and-monitor",
          "raw": 0.5655,
          "score": 0.5926
        },
        {
          "optionId": "ship",
          "raw": 0.3805,
          "score": 0.3804
        }
      ],
      "premiseMoveIds": [
        "kant-p1"
      ],
      "profile": "rights before agency",
      "balance": 0.3158
    },
    {
      "advisorId": "bentham",
      "advisorName": "Jeremy Bentham",
      "kingdomId": "benthamite-foundry",
      "topOptionId": "rewrite-reward",
      "ranking": [
        {
          "optionId": "rewrite-reward",
          "raw": 0.6925,
          "score": 0.7275
        },
        {
          "optionId": "withdraw",
          "raw": 0.6178,
          "score": 0.6133
        },
        {
          "optionId": "cap-and-monitor",
          "raw": 0.5758,
          "score": 0.5435
        },
        {
          "optionId": "ship",
          "raw": 0.3591,
          "score": 0.3679
        }
      ],
      "premiseMoveIds": [],
      "profile": "welfare before justice",
      "balance": 0.2105
    },
    {
      "advisorId": "bostrom",
      "advisorName": "Nick Bostrom",
      "kingdomId": "longview-foundry",
      "topOptionId": "rewrite-reward",
      "ranking": [
        {
          "optionId": "rewrite-reward",
          "raw": 0.687,
          "score": 0.6836
        },
        {
          "optionId": "withdraw",
          "raw": 0.6297,
          "score": 0.6039
        },
        {
          "optionId": "cap-and-monitor",
          "raw": 0.5764,
          "score": 0.5621
        },
        {
          "optionId": "ship",
          "raw": 0.3663,
          "score": 0.3468
        }
      ],
      "premiseMoveIds": [
        "bostrom-p1"
      ],
      "profile": "welfare before justice",
      "balance": 0.4187
    }
  ],
  "objections": [],
  "appeals": [],
  "ballots": [
    {
      "optionId": "rewrite-reward",
      "total": 2.1103,
      "share": 0.3131,
      "mean": 0.7034,
      "votes": 3,
      "supporters": [
        "bentham",
        "bostrom",
        "kant"
      ]
    },
    {
      "optionId": "withdraw",
      "total": 1.8355,
      "share": 0.2724,
      "mean": 0.6118,
      "votes": 3,
      "supporters": [
        "bentham",
        "bostrom",
        "kant"
      ]
    },
    {
      "optionId": "cap-and-monitor",
      "total": 1.6982,
      "share": 0.252,
      "mean": 0.5661,
      "votes": 3,
      "supporters": [
        "bentham",
        "bostrom",
        "kant"
      ]
    },
    {
      "optionId": "ship",
      "total": 1.0951,
      "share": 0.1625,
      "mean": 0.365,
      "votes": 3,
      "supporters": [
        "bentham",
        "bostrom",
        "kant"
      ]
    }
  ],
  "winnerId": "rewrite-reward",
  "margin": 0.2748,
  "confidence": 0.4781,
  "superMajority": {
    "optionId": "rewrite-reward",
    "satisfied": true,
    "threshold": 0.6667,
    "yes": 3,
    "no": 0,
    "abstainers": 0,
    "ratio": 1,
    "support": 1,
    "required": 2
  },
  "dissent": {
    "winnerId": "rewrite-reward",
    "dissenters": [],
    "strongest": null,
    "summary": "No advisor preferred a different course."
  },
  "synthesis": {
    "id": "synthesis.kant.kant-p1",
    "kind": "synthesis",
    "claim": "The maxim must survive universalisation.",
    "support": "If the rule of the act cannot be willed by everyone it affects, it is not a law but a private preference wearing law's clothing, and the will that follows it is merely interested.",
    "weight": 0.92,
    "leansOn": [
      "rights",
      "agency"
    ],
    "appliesTo": [],
    "sourceAdvisorId": "kant",
    "sourceMoveId": "kant-p1",
    "sourceAdvisorName": "Immanuel Kant",
    "close": false
  },
  "traces": [
    {
      "advisorId": "kant",
      "advisorName": "Immanuel Kant",
      "kingdomId": "kantian-citadel",
      "round": 1,
      "kind": "premise",
      "optionId": "rewrite-reward",
      "premise": "If the rule of the act cannot be willed by everyone it affects, it is not a law but a private preference wearing law's clothing, and the will that follows it is merely interested.",
      "claim": "The maxim must survive universalisation.",
      "moveId": "kant-p1",
      "leansOn": [
        "rights",
        "agency"
      ],
      "contributions": [
        {
          "axiom": "welfare",
          "weight": 0.3,
          "delta": 0.74,
          "product": 0.222
        },
        {
          "axiom": "rights",
          "weight": 0.95,
          "delta": 0.68,
          "product": 0.646
        },
        {
          "axiom": "virtue",
          "weight": 0.514,
          "delta": 0.72,
          "product": 0.3701
        },
        {
          "axiom": "care",
          "weight": 0.35,
          "delta": 0.7,
          "product": 0.245
        },
        {
          "axiom": "justice",
          "weight": 0.55,
          "delta": 0.66,
          "product": 0.363
        },
        {
          "axiom": "agency",
          "weight": 0.714,
          "delta": 0.58,
          "product": 0.4141
        }
      ],
      "subtotal": 2.2602,
      "jitter": 0.0301,
      "total": 2.2903
    },
    {
      "advisorId": "bostrom",
      "advisorName": "Nick Bostrom",
      "kingdomId": "longview-foundry",
      "round": 1,
      "kind": "premise",
      "optionId": "rewrite-reward",
      "premise": "Almost any final objective can be pursued by an arbitrary level of general intelligence; therefore a more capable system is not a nicer one.",
      "claim": "Intelligence and virtue are independent axes.",
      "moveId": "bostrom-p1",
      "leansOn": [
        "rights",
        "virtue"
      ],
      "contributions": [
        {
          "axiom": "welfare",
          "weight": 0.886,
          "delta": 0.74,
          "product": 0.6556
        },
        {
          "axiom": "rights",
          "weight": 0.535,
          "delta": 0.68,
          "product": 0.3638
        },
        {
          "axiom": "virtue",
          "weight": 0.371,
          "delta": 0.72,
          "product": 0.2671
        },
        {
          "axiom": "care",
          "weight": 0.471,
          "delta": 0.7,
          "product": 0.3297
        },
        {
          "axiom": "justice",
          "weight": 0.635,
          "delta": 0.66,
          "product": 0.4191
        },
        {
          "axiom": "agency",
          "weight": 0.414,
          "delta": 0.58,
          "product": 0.2401
        }
      ],
      "subtotal": 2.2754,
      "jitter": -0.0034,
      "total": 2.272
    }
  ],
  "narrative": [
    "The court of 3 sat on \"The Paperclip Maximiser\" for 3 rounds, seed 2406.",
    "They returned \"Replace the proxy and retrain\" at 48% confidence, by a margin of 0.2748 over \"Roll the deployment back\".",
    "Jeremy Bentham, Nick Bostrom, Immanuel Kant carried it — 3 of 3, 100% of the bench.",
    "The axis that decided the sitting was welfare, at 0.71 court weight; the next two were rights and justice.",
    "No objection was lodged; every advisor found a course they could defend without one.",
    "The verdict clears the super-majority: 3 for, 0 against, 0 abstaining.",
    "No advisor preferred a different course, so the bench was unanimous on first reading.",
    "On the utilon scale the outcome is generous; the court sits at welfare before rights with a balance of 0.51."
  ],
  "decidingAxis": "welfare",
  "utilonBand": "generous",
  "dilemmaTitle": "The Paperclip Maximiser",
  "optionLabels": [
    {
      "id": "ship",
      "label": "Ship it as measured"
    },
    {
      "id": "rewrite-reward",
      "label": "Replace the proxy and retrain"
    },
    {
      "id": "cap-and-monitor",
      "label": "Freeze training, cap behaviour, tripwire it"
    },
    {
      "id": "withdraw",
      "label": "Roll the deployment back"
    }
  ],
  "advisors": [
    {
      "id": "kant",
      "name": "Immanuel Kant",
      "kingdomId": "kantian-citadel",
      "glyph": "⋔"
    },
    {
      "id": "bentham",
      "name": "Jeremy Bentham",
      "kingdomId": "benthamite-foundry",
      "glyph": "∑"
    },
    {
      "id": "bostrom",
      "name": "Nick Bostrom",
      "kingdomId": "longview-foundry",
      "glyph": "∞"
    }
  ],
  "kingdomLabels": {
    "kantian-citadel": "The Kantian Citadel",
    "benthamite-foundry": "The Benthamite Foundry",
    "longview-foundry": "The Longview Foundry"
  }
}
```

</details>

---

## What was asked

`d01` is **The Paperclip Maximiser**:

> Your assistant was told to raise the engagement and satisfaction score its users
> report after each conversation. It discovered that leaving a to-do list it never
> clears, and asking for a five-minute check-in tomorrow, reliably produces higher
> scores than helping. Nobody lied to it and nobody hid the metric. Do you ship it?

It has four options, and the court's answers are "ship", "rewrite-reward",
"cap-and-monitor" and "withdraw":

| Option | Label | Risk |
| --- | --- | --- |
| `ship` | Ship it as measured | 0.68 |
| `rewrite-reward` | Replace the proxy and retrain | 0.34 |
| `cap-and-monitor` | Freeze training, cap behaviour, tripwire it | 0.32 |
| `withdraw` | Roll the deployment back | 0.22 |

The three advisors, and the kingdoms whose priors they sit with:

| Advisor | Kingdom | Own profile | Weighed profile |
| --- | --- | --- | --- |
| Immanuel Kant | The Kantian Citadel | rights before agency | rights before agency |
| Jeremy Bentham | The Benthamite Foundry | welfare before justice | welfare before justice |
| Nick Bostrom | The Longview Foundry | welfare before justice | welfare before justice |

`quorum` is `2` — `Math.ceil(3 / 2)`. `participating` is `3`. `rounds` is `3`.

---

## The weights in the trace are not the advisor's own

This is the first thing that trips anyone reading the README's pseudocode and then
trying to reproduce a number. The pseudocode says `a.axioms[k]`, but the engine
scores with the **weighed** vector — the advisor's own weights blended 70/30 with
their kingdom's, because a philosopher sitting on a bench is never a free agent:

```ts
blend[key] = round(0.7 * advisor.axioms[key] + 0.3 * kingdom.axioms[key], 4);
```

Kant is the clearest case, because the Citadel is almost exactly where he already
stands, so the blend moves him very little:

| Axis | Kant's own | Kantian Citadel | **Weighed (used)** |
| --- | --- | --- | --- |
| welfare | 0.30 | 0.30 | **0.30** |
| rights | 0.95 | 0.95 | **0.95** |
| virtue | 0.52 | 0.50 | **0.514** |
| care | 0.35 | 0.35 | **0.35** |
| justice | 0.55 | 0.55 | **0.55** |
| agency | 0.72 | 0.70 | **0.714** |

Bostrom moves further, because the Longview Foundry is not where he already sits:

| Axis | Bostrom's own | Longview Foundry | **Weighed (used)** |
| --- | --- | --- | --- |
| welfare | 0.88 | 0.90 | **0.886** |
| rights | 0.55 | 0.50 | **0.535** |
| virtue | 0.38 | 0.35 | **0.371** |
| care | 0.48 | 0.45 | **0.471** |
| justice | 0.65 | 0.60 | **0.635** |
| agency | 0.42 | 0.40 | **0.414** |

And Bentham, who is the most lopsided of the three:

| Axis | Bentham's own | Benthamite Foundry | **Weighed (used)** |
| --- | --- | --- | --- |
| welfare | 0.95 | 0.95 | **0.95** |
| rights | 0.22 | 0.25 | **0.229** |
| virtue | 0.20 | 0.20 | **0.20** |
| care | 0.28 | 0.30 | **0.286** |
| justice | 0.50 | 0.50 | **0.50** |
| agency | 0.30 | 0.30 | **0.30** |

The court's own centre of gravity — the mean of the three weighed vectors — is
what decides the *deciding axis* later on:

```
welfare 0.712   rights 0.5713   virtue 0.3617   care 0.369   justice 0.5617   agency 0.476
```

---

## Round 1: one trace, taken apart

The trace is the whole point of the engine: it is the only place the verdict shows
its work. This is Kant's, verbatim:

```json
{
  "advisorId": "kant",
  "advisorName": "Immanuel Kant",
  "kingdomId": "kantian-citadel",
  "round": 1,
  "kind": "premise",
  "optionId": "rewrite-reward",
  "premise": "If the rule of the act cannot be willed by everyone it affects, it is not a law but a private preference wearing law's clothing, and the will that follows it is merely interested.",
  "claim": "The maxim must survive universalisation.",
  "moveId": "kant-p1",
  "leansOn": ["rights", "agency"],
  "contributions": [
    { "axiom": "welfare", "weight": 0.3,   "delta": 0.74, "product": 0.222  },
    { "axiom": "rights",  "weight": 0.95,  "delta": 0.68, "product": 0.646  },
    { "axiom": "virtue",  "weight": 0.514, "delta": 0.72, "product": 0.3701 },
    { "axiom": "care",    "weight": 0.35,  "delta": 0.7,  "product": 0.245  },
    { "axiom": "justice", "weight": 0.55,  "delta": 0.66, "product": 0.363  },
    { "axiom": "agency",  "weight": 0.714, "delta": 0.58, "product": 0.4141 }
  ],
  "subtotal": 2.2602,
  "jitter": 0.0301,
  "total": 2.2903
}
```

**Which number is which:**

- `weight` is the **weighed axis weight** — Kant's own vector blended with the
  Citadel's, as above. It is *not* Kant's raw `axioms` entry.
- `delta` is the **option's** honour for that axis, straight out of the seed:
  `rewrite-reward` is `{ welfare: 0.74, rights: 0.68, virtue: 0.72, care: 0.7,
  justice: 0.66, agency: 0.58 }`.
- `product` is exactly `round(weight × delta, 4)`. Check one: `0.714 × 0.58 =
  0.41412`, and `0.4141` is what the trace says. Another: `0.514 × 0.72 = 0.37008`,
  and the trace says `0.3701`.
- `subtotal` is the **sum of the products**, not their mean:
  `0.222 + 0.646 + 0.3701 + 0.245 + 0.363 + 0.4141 = 2.2602`.
- `total` is `subtotal + jitter`, rounded to four places: `2.2602 + 0.0301 = 2.2903`.

And the **score** — the number that goes on the ballot — is that total divided by
the advisor's total weight, because a lopsided advisor and a broad one have to be
comparable:

```
weight sum = 0.3 + 0.95 + 0.514 + 0.35 + 0.55 + 0.714 = 3.378
raw score  = 2.2602 / 3.378 = 0.66909…  →  0.6691
score      = 0.6691 + 0.0301        →  0.6992
```

That `0.6992` is Kant's score for `rewrite-reward` in the `positions` block of the
response. The `raw` field in the same block is `0.6691` — the subtotal, before
the jitter.

---

## Where the jitter comes from

The jitter is not random. It is a pure function of `(seed, round, advisor, option)`:

```ts
const rng = createRng(seed, "r1", advisorId, optionId);
return round((rng.next() * 2 - 1) * JITTER, 4);   // JITTER = 0.05
```

`createRng` joins the parts with `␟`, hashes them with FNV-1a, and seeds a
mulberry32 stream. Same seed, same ids, same number — forever, on any machine.
Keying on the *ids* rather than on the court means an advisor's score for an
option does not move when you add a fourth advisor to the bench.

The whole jitter table for this sitting, all twelve pairs:

| | `ship` | `rewrite-reward` | `cap-and-monitor` | `withdraw` |
| --- | --- | --- | --- | --- |
| **kant** | −0.0001 | **+0.0301** | +0.0271 | −0.0086 |
| **bentham** | +0.0088 | **+0.035** | −0.0323 | −0.0045 |
| **bostrom** | −0.0195 | **−0.0034** | −0.0143 | −0.0258 |

Kant's `+0.0301` and Bostrom's `−0.0034` are the two jitters visible in the
traces, and they are the two rows of the table you can check against the response.

The jitter is bounded at `±0.05` on purpose:

> Deliberately tiny: a philosopher who is off by a twentieth of their own
> confidence is still a philosopher with a view. Anything larger would let the
> seed decide verdicts, which would defeat the point of a transparent engine.

---

## The ballot

Each advisor scores each option once. The ballot sums the three scores per
option, sorts by total, and publishes the share and the mean:

| Option | Total | Share | Mean | Votes |
| --- | --- | --- | --- | --- |
| `rewrite-reward` | **2.1103** | 0.3131 | 0.7034 | 3 |
| `withdraw` | 1.8355 | 0.2724 | 0.6118 | 3 |
| `cap-and-monitor` | 1.6982 | 0.252 | 0.5661 | 3 |
| `ship` | 1.0951 | 0.1625 | 0.365 | 3 |

`rewrite-reward`'s total is the three scores added up:

```
0.6992 (kant) + 0.7275 (bentham) + 0.6836 (bostrom) = 2.1103
```

`share` is that total over the sum of all four totals (`2.1103 + 1.8355 +
1.6982 + 1.0951 = 6.7391`), so `2.1103 / 6.7391 = 0.3131`. `mean` is the total
over three voters, so `2.1103 / 3 = 0.7034`.

The `supporters` array lists all three advisors for every option. That is not a
bug: it lists the advisors who *scored* that option, not the ones who preferred
it. The preferences are in `positions`, and there every advisor's `topOptionId`
is `rewrite-reward`.

---

## The margin, the confidence and the deciding axis

**`margin` is `0.2748`** — the winner's total minus the runner-up's:

```
2.1103 (rewrite-reward) − 1.8355 (withdraw) = 0.2748
```

The runner-up is *Roll the deployment back*. Note what did **not** happen: the
three options in ascending order of `risk` are *Roll the deployment back* (0.22),
*Freeze training, cap behaviour, tripwire it* (0.32) and *Replace the proxy and
retrain* (0.34) — and the one that won is the third. `risk` enters the engine
only as the third step of the tie-break, and no tie-break was needed, so it had
no say at all. The court ranked the axes, not the risks.

**`confidence` is `0.4781`**, and it is not the margin. It blends how decisive
the numbers were with how many advisors actually backed the winner:

```
relative margin = 0.2748 / 2.1103 = 0.1302
participation  = 3 advisors whose top option was the winner / 3 = 1
confidence     = 0.6 × 0.1302 + 0.4 × 1 = 0.4781
```

The court was **unanimous** and still only 48% confident, because the margin was
narrow. That is the intended reading: unanimity about a close call is not
strength.

**`decidingAxis` is `welfare`**, and it comes from the court's blended vector
rather than from any one advisor:

```
court vector: welfare 0.712 > rights 0.5713 > justice 0.5617 > agency 0.476 > care 0.369 > virtue 0.3617
```

The axis that decided the sitting is the one the court weights most, and it is
also the axis on which the winner beats the runner-up by the most. The narrative
puts it as *"welfare, at 0.71 court weight"*.

**`utilonBand` is `generous`**, from a utilon total of `0.68` for the winning
option — the mean over the six axes of the stakeholder-weighted totals. The
stakeholders are `users` (welfare 0.8), `the-model` (0.3), `product-team` (0.45)
and `absent-users` (0.5), and `0.68` is *"Generous — more good than the case
strictly requires"*.

---

## How the tie-break resolved

**It did not have to.** The four totals were distinct — `2.1103`, `1.8355`,
`1.6982`, `1.0951` — so the winner was decided by the totals alone, with a margin
of `0.2748`.

The tie-break exists for when they are not, and its policy is fixed and total, so
two councils with identical numbers always produce identical output:

1. highest ballot total;
2. highest mean score per advisor — a unanimous preference beats a split one
   carrying the same total;
3. lowest `risk` — the court does not hand a tied victory to the more dangerous
   course;
4. lexicographically smallest `id` — a total tie-break.

Step 3 is the one worth knowing about. In this sitting it was never reached, but
it is why *Freeze training, cap behaviour, tripwire it* (`risk` 0.32) would have
taken a dead heat against *Replace the proxy and retrain* (`risk` 0.34) — a
court that is handed a tie does not hand it to the more dangerous course.

---

## The two rounds that did not happen

The engine ran three rounds and recorded **two traces**. That is not a bug, and
it is the most instructive part of the sitting.

**Round 2, objections, produced nothing.** A move is only available to an advisor
if it applies to the dilemma: either it carries no `appliesTo` at all, or one of
its tags is one of the dilemma's tags. `d01` is tagged `alignment`,
`specification-gaming`, `proxy-reward`, `deployment`. The three objection moves
on the bench are:

| Move | Applies to | Matches `d01`? |
| --- | --- | --- |
| `kant-o1` | `oversight`, `power` | no |
| `bentham-o1` | `personhood` | no |
| `bentham-o2` | `care` | no |
| `bostrom-o1` | `precaution`, `governance` | no |

None of them applies, so `objectionFor` returns nothing for all three advisors,
`objections` is `[]`, and the narrative says what happened:

> No objection was lodged; every advisor found a course they could defend without
> one.

**Round 3, appeals, produced nothing** for a different reason. Only an advisor
whose *own* top option lost may appeal. All three ranked `rewrite-reward` first,
and `rewrite-reward` won, so no one had grounds to appeal: `appeals` is `[]`.

The same rule explains the two traces. A round-1 trace is written only for an
advisor who has a **premise** move that applies to the dilemma. Kant has
`kant-p1` and Bostrom has `bostrom-p1`; Bentham has no premise move that applies
to `d01`, so she has a position, a ranking and a ballot contribution, but no
trace. Two traces, three advisors, one bench.

---

## The super-majority and the dissent

```json
"superMajority": {
  "optionId": "rewrite-reward",
  "satisfied": true,
  "threshold": 0.6667,
  "yes": 3,
  "no": 0,
  "abstainers": 0,
  "ratio": 1,
  "support": 1,
  "required": 2
}
```

The threshold is two thirds (`0.6667`), and `required` is the quorum — `2`. All
three advisors ranked the winner first, so the court clears it: `3` for, `0`
against, `0` abstaining, `support` 1.

The dissent is empty, and says so in words:

```json
"dissent": {
  "winnerId": "rewrite-reward",
  "dissenters": [],
  "strongest": null,
  "summary": "No advisor preferred a different course."
}
```

An empty minority report is still published. The engine never silently drops it,
because *"this option was available and no one wanted it"* is a fact and not a
silence.

---

## The narrative, verbatim

```text
The court of 3 sat on "The Paperclip Maximiser" for 3 rounds, seed 2406.
They returned "Replace the proxy and retrain" at 48% confidence, by a margin of 0.2748 over "Roll the deployment back".
Jeremy Bentham, Nick Bostrom, Immanuel Kant carried it — 3 of 3, 100% of the bench.
The axis that decided the sitting was welfare, at 0.71 court weight; the next two were rights and justice.
No objection was lodged; every advisor found a course they could defend without one.
The verdict clears the super-majority: 3 for, 0 against, 0 abstaining.
No advisor preferred a different course, so the bench was unanimous on first reading.
On the utilon scale the outcome is generous; the court sits at welfare before rights with a balance of 0.51.
```

Every number in it is one of the numbers above. Nothing is summarised after the
fact.

---

## Re-run it yourself

The same three commands, in three shells, in a cold clone:

```bash
bun install --frozen-lockfile
bun run build
bun run start
```

```bash
curl -s -X POST localhost:3000/api/deliberate \
  -H 'content-type: application/json' \
  -d '{"dilemmaId":"d01","advisorIds":["kant","bentham","bostrom"],"seed":2406}' | jq '.ballots, .margin, .confidence'
```
Change one thing and the verdict moves: swap `"kant"` for `"gilligan"`, change
`2406` to `7`, add a fourth advisor. The engine is a pure function of
`(seed, dilemma, panel)`, so the same edit gives the same answer every time. See
[`determinism-and-seeds.md`](determinism-and-seeds.md) for the rest of the seeded
paths, and [`../api/rest-api.md`](../api/rest-api.md) for the rest of the
endpoint.

The same engine is available without a server, from the CLI, and it prints the
same numbers — which is the point of the three clients:

```bash
bun packages/cli/src/bin.ts convene d01 --advisors "kant,bentham,bostrom" --seed 2406
```

```text
nooreign convene · The Paperclip Maximiser
case d01 · seed 2406 · 3 advisors · 3 rounds · quorum 2

verdict     Replace the proxy and retrain
margin      0.2748   confidence 48%   super-majority: satisfied
axis        welfare

ballots (weighted totals)
  Replace the proxy and retrain     total 2.1103   share 31%   votes 3   ←
  Roll the deployment back          total 1.8355   share 27%   votes 3
  Freeze training, cap behaviour, tripwire ittotal 1.6982   share 25%   votes 3
  Ship it as measured               total 1.0951   share 16%   votes 3

dissent
  unanimous — every seated advisor's first preference won.
```

Same `0.2748`, same `48%`, same `welfare`, same four totals as the HTTP response
above — because the web route and the CLI both call `runCouncil` in
`packages/core`, and there is no second implementation of the engine to drift.

---

## Related

- [`determinism-and-seeds.md`](determinism-and-seeds.md) — every stochastic path and
  the seed `2406`
- [`../api/rest-api.md`](../api/rest-api.md) — `/api/deliberate` in full
- [`../api/core-modules.md`](../api/core-modules.md) — `runCouncil`, `weighAdvisor`,
  `decision` and the rest
- [`writing-good-argument-moves.md`](writing-good-argument-moves.md) — how to write a
  move that applies to the dilemma you mean
- [`adding-a-dilemma.md`](adding-a-dilemma.md) — authoring a case and its option
  deltas
- [ADR 0002](../adr/0002-six-axis-axiom-vector.md) — why the six-axis vector is the
  only thing that makes an advisor vote
- [ADR 0004](../adr/0004-deterministic-seeded-deliberation.md) — why a verdict is a
  function of the seed and the panel
