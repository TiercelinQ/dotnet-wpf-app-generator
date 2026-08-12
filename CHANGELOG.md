# Changelog

All notable changes to this framework are documented in this file.
The format is based on Keep a Changelog, and this project adheres to Semantic Versioning.

## [Unreleased]

## [1.0.0] - 2026-08-11

### Added

- Unified edition baseline: 5-phase generation pipeline (p1 scoping to p5 development), calibration, MVVM contract, error contract (`Result<T>`, snackbars), Fluent theming baseline (WPF UI), UI thread and cancellation rules, Salesforce `sf` v2 integration, and the maintenance skill set.
- 19 skills under `.claude/skills/`, prefix `wpf-`.
- 15 domain rules under `.claude/rules/`, including two with no counterpart in the source framework: `threading.md` (UI thread, `Dispatcher`, `async void`, cancellation) and `packaging.md` (self-contained single-file publish, icon, assembly versions).
- `sf` v2 command/flag catalog under `.claude/sf-cli-reference/`, loaded by section when the Salesforce integration is enabled in Phase 1.
- Pinned package set in `rules/config.md` (WPF UI 4.3.0, CommunityToolkit.Mvvm 8.4.2, Microsoft.Extensions.Hosting 10.0.10, Serilog 10.0.0 / File 7.0.0 / Debug 3.0.0, Microsoft.Data.Sqlite 10.0.10, xunit.v3 3.2.2, Microsoft.NET.Test.Sdk 18.8.1, NSubstitute 6.1.0), and a theming layer written against the verified WPF UI 4.x API surface.

### Notes

- Derived from the Electron App Generator framework v1.5.0. Skill inventory, pipeline, calibration, session and memory conventions are carried over unchanged; everything stack-dependent was rewritten for .NET 10 / C# 14 / WPF.
