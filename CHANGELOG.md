# Changelog

All notable changes to this generator are documented in this file.
The format is based on Keep a Changelog, and this project adheres to Semantic Versioning.
(This is the changelog of the **generator** itself, distinct from the `docs/release/CHANGELOG.md` of each generated app.)

## [1.3.0] - 2026-11-09

### Changed

- No comment in the delivered code beyond documentation: only the XML documentation of types and members, member headers and file banners remain. Nothing inside a method body, a resource dictionary (the banner excepted) or a test file. A justification a rule requires (marshalling source, `#pragma`, splash background literal, `user_version` interpolation, empty `catch`) goes in the XML `<remarks>` of the member. New absolute rule in `CLAUDE.md`, new static check `verification.md §B.4a`; `xaml.md` rule 3 and the `Tokens.xaml` / `Styles.xaml` templates, `design-system.md §11`, `threading.md`, `splash.md`, `db.md`, `tests.md`, `wpf-fix-issue` and `wpf-migrate-design` aligned.
- Splash: `verification.md`, `wpf-p4-architect` and `wpf-p5-development` no longer say the shell is "hidden until `Loaded`", which `splash.md` forbids (invisible window, process that never exits). The shell is shown once at the end of the startup sequence.
- Acceptance run (`verification.md §A-bis`, `xaml.md`): the items of a WPF UI `NavigationView` are not exposed to UI Automation and `SendKeys` is silently ignored. A page is reached by its shortcut with real key events (`keybd_event` Alt + digit after `SetForegroundWindow`), and the change is proved by a control the automation exposes; an unchanged element count is never a conclusion.
- Analyzers (`config.md`, `verification.md`, `wpf-fix-issue`): with `AnalysisMode=Recommended`, CA1031 is inactive (a `#pragma` for it suppresses nothing) and CA2016 is active (`Wait(0, CancellationToken.None)`). A directive is written only after a rebuild without it proves the diagnostic fires.

## [1.2.0] - 2026-11-05

### Changed

- Navigation pane without zone separators: WPF UI 4.x draws a horizontal line under the pane toggle and another above the footer items by default, out of keeping with the Fluent pane. The generated `NavigationView` now sets `IsTopSeparatorVisible="False"` and `IsFooterSeparatorVisible="False"`; zones are separated by spacing only (`layout.md` v1.1, §1 and §3).

## [1.1.0] - 2026-08-13

### Added

- Dependency-vulnerability check: `dotnet list package --vulnerable --include-transitive` is prescribed in `rules/security.md §7` and mentioned in the last-batch instructions of `/wpf-p5-development` — parity with `npm audit` on the npm stacks and `pip-audit` on python. It needs the NuGet audit sources, so it runs after `dotnet restore`; an empty report is the expected output.

### Changed

- The `## Origin` block of the generated app's `CLAUDE.md` now records `Framework: dotnet-wpf v<version>` — the repository name, aligned with the five other generators. The skill prefix stays `wpf-`.
- This changelog now follows the shared generator convention: the "changelog of the **generator** itself" header and note, and no `[Unreleased]` section (a version block is created at each release).
- `README.md`: the "Generator family" table rows are ordered as in the five other generators, its stack cell abbreviates like theirs, and the family sentence separates every link with a comma.

## [1.0.0] - 2026-08-11

### Added

- Unified edition baseline: 5-phase generation pipeline (p1 scoping to p5 development), calibration, MVVM contract, error contract (`Result<T>`, snackbars), Fluent theming baseline (WPF UI), UI thread and cancellation rules, Salesforce `sf` v2 integration, and the maintenance skill set.
- 19 skills under `.claude/skills/`, prefix `wpf-`.
- 15 domain rules under `.claude/rules/`, including two with no counterpart in the source framework: `threading.md` (UI thread, `Dispatcher`, `async void`, cancellation) and `packaging.md` (self-contained single-file publish, icon, assembly versions).
- `sf` v2 command/flag catalog under `.claude/sf-cli-reference/`, loaded by section when the Salesforce integration is enabled in Phase 1.
- Pinned package set in `rules/config.md` (WPF UI 4.3.0, CommunityToolkit.Mvvm 8.4.2, Microsoft.Extensions.Hosting 10.0.10, Serilog 10.0.0 / File 7.0.0 / Debug 3.0.0, Microsoft.Data.Sqlite 10.0.10, xunit.v3 3.2.2, Microsoft.NET.Test.Sdk 18.8.1, NSubstitute 6.1.0), and a theming layer written against the verified WPF UI 4.x API surface.

### Notes

- Derived from the Electron App Generator framework v1.5.0. Skill inventory, pipeline, calibration, session and memory conventions are carried over unchanged; everything stack-dependent was rewritten for .NET 10 / C# 14 / WPF.
