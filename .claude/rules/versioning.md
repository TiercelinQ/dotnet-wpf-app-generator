# Versioning & changelog rules - WPF app

> The generated app keeps a human-readable changelog and a SemVer version. This rule defines the changelog format, where the version lives, how each maintenance operation feeds the changelog, and how `/wpf-release` cuts a version. Referenced by `/wpf-p5-development`, `/wpf-add-feature`, `/wpf-fix-issue`, `/wpf-refactor-code`, `/wpf-migrate-design`, `/wpf-load-project`, and `/wpf-release`.

## Canonical file - `docs/release/CHANGELOG.md`

- The changelog lives at **`docs/release/CHANGELOG.md`** (create the `docs/release/` folder if absent). This is the single source of truth for the app's release history.
- **Written in English**, regardless of the user's language - it is a deploy artifact meant to be pasted into a GitHub release. (Specs stay in the user's language; the README and the changelog are English.)
- Format: **[Keep a Changelog](https://keepachangelog.com/en/1.1.0/)** + **[Semantic Versioning](https://semver.org/spec/v2.0.0.html)**.

Seed written at generation (Phase 5):

```markdown
# Changelog

All notable changes to this project are documented in this file.
The format is based on Keep a Changelog, and this project adheres to Semantic Versioning.

## [Unreleased]

## [1.0.0] - <YYYY-MM-DD>
### Added
- Initial release.
```

## Entry categories

Under `## [Unreleased]`, group entries in these sections (Keep a Changelog), in this order, omitting empty ones:

- `### Added` - a new feature/capability (backward compatible).
- `### Changed` - a change to existing behavior, an internal refactor, a UI migration.
- `### Fixed` - a bug fix.
- `### Removed` - a removed feature/capability.
- `### Security` - a security fix.

A **breaking change** (incompatible with the previous version) is marked with a leading `**BREAKING:**` in its entry (usually under `Changed` or `Removed`). This marker drives the MAJOR inference at release.

## Version source - single source + mirrors

- **Canonical**: the application `.csproj` `<Version>`.
- **Mirror**: `AppConfig.AppVersion` - must equal the `.csproj` `<Version>` at all times. `/wpf-release` writes both; verification asserts the equality (`@rules/verification.md`).
- **Derived**: `AssemblyVersion`, `FileVersion`, and `InformationalVersion` derive from `<Version>` in `Directory.Build.props` and are never edited by hand (`@rules/packaging.md`).
- The version at the **top released block** of `docs/release/CHANGELOG.md` must match the canonical version. Between releases, `[Unreleased]` sits above it and carries the pending entries.

## SemVer mapping (per maintenance operation)

Operations **accumulate** entries under `[Unreleased]` - they do **not** bump the version. The bump happens once, at `/wpf-release`. The mapping below is what each operation contributes, and what the release inference reads:

| Operation | Changelog section | Release effect |
| --------- | ----------------- | -------------- |
| `add-feature` | `Added` (+ `Changed` if it alters existing behavior) | MINOR |
| `fix-issue` | `Fixed` | PATCH |
| `refactor-code` | `Changed` (internal) | PATCH |
| `migrate-design` | `Changed` (UI migrated to the Fluent baseline) | MINOR |
| breaking change (any op) | `**BREAKING:**` marker (`Changed`/`Removed`) | MAJOR |

## Release inference (`/wpf-release`)

From the accumulated `[Unreleased]` entries, infer the increment:

1. Any `**BREAKING:**` marker or a `Removed` entry -> **MAJOR**.
2. Else any `Added` entry -> **MINOR**.
3. Else (only `Fixed` / internal `Changed`) -> **PATCH**.

The inferred increment is **proposed** to the user (`AskUserQuestion`, inferred option preselected as recommended); the user can override - notably to force a MAJOR the inference cannot detect. MAJOR is never applied silently.

### What counts as breaking (MAJOR) for a WPF app

- A feature/view removed that a user relied on.
- A DB schema migration that cannot read the previous data format (`@rules/db.md`).
- A preferences format change that requires manual user action.
- Dropping support for an OS or runtime baseline (Windows version, target framework).
- A change to the on-disk data location, so an existing install loses its data unless the user moves it.

## Anti-patterns - what NOT to do

- **Do not** put the changelog at the project root - it lives in `docs/release/CHANGELOG.md`.
- **Do not** write the changelog in the user's language - English only.
- **Do not** bump the `.csproj` `<Version>` or `AppConfig.AppVersion` in a maintenance operation - only `/wpf-release` bumps.
- **Do not** let `AppConfig.AppVersion` diverge from the `.csproj` `<Version>`.
- **Do not** hand-edit `AssemblyVersion` / `FileVersion` - they derive.
- **Do not** apply a MAJOR bump without explicit user confirmation.
- **Do not** leave stale entries under `[Unreleased]` after a release - they move into the cut version block, and `[Unreleased]` is reset empty.

## Integrity verification

Detailed in `@rules/verification.md`. Key points: `docs/release/CHANGELOG.md` present and Keep a Changelog-shaped; the top released version matches the `.csproj` `<Version>` and `AppConfig.AppVersion` (all three equal); every maintenance change added an `[Unreleased]` entry in the right category (no silent change); after a release, `[Unreleased]` is reset empty and the cut block carries the correct version + date.
