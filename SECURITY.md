# Security Policy

## Supported versions

Nooreign is a pre-1.0 content-and-simulation project. Only the latest released
version receives fixes.

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
| < 0.1   | :x:                |

There is no long-term-support branch. If you need a fix against an older
release, open an issue describing the problem and why you cannot move to latest.

## Reporting a vulnerability

**Please do not open a public issue for a security problem.** A public issue
discloses the flaw to everyone, including people who will write an exploit,
before a fix exists.

Report privately, in order of preference:

1. **GitHub private vulnerability reporting** — the Security tab on this
   repository:
   <https://github.com/aniruddhaadak80/nooreign/security/advisories/new>
   Choose *Report a vulnerability*. This opens a private advisory visible only to
   you and the maintainer.

2. **Email** — the maintainer, Aniruddha Adak (`@aniruddhaadak80`), at the
   address published on their GitHub profile page:
   <https://github.com/aniruddhaadak80>

   *Please do not paste a live secret into the subject line.* If your report
   involves a credential, say "credential included" and share the value only in
   the body, or revoke it first and tell us what it was.

3. If you would prefer not to contact the maintainer directly, use the reporting
   channel in [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

Please include, where you can:

- what an attacker can do,
- the exact steps to reproduce,
- which version/commit and which surface (web app, agents service, engine, CI).

### What happens next

| Stage                  | Target                                          |
| ---------------------- | ----------------------------------------------- |
| Acknowledgement        | within 3 business days                          |
| Triage (valid/invalid) | within 7 business days                          |
| Fix or mitigation      | within 30 days of triage, for confirmed issues  |
| Disclosure             | coordinated with you, after a fix is released   |

If a report is declined, you will get the reason. If we cannot reproduce it, we
will usually say what we tried. If we agree it is a vulnerability and you want
credit, the advisory will name you unless you prefer otherwise.

**Please give us a reasonable window to ship a fix before disclosing publicly.**
We will honour the timeline we agree with you.

## What counts as a vulnerability here

This is a static, read-only site with an optional local deliberation service. The
threat model is much smaller than a typical web app, and "it is on the internet"
is not by itself a vulnerability.

**In scope:**

- Cross-site scripting or content injection reachable through the site — e.g.
  via seed data, search input, or a URL parameter that is rendered unescaped.
- Server-Side Request Forgery through the agents integration: making the Next.js
  server fetch an attacker-chosen URL via `NOOREIGN_SERVICE_URL` or similar.
- Path traversal or arbitrary file read in the built site or the Docker image.
- Supply-chain compromise in this repo: a workflow that exfiltrates secrets, or a
  release that publishes an artefact the tag does not correspond to.
- Insecure transport or headers introduced by the deployment configs.
- A way to make the running service execute attacker-controlled code.

**Out of scope (by design, not by accident):**

- The content being philosophically contestable. The atlas takes positions; that
  is the point of it. Disagreement about a verdict is an issue, not a
  vulnerability.
- **Determinism being "wrong".** The engine is a pure function of
  `(seed, dilemmaId, optionId)`. An unexpected verdict is a correctness bug —
  please file it as an issue, with the seed and the dilemma id. It is only a
  security bug if you can turn it into code execution or data exposure.
- Missing hardening headers on a purely static asset that leaks nothing.
- Denial of service against a free-tier demo, or resource-exhaustion tuning.
- Missing hardening headers without an exploitable consequence.
- Reports from automated scanners with no demonstrated impact.
- Security issues in the upstream dependencies themselves — report those to the
  upstream project. (If an upstream advisory is what made this repo exploitable,
  tell us anyway so we can pin or patch around it.)

## No secrets, no telemetry

Worth stating plainly, because for a public site it is the usual worry:

- **The repository contains no secrets.** `.env` files are git-ignored;
  `.env.example` holds only safe defaults and empty secret slots. A CI job scans
  for committed credential patterns on every push.
- **Nothing in this project requires a secret to run.** The atlas is fully
  functional offline with no API keys, no accounts and no database.
- **No telemetry, analytics or tracking.** `NEXT_TELEMETRY_DISABLED=1` is set in
  the Dockerfile and in the deployment configs. The site sets no cookies, runs no
  third-party scripts, and makes no requests to any external service.
- **No user data is collected or stored.** There is no database and no backend
  session store. The deliberation runs in your browser.
- The one exception is the optional agents service, which is yours to run — it
  logs request metadata, not content you did not send it.

If you believe any of the above is untrue, that is exactly the kind of report
this policy exists for.