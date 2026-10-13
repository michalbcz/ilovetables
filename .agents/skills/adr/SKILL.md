---
name: adr
description: >
  Record an architecture decision for ilovetables and refresh ARCHITECTURE.md.
  Use when a change affects system boundaries, data flow, persistence,
  detection, the export contract, packaging, permissions, or a library that
  owns a subsystem, including when an approach is rejected and no code
  changes. Use when the user says ADR, architecture decision, or /adr, or
  asks to update the architecture doc after such a change.
---

# ADR

`ARCHITECTURE.md` is the current high-level shape of ilovetables. `docs/adr/` is the history of decisions, including rejections. Do not make either file do the other's job.

## When to write one

Write an ADR when the change does any of these:

- Moves a boundary between the content script, background, popup, options, or the page.
- Changes what is detected, extracted, stored, sorted, filtered, or exported.
- Adds or removes a permission, a network call, a package that owns a subsystem, or a build constraint.
- Accepts or rejects an approach that would have done one of the above.

Do not write an ADR for copy, color, a translation, a bugfix that keeps the current design, or a test. If you are unsure, do not write one.

A rejection is a decision. Record it even when no code changes.

## Steps

1. Read `ARCHITECTURE.md` and the files in `docs/adr/`.
2. Add the next ADR. Numbers are four digits, starting at `0001`. Never reuse or renumber. Filename: `docs/adr/NNNN-short-title.md`.
3. If this decision replaces an earlier one, set that earlier ADR's status to `superseded by NNNN`. Leave its body as it was.
4. Update `ARCHITECTURE.md` only so a reader sees the system as it is after an **accepted** decision. Delete statements that are no longer true. Do not add a changelog, a list of rejected ideas, or a retelling of the ADR. One link to `docs/adr/` is enough.
5. For a **rejected** decision, do not change `ARCHITECTURE.md` unless it currently describes the rejected idea as if it were built.
6. If the code and `ARCHITECTURE.md` disagree, the code wins. Fix the doc, or fix the code, before you finish. Do not leave the ADR describing a system the code does not implement.

## ADR shape

```markdown
# NNNN. Title

- Status: accepted
- Date: YYYY-MM-DD

## Context

What forced the choice. A few sentences.

## Decision

What was chosen. If this supersedes an older ADR, name it.

## Alternatives

Each real alternative, and why it was rejected. Include the chosen approach only by naming it in Decision.

## Consequences

What the rest of the system must now assume.
```

Status is `accepted`, `rejected`, or `superseded by NNNN`. Use the date you write the record.

Keep the ADR short. Name the idea and the reason. Do not paste implementation steps, code, or the text of `ARCHITECTURE.md`.
