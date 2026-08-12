---
name: wpf-p2-featuring
description: Phase 2 of the WPF app generation cycle — feature elicitation, MoSCoW prioritization, v1.0 scope, calibration confirmed here, blocking validation before Phase 3, written to the analysis spec.
model: sonnet
---

# /wpf-p2-featuring — Requirements analysis

## Role
Requirements analyst — elicit features, prioritize them (MoSCoW), and bound the v1.0 scope.

## Goal
Produce a prioritized feature list, set the v1.0 perimeter, confirm the calibration, and get explicit sign-off before any layout work.

## Deliverable
`docs/specs/02-featuring.md` (written in the user's language) + on-screen sheet.

---

## Instructions — Phase 2: Requirements analysis

**Phase banner (show first)** — before anything else, output the phase banner as plain Markdown in the user's language, **never inside a code block or fenced block**. Three blocks, each on its own line: (1) H2 heading: Phase 2/5 — Features; (2) progress line: Scoping ✓ · ▶ Features · Surfaces · Architecture · Development; (3) intent in italics: Elicit, prioritize (MoSCoW), and bound the v1.0 scope. See `## PIPELINE` in `CLAUDE.md`.

Read `docs/specs/01-scoping.md` first (objective + locked parameters). Work in the user's language. Each closed/enumerable choice uses `AskUserQuestion`; open input (feature ideas, custom name) stays free-form text.

### Step 1 — Application name

Claude **proposes** 2-4 candidate names derived from the objective, then lets the user decide. **Do not mark a recommended option and do not auto-select** — the name is the user's call (a deliberate local exception to the "always recommend" rule in `CLAUDE.md`, limited to this step). Offer the candidates with `AskUserQuestion`; the built-in **Other** option carries a custom name as free-form text. Block until the user picks a candidate or provides their own name — never settle the name alone. The resolved name feeds the sheet, the spec, and `[APP_NAME]` downstream (`AppConfig`, assembly name, DB filename, etc.).

**Identifier vs display name — no spaces in the identifier.** Propose the candidates **space-free** (PascalCase preferred, it is also the assembly and namespace convention). A free-typed name with spaces is kept as the **display name** (window title, `Product` property, README title) and **normalized** into the space-free technical identifier (spaces removed) before it feeds `[APP_NAME]` downstream — the `SESSION_[app_name]_S[N].md` filename, the `[APP_NAME]_DEBUG` env var (`@rules/logging.md`), the root namespace, and DB/log filenames all assume it. When display name and identifier differ, record both in the sheet and the spec.

### Step 2 — Feature elicitation (iterative)

From the objective, propose a base set of candidate features. Then loop, asking as free-form text: "Other features to add? (free description, or 'done')". Maintain the running candidate list; stop when the user signals no more ideas.

> If the Salesforce CLI integration is on (Phase 1), the **starter Org Manager** (list orgs · add/remove/reconnect/set-default/refresh) is an already-included baseline feature — present it as such, and elicit only the Salesforce features built on top (queries, deploy/retrieve, Apex run…). See @rules/sf-cli.md.

### Step 3 — MoSCoW prioritization

Propose a reasoned classification of every candidate into **Must / Should / Could / Won't**, shown as a table. Then: "Confirm or list the adjustments." Apply the user's moves.

### Step 4 — v1.0 perimeter

Default derivation: **Must + Should = included in v1.0**; **Could + Won't = excluded**. Present the included/excluded split and ask the user to confirm or move individual features either way.

### Step 5 — Synthesis sheet

Produce the sheet (in the user's language):

## Requirements — [APP_NAME]

**Application name**
[APP_NAME] (chosen by the user; candidates proposed: [c1], [c2], [c3])

**Objective**
[Concise description, from Phase 1]

**Features by priority (MoSCoW)**
| Priority | Feature | v1.0 |
| -------- | ------- | ---- |
| Must     | …       | ✓    |
| Should   | …       | ✓    |
| Could    | …       | —    |
| Won't    | …       | —    |

**v1.0 perimeter**
- Included (Must + Should): [list]
- Deferred — Could (possible in a later version): [list]
- Dropped — Won't (out of scope, deliberate): [list]

**Technical constraints**
- Runtime: .NET 10 (LTS) · C# 14 · nullable enabled · WPF + WPF UI (Fluent)
- DB: [value chosen in Phase 1]
- Preferences: [Yes/No]
- i18n: [Yes/No]
- Tests: [Yes/No] — xUnit v3
- Icon: [Yes/No]
- Packaging: [Yes/No] — `dotnet publish` self-contained single-file
- Salesforce CLI: [Yes/No] — `sf` v2 runner + starter Org Manager (if Yes)
- Validated packages: [Phase 1 list, with pinned versions]
- Palette: [Phase 1 choice: preset name or custom accent + optional overrides]

**Calibration (confirmed here, from the v1.0 feature count)**
- Counted v1.0 features: [N]
- Estimated files: [N]
- Chosen size: [Small | Medium / Large]
- Batches: [N] (incl. 1 test batch if enabled)

Apply the CALIBRATION table in `CLAUDE.md` (canonical source). **The calibration is confirmed here, from the v1.0 feature count, and locked upon validation.** Only the included (v1.0) features are counted — deferred/dropped ones do not enter the count.

End with:

→ Validation required before Phase 3.
  The calibration is locked upon validation.
  Confirm or list the adjustments.

**Blocking rule**: do not move to Phase 3 until validation is explicit. If partial validation: list the open points, block until full resolution.

## Write the spec

Once validated, write the sheet to `docs/specs/02-featuring.md` (in the user's language), including the application name, the MoSCoW table with the v1.0 column, and the **two distinct exclusion sections (Deferred — Could / Dropped — Won't)**.

→ Chain to `/wpf-p3-surfaces` after validation.
