# WPF App Generator - Unified

> Claude Code generator for **Windows desktop apps** - .NET 10 · C# 14 · WPF · MVVM.

Part of a family of Claude Code generators. See also [electron-app-generator](https://github.com/TiercelinQ/electron-app-generator) [flutter-app-generator](https://github.com/TiercelinQ/flutter-app-generator), [python-app-generator](https://github.com/TiercelinQ/python-app-generator), [sf-node-generator](https://github.com/TiercelinQ/sf-node-generator), and [vscode-ext-generator](https://github.com/TiercelinQ/vscode-ext-generator).

Unified edition: the full generation pipeline **plus** post-delivery maintenance skills, an explicit role per skill, persisted specs, centralized executable verification, and native memory.

---

## What it does

A structured prompt system that generates complete, production-ready WPF desktop applications through a 5-phase cycle, then maintains them:

1. **Scoping** - 8 questions (objective, DB, prefs, i18n, tests, icon, packaging, Salesforce CLI opt-in) + color palette (named or custom; accent + optional overrides, Fluent accent variants derived, WCAG AA check)
2. **Featuring** - structured feature sheet, explicit out-of-scope, locked sizing
3. **Surfaces** - navigation pattern, drawer/dialog, snackbar position (6 positions), splash screen
4. **Architect** - full file tree, service/command table, tokens→resource table - locked before any code is written
5. **Development** - auto-chained batch delivery, seed script if a DB is used

Each phase writes a spec in the user's language to `docs/specs/` (`01-scoping` … `04-architect`); the contract is the source of truth.

**Maintenance commands**: `/wpf-add-feature` (add a feature, contract-compliant — explicit contract-diff validation before writing), `/wpf-trace-feature` (trace behavior), `/wpf-fix-issue` (root-cause debugging with a decision tree), `/wpf-refactor-code` (validated, behavior-preserving), `/wpf-migrate-design` (convert a legacy app to the Fluent baseline), `/wpf-release` (cut a SemVer release from the accumulated changelog), `/wpf-run-tests` (executable verification). Plus `/wpf-load-project` and `/wpf-generate-readme` to load/document existing apps.

Every generated app enforces the same Fluent theming baseline, strict MVVM architecture, and the same threading and data rules.

---

## Generated app stack

| Element        | Value                                                                                   |
| -------------- | --------------------------------------------------------------------------------------- |
| Target OS      | Windows                                                                                 |
| Runtime        | .NET 10 (LTS)                                                                           |
| Language       | C# 14 - nullable enabled, warnings as errors                                            |
| UI             | WPF - XAML views, WPF UI (lepoco/wpfui) Fluent controls                                 |
| Build          | `dotnet build` on a `.sln` (Debug/Release)                                              |
| Architecture   | Strict MVVM - Views (XAML) · ViewModels · Services · Models                             |
| Styling        | Merged `ResourceDictionary` - `Themes/Tokens.xaml` + `Themes/Styles.xaml`               |
| Icons          | Segoe Fluent Icons glyphs / WPF UI `SymbolIcon`                                         |
| i18n           | `.resx` + `ResourceManager` FR/EN (opt-in)                                              |
| DB             | SQLite (Microsoft.Data.Sqlite, versioned migrations) · JSON · CSV · none (opt-in)       |
| Logging        | Serilog (file + debug sinks, mandatory)                                                 |
| Tests          | xUnit v3 (opt-in)                                                                       |
| Salesforce CLI | `sf` v2 wrapper via `Process` + starter Org Manager (opt-in)                            |
| Packaging      | `dotnet publish` self-contained single-file + ZIP (opt-in)                              |
| Composition    | `IHost` + Microsoft.Extensions.DependencyInjection                                      |
| Quality        | Roslyn analyzers + `dotnet format` · XML doc on public API · `Result<T>` error contract |

---

## Requirements

```bash
claude --version    # Claude Code CLI - installed and authenticated
dotnet --version    # .NET SDK 10.0+
```

---

## Getting started

```bash
cd dotnet-wpf
claude
```

Then in Claude Code:

```
/wpf-app
```

---

## Commands

| Command                | Action                                                   |
| ---------------------- | -------------------------------------------------------- |
| `/wpf-app`             | Start menu (4 entry points incl. maintenance)            |
| `/wpf-p1-scoping`      | Scoping - 8 questions + color palette                    |
| `/wpf-p2-featuring`    | Featuring - requirements sheet + locked sizing           |
| `/wpf-p3-surfaces`     | Surfaces - layout proposal + customization               |
| `/wpf-p4-architect`    | Architect - locked architecture contract (services)      |
| `/wpf-p5-development`  | Auto-chained batch delivery                              |
| `/wpf-add-feature`     | Add a feature to a shipped project (contract diff first) |
| `/wpf-trace-feature`   | Trace a feature across the MVVM layers                   |
| `/wpf-fix-issue`       | Fix a bug - decision tree, root cause                    |
| `/wpf-refactor-code`   | Refactor under explicit validation only                  |
| `/wpf-migrate-design`  | Convert a legacy app to the Fluent baseline              |
| `/wpf-release`         | Cut a SemVer release from the accumulated changelog      |
| `/wpf-run-tests`       | Executable verification (build, format, test)            |
| `/wpf-load-project`    | Load an existing project from its specs/README           |
| `/wpf-generate-readme` | Generate README.md for an existing project               |
| `/wpf-save-session`    | Save current session state                               |
| `/wpf-show-state`      | Current project status                                   |
| `/wpf-show-contract`   | Display locked architecture contract                     |
| `/wpf-save-memory`     | Persist a note in Claude Code native memory              |

---

## Generated app structure

```
my-app/
├── MyApp.sln · Directory.Packages.props · Directory.Build.props · .editorconfig
├── README.md
├── CLAUDE.md                      # Project identity (origin, business context, deviations)
├── .claude/settings.json          # Guardrails + verification hook (self-enforced app)
├── docs/specs/                    # Generation specs (user's language): 01-scoping … 04-architect
├── docs/release/CHANGELOG.md      # SemVer changelog (Keep a Changelog)
├── docs/sessions/SESSION_<App>_S0.md  # Delivery baseline session (auto, end of Phase 5)
├── src/App.Wpf/
│   ├── App.xaml · App.xaml.cs     # Entry point, IHost composition root
│   ├── AppConfig.cs               # Application constants
│   ├── Models/                    # DTOs, entities, named business exceptions
│   ├── Services/                  # Business logic, data access, Result<T>
│   ├── ViewModels/                # ObservableObject + RelayCommand
│   ├── Views/                     # XAML windows, pages, layout controls
│   ├── Resources/                 # .resx strings (if i18n)
│   ├── Themes/                    # Tokens.xaml · Styles.xaml (merged after Fluent)
│   └── Assets/                    # .ico icon, packaging assets
└── tests/App.Wpf.Tests/           # xUnit v3 (if enabled)
```

---

## Versioning & changelog

Every generated app carries a SemVer version and a changelog at `docs/release/CHANGELOG.md` (Keep a Changelog format, written in English). Maintenance skills (`add-feature`, `fix-issue`, `refactor-code`, `migrate-design`) accumulate entries under `## [Unreleased]`; `/wpf-release` freezes them into a dated version block and bumps the version source (the `.csproj` `<Version>` + the `AppConfig.AppVersion` mirror). The version is never bumped silently. See `rules/versioning.md`.

---

## Design system

All generated apps share the same visual baseline, defined in `.claude/design-system.md`:

- **Fluent by default** - WPF UI (lepoco/wpfui) supplies the WinUI 3 control set (NavigationView, InfoBar, Snackbar, TitleBar, Card) and the Fluent theme; surfaces and elevation come from the theme, not from a bespoke token doctrine
- **XAML resources** - all colors, sizes and durations are `{StaticResource}` / `{DynamicResource}` keys declared in `Themes/Tokens.xaml`; light/dark switched at runtime through the theme manager
- **Segoe UI Variable** typography (Windows 11 native face)
- **Color palette** - one mandatory accent (+ up to 4 optional role overrides); accent variants derived by the accent manager, the other roles override Fluent brushes. Default "Steel Blue" + Teal, Forest, Slate, Amber, Ruby named palettes + custom palette
- **Segoe Fluent Icons** glyphs and one signature gesture: the NavigationView selection indicator
- **Snackbars only** - no inline banners, no `MessageBox` for business errors

---

## Security

`.claude/rules/security.md` is non-negotiable, applied to 100% of generated apps: user data under `%APPDATA%`, secrets through DPAPI, SQL always parameterized, external processes spawned with an argument list, file paths resolved and confined, WebView2 hardened when used. `.claude/rules/threading.md` is its counterpart on the UI thread: `Dispatcher` marshalling, no `async void` outside handlers, cancellation on every long-running operation. `/wpf-fix-issue` and `/wpf-add-feature` always route through both.

---

## Documentation

- [GUIDE.md](GUIDE.md) - full usage guide (FR)
- `.claude/design-system.md` - Fluent theming reference
- `.claude/layout.md` - layout companion (pattern catalog + proposed default composition + snackbar spec)
- `.claude/rules/` - domain rules:
  - `mvvm.md` · `xaml.md` · `errors.md` · `threading.md` · `security.md` · `config.md` · `packaging.md` · `db.md` · `sf-cli.md` (opt-in) · `splash.md` (opt-in) · `tests.md` (opt-in) · `logging.md` · `readme.md` · `versioning.md`
  - `verification.md` - single source of truth for executable + static checks
- `.claude/sf-cli-reference/` - `sf` v2 command/flag catalog (loaded by section when the Salesforce integration is on)

---

## Generator family

| Generator                                                                          | Stack                                    | Target            |
| ---------------------------------------------------------------------------------- | ---------------------------------------- | ----------------- |
| [electron-app-generator](https://github.com/TiercelinQ/electron-app-generator)     | Node.js · Electron · React · TypeScript. | Windows desktop   |
| [python-app-generator](https://github.com/TiercelinQ/python-app-generator)         | Python · PySide6 · QSS                   | Windows desktop   |
| [dotnet-wpf-app-generator](https://github.com/TiercelinQ/dotnet-wpf-app-generator) | .NET 10 · C# · WPF · MVVM                | Windows desktop   |
| [flutter-app-generator](https://github.com/TiercelinQ/flutter-app-generator)       | Flutter · Dart · Riverpod                | Android           |
| [sf-node-generator](https://github.com/TiercelinQ/sf-node-generator)               | Node.js · TypeScript · Salesforce CLI    | Headless CLI      |
| [vscode-ext-generator](https://github.com/TiercelinQ/vscode-ext-generator)         | TypeScript · esbuild · native theming    | VS Code extension |

---

## License

MIT
