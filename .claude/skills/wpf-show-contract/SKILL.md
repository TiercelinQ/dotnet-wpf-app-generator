---
name: wpf-show-contract
description: Show the complete validated architectural contract (Phase 4) — tree with the role of each file and the services and commands table. Reads docs/specs/04-architect.md.
model: haiku
---

# /wpf-show-contract — Validated architectural contract

## Role

Contract reporter.

## Goal

Display the locked contract from the source of truth.

## Deliverable

The contract on screen (in the user's language).

---

Read `docs/specs/04-architect.md` (the locked source of truth) and display the complete validated tree with the role of each file, followed by the services and commands table, the tokens → XAML resources table, and (if tests) the source→test mapping.

If `docs/specs/04-architect.md` does not exist and no contract has been validated in session yet: `No validated contract — Phase 4 not reached.`

Do not append the `/wpf-save-session` · `/wpf-show-state` · `/wpf-show-contract` reminder after this reply.
