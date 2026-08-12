---
name: wpf-migrate-design
description: Convert a WPF app built before the Fluent baseline to the current design system — WPF UI theme, resource-key tokens, Segoe Fluent Icons, snackbar feedback, dictionary-swap dark mode — without changing any behavior. Proposed by /wpf-load-project when a legacy app is detected; runs only on explicit validation.
model: sonnet
---

# /wpf-migrate-design — Convert a legacy app to the Fluent baseline

## Role
Migration engineer — re-skin a delivered app to the current design system with zero behavior change.

## Goal
The app renders under the full Fluent baseline (theme, resource-key tokens, icons, states, feedback) while every feature, service, and business rule behaves exactly as before.

## Deliverable
The converted files on disk (theme dictionaries, styles, icon usages, package swap) + refreshed app `README.md` / `CLAUDE.md` / `docs/specs/04-architect.md` token table + passing verification + a conversion summary.

---

## Prerequisite

The project is loaded (`/wpf-load-project`) and detected as **legacy** (README reference; markers: no `WPF-UI` package reference, hardcoded brushes in the styles, a hand-rolled token dictionary, `MessageBox` used for feedback). If the app is already on the Fluent baseline, say so and stop.

**Load context**: `design-system.md` + `layout.md` + `@rules/xaml.md` + `@rules/config.md` + `@rules/mvvm.md` (cleanup protocol) + `@rules/errors.md` (feedback contract) + `@rules/splash.md` (if the app has a splash) + `@rules/verification.md`, and the app's `docs/specs/01-scoping.md` (original palette choice) + `docs/specs/04-architect.md` (locked contract).

## Step 1 — Inventory (read-only)

- Theme resources: current dictionaries, brush definitions, where the accent lives.
- `docs/specs/01-scoping.md`: was the palette a **named preset** (Steel Blue, Teal…) or **custom** (explicit role overrides)?
- Styles: hover and pressed triggers, transitions, corner radii, shadow effects, control templates that would collide with the Fluent templates.
- The application `.csproj` / `Directory.Packages.props`: which UI packages are referenced.
- Views (`Grep` for the current icon mechanism — a `Path` geometry, a glyph font, a third-party icon pack): every icon usage, per file.
- Feedback surfaces (`Grep` for `MessageBox`): every business message that must become a snackbar or a styled dialog.
- Splash presence (`SplashWindow.xaml` + any background literal in `App.xaml.cs`).
- The retained composition (`docs/specs/03-surfaces.md`): which shell pattern the app uses.

## Step 2 — Palette conversion decision

- **Preset palette** → apply the accent through the accent manager and keep every other brush at its Fluent value. Full Fluent atmosphere.
- **Custom palette** → the roles the user explicitly chose in Phase 1 (recorded in `01-scoping.md`) become **overrides** in `Themes/Tokens.Light.xaml` / `Themes/Tokens.Dark.xaml`; everything else stays Fluent.
- Announce the resulting brush set and run the **AA contrast check** (same pairs as `/wpf-p1-scoping` §2), reporting failures without blocking.

## Step 3 — Conversion plan (validation gate)

