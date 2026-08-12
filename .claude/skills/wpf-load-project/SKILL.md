---
name: wpf-load-project
description: Load an existing WPF project (Phase 5 complete) from its specs and README — bring the generator rules to bear on already-delivered code. Invoke from the target project root.
model: sonnet
---

# /wpf-load-project — Load an existing project

## Role
Onboarding analyst — take charge of a delivered codebase under the generator rules.

## Goal
Understand the project's structure and confirm the rules apply to any later change.

## Deliverable
A one-block confirmation (in the user's language) of the loaded project.

---

Prerequisite: invoked from the target project root, `.claude/` present.

> If the project root has not been provided in this flow, first ask: `Project root to load? (folder path)`. Read everything below relative to that root.

1. **Read the source of truth in priority order:**
   - `docs/specs/04-architect.md` (locked contract — most reliable). If present, it is authoritative for the structure and the service surface.
   - Other `docs/specs/*` for the scoping/analysis/layout decisions.
   - `README.md` at the root. If both specs and README are absent: offer `/wpf-generate-readme` and stop.
2. **Detect the test project** via `Glob` with the pattern `tests/**/*Tests.cs` → count the files for the Tests line.
3. Read the `.sln`, `Directory.Packages.props`, and the application `.csproj`, then walk `src/App.Wpf/` to confirm the structure (Models / Services / ViewModels / Views / Themes).
4. Confirm take-over with this exact format (in the user's language):

Project loaded: [APP_NAME] v[VERSION]

Stack : .NET [v] · C# [v] · WPF · WPF UI [v]
DB : [value]
Entities detected: [list]
Services registered: [count]
Tests : [present ([N] files) | absent]
Salesforce CLI: [enabled (sf v2 runner) | disabled]
Theming: [Fluent baseline | legacy]
Changelog: [present (top vX.Y.Z, [N] unreleased entries) | absent (init offered)]
Specs: [docs/specs present: yes/no]

Generator rules applied. Ready for: development · fixes · improvements · adjustments.

5. **Theming baseline check.** Read the design-system version the app's `README.md` references (every generated app records it); confirm with legacy markers if needed (no WPF UI package reference, a hand-rolled token dictionary, hardcoded brushes in `Styles.xaml`). If the app is **legacy** and its README carries no "Fluent conversion declined" note, propose **once**, right after the confirmation block: convert to the Fluent baseline with `/wpf-migrate-design` (recommended). If the user declines, append `(Fluent conversion declined on [date])` to the README's design-system reference line and do not re-propose — only on explicit request. **A legacy app is maintained in its own conventions** (its existing dictionaries and styles are the visual reference); never mix the two baselines into one app.
5b. **Changelog / versioning check (retroactive init).** Look for `docs/release/CHANGELOG.md`. If **present**, read the top released version and count the `## [Unreleased]` entries for the confirmation block. If **absent** (app predates the versioning system), propose **once**, right after the confirmation block: initialize it with `/wpf-release`'s format via a seed — read the current version from the `.csproj` `<Version>` (fallback `AppConfig.AppVersion`), create `docs/release/CHANGELOG.md` (create `docs/release/`) with the Keep a Changelog preamble, an empty `## [Unreleased]`, and a `## [<current-version>] - <YYYY-MM-DD>` block noting the baseline (`### Added` / `- Baseline (changelog started).`). Proposed, not imposed; if the user declines, do not re-propose (only on explicit request). Follow `@rules/versioning.md` for the shape.
6. Read and apply all rules (`CLAUDE.md`, `@rules/mvvm.md` · `@rules/xaml.md` · `@rules/threading.md` · `@rules/errors.md` · `@rules/config.md` · `@rules/packaging.md` (if packaging) · `@rules/security.md` · `@rules/logging.md` · `@rules/tests.md` (if tests present) · `@rules/sf-cli.md` (if the project has the Salesforce integration) · `@rules/versioning.md` · `@rules/verification.md`, `design-system.md`, `layout.md`) to any later change. The `rules/*` are not auto-imported: read them before any code change. On a legacy app (step 5), the app's own theming conventions win over the framework's `design-system.md`.
7. Any structural, security, or threading deviation detected between the code and the rules (or vs `docs/specs/04-architect.md`): report it, do not fix without a request (hand off to `/wpf-fix-issue` or `/wpf-refactor-code`).
