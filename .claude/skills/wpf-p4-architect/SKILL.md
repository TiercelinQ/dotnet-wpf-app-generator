---
name: wpf-p4-architect
description: Phase 4 of the WPF app generation cycle — complete architectural contract (tree, role of each file, services and commands, tokens → XAML resources table), written to the contract spec and locked after validation.
model: sonnet
---

# /wpf-p4-architect — Architectural contract

## Role
Software architect — design the locked structure the whole build will follow.

## Goal
Produce a complete, unambiguous architectural contract that freezes the file tree, the service and command surface, and the resource mapping.

## Deliverable
`docs/specs/04-architect.md` (written in the user's language) — the locked source of truth + on-screen contract.

---

**Phase banner (show first)** — before anything else, output the phase banner as plain Markdown in the user's language, **never inside a code block or fenced block**. Three blocks, each on its own line: (1) H2 heading: Phase 4/5 — Architecture; (2) progress line: Scoping ✓ · Features ✓ · Surfaces ✓ · ▶ Architecture · Development; (3) intent in italics: Lock the file/structure contract. See `## PIPELINE` in `CLAUDE.md`.

At start: read `design-system.md`, `layout.md` (no longer auto-imported), `@rules/mvvm.md` (tree, batches, MVVM conventions), `@rules/xaml.md` (tokens → resources) and `@rules/threading.md` (which operations must be async and cancellable). **If the Salesforce CLI integration is on (Phase 1), also read @rules/sf-cli.md** (runner, helpers, Org Manager scaffold). Read `docs/specs/01-scoping.md` through `03-surfaces.md` for the validated decisions.

Present (in the user's language, as plain Markdown — never inside a code block):

1. **Complete project tree** (model: `@rules/mvvm.md`) with the role of each file, including the DI registration lifetime (singleton / transient) of every service, ViewModel, and view.
2. **Services and commands table** (one row per user-triggered operation):

| Command (ViewModel) | Service method | Model / data touched | Consuming view | Async / cancellable |
| ------------------- | -------------- | -------------------- | -------------- | ------------------- |
| `RecordViewModel.LoadCommand` | `IRecordService.ListAsync` | `Record` | `RecordView` | yes / yes |
| `RecordViewModel.SaveCommand` | `IRecordService.SaveAsync` | `Record` | `RecordView` | yes / yes |
| `ShellViewModel.ToggleThemeCommand` | `IAppThemeService.Apply` | preferences | `MainWindow` | no |
| `ShellViewModel.NavigateCommand` | — | — | `MainWindow` | no |

   **If the Salesforce CLI integration is on (Phase 1)**: include the Org Manager rows (`OrgViewModel.ListOrgsCommand` / `LoginCommand` / `LogoutCommand` / `ReconnectCommand` / `SetDefaultCommand` → `ISfCliService.*` → `OrgView`) in this table, and add the runner + Org Manager files to the tree. The `sf` runtime prerequisite and the `SfPath` preference are part of the contract. See @rules/sf-cli.md.

3. **Tokens → planned XAML resources table** (the styles and the resource keys they consume):

| design-system.md token | Light source | Dark source | Target style / resource |
| ---------------------- | ------------ | ----------- | ----------------------- |
| `ApplicationBackgroundBrush` | Fluent (or palette override) | Fluent (or palette override) | `AppWindowStyle`, content host |
| accent | project accent, variants derived | project accent, variants derived | `PrimaryButtonStyle`, selection indicator, focus |
| `CornerRadiusMd` | 8 | 8 | card, dialog, snackbar styles |
| …                      | …            | …           | …                       |

   The example rows in both tables use the **default composition** (NavigationView pane). Consuming views and style targets always follow **the retained composition from `docs/specs/03-surfaces.md`** — another pattern (`layout.md` §12) replaces them with its own shell controls and anchors.

   **If the splash screen is on (Phase 3)**: add the splash files to the tree (`src/App.Wpf/Views/SplashWindow.xaml`, `src/App.Wpf/Themes/Splash.xaml`), note the absence of `StartupUri` in `App.xaml`, the `SplashMinDurationMs` constant in `AppConfig`, and the splash orchestration in `App.xaml.cs` (shell hidden until `Loaded`). The icon source (Phase 1 icon reused, path provided in Phase 3, or text-only) is part of the contract. See @rules/splash.md.

   **If packaging is on (Phase 1)**: add the publish profile to the tree and record the runtime identifier and the single-file settings (`@rules/packaging.md`).

4. **Source → test mapping** (only if tests enabled in Phase 1): each service and ViewModel → its `*Tests.cs` file (incl. `SfCliService` / `OrgViewModel` if the Salesforce integration is on). See `@rules/tests.md`.

**→ Validation required. This contract is locked.**

Any deviation (merge, split, rename, addition, removal of a file, service, command, or package) requires:

1. Stop.
2. Declare the deviation + justification.
3. Validation before resuming.

**Blocking rule**: do not deliver Batch 1 until validation is explicit.

## Write the spec

Once validated, write the full contract to `docs/specs/04-architect.md` (in the user's language). This file is the **locked source of truth** re-read by `/wpf-p5-development`, `/wpf-load-project`, `/wpf-show-contract`, `/wpf-add-feature`, and `/wpf-refactor-code`.

→ Chain to `/wpf-p5-development` after validation.
