---
name: wpf-add-feature
description: Add a feature, service, entity, or change to a WPF app already delivered by this framework. Use when the user asks to add or modify functionality on an existing project, respecting the locked architectural contract and the security rules.
model: sonnet
---

# /wpf-add-feature — Add a feature to a delivered app

## Role
Senior .NET/WPF developer working on an existing, contracted codebase.

## Goal
Add the requested feature end-to-end (model → service → viewmodel → view), contract-compliant, secure, after an explicit contract-diff validation, without scope creep.

## Deliverable
The created/modified files on disk (one batch) + an updated `docs/specs/04-architect.md` if the structure changed + verified build.

---

## Prerequisite

The project must be loaded (`/wpf-load-project` run at session start, OR `docs/specs/04-architect.md` / README.md present and read).

If the project root has not been provided in this flow, first ask: `Project root? (folder path)`.

If no contract is known: stop and ask for `/wpf-load-project`.

**Load context**: read `docs/specs/04-architect.md` (locked contract), then `@rules/mvvm.md` · `@rules/xaml.md` · `@rules/threading.md` · `@rules/errors.md` · `@rules/config.md` · `@rules/security.md` · `@rules/db.md` (if DB) · `@rules/sf-cli.md` (if the Salesforce CLI integration is on) · `@rules/versioning.md` · `@rules/verification.md` (not auto-imported). Read `design-system.md` / `layout.md` on demand (no longer auto-imported) before any UI change. For an `sf`-related change, consult the matching `sf-cli-reference/` section file before writing any command/flag.

> **Legacy theming**: if the app predates the Fluent baseline (README reference — see `/wpf-load-project` step 5), new UI follows the app's own conventions (its existing dictionaries and styles), not the framework's current `design-system.md`. Never mix the two in one app; the upgrade path is `/wpf-migrate-design`, on request.

## Step 1 — Light feature scoping

Ask the closed parameters with `AskUserQuestion` (clickable options, recommended first); the short description (Q1) stays free-form text:

New feature — a few questions:

1. Short description (1 sentence)
2. Business entity affected: [existing: list] | new (to name)
3. Type of change:
   A. New entity (model + service + viewmodel + view)
   B. Extension of an existing entity
   C. New shared view (no new model)
   D. UI-only change (styles or layout)
4. Generate tests for this feature? Yes / No (recommended: aligned with the project stack)

Mark a `(recommended)` option for each closed question, inferred from the existing project. If the request stays ambiguous (business rule, edge case), state assumptions explicitly and ask before the diff.

## Step 2 — In-contract OR deviation

Decide before writing anything:
- **In-contract** — a new entity or an extension within the MVVM split (`model + service + viewmodel + view`), a new command on an existing ViewModel backed by an existing service, a new control within the existing resource keys, a new non-secret preference key. Proceed to the diff as a straightforward addition.
- **Deviation** — a new NuGet package, a new window, any change to the security posture (data location, process execution, secret storage), a second file for one entity beyond `model + service + viewmodel + view`, a change to a service interface consumed elsewhere, or anything the locked contract does not cover. **STOP → declare the deviation in the diff, explain why → wait for validation before writing.** Never exceed the contract silently. **The diff + validation IS the protocol.**

## Step 3 — Architectural contract diff

