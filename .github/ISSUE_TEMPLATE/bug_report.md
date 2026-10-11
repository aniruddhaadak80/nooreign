<!--
The atlas is deterministic. Every deliberation is a pure function of
(seed, dilemmaId, optionId). The committed seed is 2406.

That means an unexpected verdict is a bug, not a matter of taste: if the council
reached a conclusion you did not expect at seed 2406, something changed the
inputs — an axiom weight, a rounding path, a sort comparator, an iteration order.

You do not need to diagnose it. Seed + dilemma id + option id is enough to
reproduce it exactly. Please fill all of that in.
-->

## What broke

<!-- What you did, and what happened instead. Plain text; a screenshot is a last resort. -->

## Verdict you expected

<!-- Be specific. "The care axis should have dominated the care-weft advisors" is
     useful. "It felt wrong" is not reproducible and we cannot act on it. -->

## Verdict you got

## Seed

<!-- Default is 2406. If you changed it, say what you changed it to and why. -->

## Dilemma id

<!-- The kebab-case id, e.g. `the-trolley-at-the-gate`. -->

## Option id (if the bug is in a deliberation rather than rendering)

## Steps to reproduce

```text
1. git clone https://github.com/aniruddhaadak80/nooreign && cd nooreign
2. bun install
3. bun run dev
4. open <route>
5. select <dilemma id> / <option id>
6. observe: <what you see>
```

## Browser and OS

<!-- e.g. Firefox 133 on Windows 11 -->

## Runtime

```text
bun --version   -> 1.3.14
node --version  -> v20.11.0
os              -> windows x64
```

## Console or test output

<!-- Paste as text, not a screenshot. Keep the first error; collapse the noise. -->

## Checklist

- [ ] I searched the existing issues for this one.
- [ ] `bun run verify` passes on my machine (or the failure is described above).
- [ ] I understand that at seed 2406 the verdict is fully determined, so an
      unexpected result is a reproducibility defect rather than a philosophical objection.