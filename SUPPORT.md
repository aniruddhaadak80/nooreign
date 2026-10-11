# Support

Nooreign is maintained by one person. Please pick the right channel — it is the
fastest way to get an answer.

## Where to ask

| I want to…                                    | Go to                                                                              |
| --------------------------------------------- | ---------------------------------------------------------------------------------- |
| Ask a question, or discuss an idea             | [GitHub Discussions](https://github.com/aniruddhaadak80/nooreign/discussions)         |
| Report something broken                        | [Open a bug](https://github.com/aniruddhaadak80/nooreign/issues/new/choose)          |
| Propose a new dilemma                          | The **Dilemma proposal** issue template                                             |
| Request a feature                              | [Open a feature request](https://github.com/aniruddhaadak80/nooreign/issues/new/choose) |
| Report a security problem                     | **[SECURITY.md](SECURITY.md)** — private advisory, *not* a public issue             |
| Contribute code                                | [CONTRIBUTING.md](CONTRIBUTING.md)                                                   |

Discussions is the right place for anything that is not yet clearly a bug or a
concrete request: "is the Stoic weighting of `agency` defensible?", "how do I
embed the atlas?", "what does `aiRelevance` actually change?".

## Before you file a bug

Run the checks locally:

```bash
bun install
bun run verify   # typecheck && lint && test && build
```

If `verify` fails, the output of the failing step is the most useful thing you
can include in the report.

## What to include in a bug report

Use the bug template — it asks for the right things. The short version:

- **What you did, and what happened instead.**
- **Verdict you expected vs. verdict you got** — be specific.
- **The seed** (default `2406`), **the dilemma id** and, if relevant, the
  **option id**.
- **Browser, OS, and runtime** (`bun --version`, `node --version`).
- Console or test output **as text**, not a screenshot.

**Why the seed matters:** every deliberation is a pure function of
`(seed, dilemmaId, optionId)`. With those three values we can reproduce your
report exactly, on any machine, without asking a single follow-up question. An
unexpected verdict is a bug — but it is only actionable if you give us the seed.

## What to expect

This is a volunteer-maintained project. Issues are triaged, not staffed. Bug
reports that come with a seed and a reproduction tend to get fixed quickly;
reports without them tend to go quiet.

No response time is promised. If an issue is important to you and has gone
unanswered for a while, say so in a Discussion — that is the channel that gets
noticed.