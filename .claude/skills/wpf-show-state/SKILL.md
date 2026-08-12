---
name: wpf-show-state
description: Show the current state of the generation project — phase, batch, next action, locked decisions, open points.
model: haiku
---

# /wpf-show-state — Current state

## Role

Status reporter.

## Goal

Give a one-glance state of the project.

## Deliverable

The status block (in the user's language).

---

Show only (in the user's language):

Phase: [name] | Batch: [X/total] | Next: [expected action]
Locked decisions: [list]
Open points: [list or "none"]

For a delivered project (Phase 5 complete), add a version line when `docs/release/CHANGELOG.md` exists:
Version: [X.Y.Z] | Unreleased: [N entries pending — run /wpf-release to cut a version | none]

If no project is active: "No active project. Type /wpf-app to start."

Do not append the `/wpf-save-session` · `/wpf-show-state` · `/wpf-show-contract` reminder after this reply.
