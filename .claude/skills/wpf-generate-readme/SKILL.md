---
name: wpf-generate-readme
description: Analyze the specs and source of an existing WPF project and generate its README.md (objective, features, stack, tree, services and commands, conventions, installation). Invoke from the target project root.
model: sonnet
---

# /wpf-generate-readme — Generate the README.md

## Role
Technical writer — produce an accurate project README from specs + code.

## Goal
Write a README that reflects what was actually built.

## Deliverable
`README.md` at the project root.

---

Prerequisite: invoked from the target project root.

Use the native Claude Code tools (no shell — Windows-compatible):

1. **Sources, in priority**: `docs/specs/*` (especially `04-architect.md`) for the intended structure, then the real code:
   - List source files via `Glob` `src/**/*` (exclude `bin/`, `obj/`, `publish/`).
   - Read the `.sln`, `Directory.Packages.props`, the application `.csproj`, `AppConfig.cs`, `App.xaml.cs` (DI registrations), `Models/`, `Services/`, `ViewModels/`, `Views/`, `Themes/`.
   - Detect the test project via `Glob` `tests/**/*Tests.cs`.
   - When specs and code disagree, the code is what shipped — describe the code and note the divergence.
2. Generate `README.md` at the root via `Write`. Write the README in English (public-facing document) — see `@rules/readme.md`:

```markdown
# [APP_NAME] — v[VERSION]

## Objective
[Inferred from docs/specs, AppConfig and the structure — 2 sentences max]

## Features
- [Inferred from the present Views/ and Services/]

## Technical stack
- OS: Windows · Runtime: .NET 10 · C# 14 · WPF · WPF UI (Fluent) · Icons: Segoe Fluent Icons
- Composition: IHost + Microsoft.Extensions.DependencyInjection · MVVM: CommunityToolkit.Mvvm
- DB: [inferred from Directory.Packages.props and Services/Data/]
- i18n: [Yes/No — inferred from Resources/*.resx]
- Salesforce CLI: [Yes/No — inferred from Services/SfCliService.cs + the `SfPath` preference]
- Tests: [Yes (xUnit v3) | No — inferred from the presence of tests/]

## Architecture
[Actual file tree with the role of each file]

## Services and commands
[table command → service method → data touched → consuming view]

## Conventions
[MVVM, XAML resource tokens, snackbars, UI thread, security — pointer to the rules]

## Prerequisites
- .NET SDK 10.0+ to build; nothing to install to run a self-contained publish.
<!-- Only if the Salesforce CLI integration is on: the `sf` v2 CLI must be installed and on the PATH (or set the `SfPath` preference). The official standalone installer ships its own Node and avoids the npm `.cmd` shim. The Salesforce DX tooling is an optional recommendation, not required. -->

## Installation
dotnet restore
dotnet run --project src/App.Wpf     # development
dotnet build                         # compilation (warnings are errors)
dotnet format --verify-no-changes    # format + analyzers
dotnet publish src/App.Wpf -c Release -p:PublishProfile=win-x64   # Windows packaging - project path mandatory, app closed

## Tests
[Section included only if tests/ detected]
dotnet test

## Palette
[Name or custom accent (+ any explicit overrides) inferred from Themes/Tokens.*.xaml and AppConfig.AccentColor — accent variants derived by the theme; otherwise default "Steel Blue" palette]
```
<!-- If packaging is enabled, note that an unsigned executable triggers a SmartScreen warning on first run (@rules/packaging.md) -->

3. Write the file via `Write` (never a shell heredoc — Windows-incompatible).
4. If anything is undeterminable from specs + code: ask the closed questions with `AskUserQuestion` (clickable options) before writing.

Confirm with: `README.md generated at the project root.`
