# Changelog

All notable changes to this generator are documented in this file.
The format is based on Keep a Changelog, and this project adheres to Semantic Versioning.
(This is the changelog of the **generator** itself, distinct from the `docs/release/CHANGELOG.md` of each generated app.)

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