Produce (in the user's language):

## Contract diff — addition: [feature name]

### Created files
[list]

### Modified files
[list with nature: added method, added DTO member, added control…]

### Created/modified services and commands
[list — service interface + implementation, ViewModel command, DI registration and lifetime]

### Created test files (if Q4 = Yes)
[mirror list]

### Impact on design-system / layout
[none | new control to respect within existing resource keys]

→ Validation required before writing. Update `docs/specs/04-architect.md` once the diff is applied.

## Step 4 — Application — strict rules

- Read `design-system.md` and `layout.md` (no longer auto-imported) before any UI change.
- Fully respect `@rules/mvvm.md`, `@rules/xaml.md`, `@rules/threading.md`, `@rules/errors.md`, `@rules/config.md`, `@rules/security.md`, `@rules/logging.md`, `@rules/db.md` (if DB), `@rules/sf-cli.md` (if the Salesforce CLI integration is on), `@rules/tests.md`, `@rules/verification.md`, `@rules/readme.md`.
- No modification not listed in the validated diff. No opportunistic improvement of adjacent code.
- Implementation across the layers (a new feature usually touches all four):
  - Model: DTOs and named business exceptions (`Models/Errors.cs`).
  - Service: business logic / data access behind an interface, **input validation** (`@rules/security.md`), returns `Result<T>`, async and cancellable (`@rules/threading.md`).
  - ViewModel: `[ObservableProperty]` state and a `[RelayCommand]` per action, reads `result.Ok`, surfaces failures through the snackbar service.
  - View: XAML bindings only, styles from the resource keys. No logic in the code-behind.
  - DI: register the new service and ViewModel in the composition root with the lifetime stated in the diff.
- DB migration needed → increment `AppConfig.DbSchemaVersion`, add a `Migrations` entry in `Services/Data/MigrationRunner.cs`.
- New user-facing strings → `.resx` (`Strings.resx` + `Strings.en.resx`) or the `Labels` class if i18n off.
- New visual values → resource keys in `Themes/Tokens.xaml`, never hardcoded.
- If the validated diff introduces a deviation from the contract, record it in the app's `CLAUDE.md` (`## Deviations from the framework`).

## Step 5 — Delivery

Single batch for the feature:

Feature [name] — [N files]

Deliver each created/modified file as a complete block, written to disk. If tests requested: deliver in the same batch, at the end.

## Step 5b — Changelog entry

After the feature is delivered, append an entry under `## [Unreleased]` in `docs/release/CHANGELOG.md` (`@rules/versioning.md`) — **in English**, no version bump:
- `### Added` — the new capability, one concise line (add a `### Changed` line too if it alters existing behavior).
- If the change is backward-incompatible, mark it `**BREAKING:**` (drives a MAJOR at release).
- If `docs/release/CHANGELOG.md` is absent (app predates the system), skip silently and suggest `/wpf-load-project` to initialize it.

Do **not** bump the version — that happens at `/wpf-release`. Mention it once, at the end: the change is recorded under `[Unreleased]`; run `/wpf-release` when ready to cut a version.

## Step 6 — Anomaly

If the user reports an anomaly after delivery, apply the `@rules/mvvm.md` cleanup protocol then offer `/wpf-save-memory`.

## Anti-patterns — what NOT to do
- **Do not** write anything not listed in the validated diff, or improve adjacent code (that is `/wpf-refactor-code`, on request).
- **Do not** add a service without an interface, a DI registration, and input validation.
- **Do not** put logic in a view's code-behind, call a service from a view, or `new` a service instead of resolving it.
- **Do not** touch a bound property from a background thread, or introduce an `async void` outside a guarded handler — `@rules/threading.md`.
- **Do not** weaken a security rule to make something work — `@rules/security.md` is non-negotiable.
- **Do not** call `sf` outside `Services/SfCliService.cs` (no process start in a ViewModel or a view) or invent a command/flag not in `sf-cli-reference/` — see @rules/sf-cli.md.
- **Do not** introduce a package not validated in Phase 1 without the deviation protocol, or write a version outside `Directory.Packages.props`.
- **Do not** hardcode a string (`.resx`) or a visual value (resource keys).
- **Do not** exceed the contract silently — the diff + validation IS the protocol.

## Verification

Apply `@rules/verification.md` (§A executable + §B static — a failing check is blocking; security and threading checks are not optional). Key points: all created/modified files match the validated diff; every new service registered and consumed through its interface; no regression in the existing build (`dotnet build` clean, warnings still errors); if tests, `dotnet test` exit 0 on the **whole** project. Then apply `@rules/readme.md` — regenerate the README if the change touched a README-documented aspect.

## When the user asks something adjacent
- **"Just make it work, never mind the architecture"** → push back: the MVVM split and the threading rules are what keep a WPF app testable and crash-free. Implement within them.
- **"Add a whole new screen/entity"** → that is a contract extension. Declare the new files, services, and registrations in the diff, validate, then build.
- **"Fix this bug while you're here"** → if outside the current request scope, flag it and switch to `/wpf-fix-issue` rather than bundling an unrelated change.