Present the plan (in the user's language): files touched, the icon mapping table (below) instantiated with the icons actually found, the `MessageBox` replacement list, the palette decision, and the note that **no behavior changes** (no service, ViewModel command, or resource string edit). **→ Validation required before writing.**

## Step 4 — Conversion (single batch, complete files)

1. **Packages** — add `WPF-UI` to `Directory.Packages.props` and the application `.csproj` (pin the current stable, `@rules/config.md`); remove the superseded UI package if one exists.
2. **`App.xaml`** — merge the Fluent dictionaries first, then `Themes/Tokens.xaml`, then the theme token dictionary, then `Themes/Styles.xaml`, in that order (`@rules/xaml.md`). Remove any dictionary the Fluent theme replaces.
3. **`Themes/Tokens.xaml`** — the full token set as resource keys: typography, spacings (`Thickness`), fixed sizes, `CornerRadiusSm`/`CornerRadiusMd`, border widths, opacities, transitions, z-order, and the brush aliases (`Icon*Brush`, `Chart*Brush`). `Tokens.Light.xaml` / `Tokens.Dark.xaml` carry only the palette overrides.
4. **`Themes/Styles.xaml`** — rebuilt on the Fluent templates: hover and pressed come from the theme's visual states (delete the hand-written triggers that duplicate them); every literal value routed through a resource key; every `DropShadowEffect` removed (Fluent surfaces carry the depth); corner radii routed through the two radius tokens.
5. **Theme switching** — replace any hand-rolled theme test or per-element `DynamicResource` juggling with the theme manager swap in `Services/AppThemeService.cs`, re-applying the accent for the new theme (`@rules/xaml.md`).
6. **Icons** — replace each legacy icon with its `ui:SymbolIcon` equivalent (table below), size from the `IconSize*` tokens, `Foreground` from the matching `Icon*Brush`. Remove the retired icon assets and their build entries.
7. **Feedback** — replace every business `MessageBox.Show` with the snackbar service, and every confirmation with the styled dialog (`layout.md` §5 and §8, `@rules/errors.md`). The ViewModel keeps the same decision points; only the surface changes.
8. **Splash** (if the app has one) — `Themes/Splash.xaml` follows the new dictionaries automatically; update the composition-root background literal to the new application background, keeping its sourced-from comment (`@rules/splash.md`).
9. **Docs** — app `README.md`: design system reference → the current version (+ layout version), stack line Icons → Segoe Fluent Icons, UI line → WPF UI; app `CLAUDE.md`: dated migration note under `## Deviations from the framework` (or a `## Design system migration` block); `docs/specs/04-architect.md`: refresh the tokens → resources table, append a dated migration note (this validated run is the contract amendment).
10. **Changelog** — append a `### Changed` entry under `## [Unreleased]` in `docs/release/CHANGELOG.md` (`@rules/versioning.md`): `- Migrated UI to the Fluent design system baseline.` (English, no version bump; migrate-design infers MINOR at `/wpf-release`). If the file is absent (legacy app never initialized), skip silently and suggest `/wpf-load-project`.

### Icon mapping — common intent → `ui:SymbolIcon`

| Intent | Symbol | Intent | Symbol |
| ------ | ------ | ------ | ------ |
| home | `Home24` | search | `Search24` |
| settings | `Settings24` | add | `Add24` |
| success | `CheckmarkCircle24` | delete | `Delete24` |
| warning | `Warning24` | edit | `Edit24` |
| error | `DismissCircle24` | save | `Save24` |
| info | `Info24` | close | `Dismiss24` |
| light / dark theme | `WeatherSunny24` / `WeatherMoon24` | menu | `Navigation24` |
| expand / collapse | `ChevronRight24` / `ChevronDown24` | user | `Person24` |
| import / export | `ArrowDownload24` / `ArrowUpload24` | refresh | `ArrowSync24` |
| confirm | `Checkmark24` | sign out | `SignOut24` |

Every symbol above is verified present in `SymbolRegular` for WPF UI 4.3.0. Any icon not in this table: pick the closest member of `SymbolRegular`, verify it compiles (the build is the guard), and list the chosen mapping in the conversion summary. Symbol names differ across WPF UI majors — confirm them against the pinned version before writing. Never invent a symbol name.

## Step 5 — Verification and summary

- Run `@rules/verification.md §A` in full (`dotnet restore` → `build` → `format --verify-no-changes`; `dotnet test` if the project has tests) — a failure is blocking.
- Residual grep in `src/`: no `DropShadowEffect`, no `MessageBox.Show` for a business message, no hardcoded `#RRGGBB` outside the token dictionaries (the commented splash background excepted), no reference to the retired icon mechanism or package.
- Manual visual pass by the user: state that surfaces, corner radii, hover, icons, and the feedback surface are the only intended visible changes — every feature must behave identically. Report the conversion summary (files, icon mappings, `MessageBox` replacements, AA results).
- After an anomaly: cleanup protocol (`@rules/mvvm.md`), then offer `/wpf-save-memory`.

## Anti-patterns — what NOT to do

- **Do not** run without the Step 3 validation, and do not convert partially — the app is either fully legacy or fully Fluent (never a mix).
- **Do not** touch models, services, ViewModel logic, resource strings, or any business rule — this is a re-skin.
- **Do not** redesign the layout/composition — the retained Phase 3 composition stays; only its skin changes.
- **Do not** improvise a symbol name — map it, verify it compiles, report it.
- **Do not** leave dead residue (retired package, unused icon assets, orphan brush definitions, dead triggers).
- **Do not** convert the palette of a custom-palette app without preserving its explicitly chosen roles as overrides (Step 2).
- **Do not** keep a hand-written control template that fights the Fluent template — remove it or declare it as a deliberate exception in the summary.

## Integrity verification

Detailed in `@rules/verification.md`. Key points: §A executable suite green after conversion; no legacy theming residue in `src/` or the project files; the dictionaries merged in the documented order with the tokens and styles fully on resource keys; theme switching done by the manager swap; feedback on snackbars and styled dialogs; app README/CLAUDE.md/04-architect.md updated with the current design-system reference and the dated migration note.
