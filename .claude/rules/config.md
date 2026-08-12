# Config, dependencies, i18n, logging rules

## `AppConfig.cs` structure

Mandatory minimum structure in every project (`src/App.Wpf/AppConfig.cs`):

```csharp
public static class AppConfig
{
    // Application
    public const string AppName = "AppName";
    public const string AppVersion = "1.0.0";          // mirror of the .csproj <Version> - @rules/versioning.md

    // Accent (design-system.md §2) - the only color literal in C#
    public const string AccentColor = "#4682B4";
    public static Color AccentColorValue { get; } = (Color)ColorConverter.ConvertFromString(AccentColor)!;

    // Database (if applicable) - relative to %APPDATA%\<AppName>
    public const string DbFileName = "app_name.db";
    public const int DbSchemaVersion = 1;               // if DB != none - target schema version, == max(Migrations) - @rules/db.md

    // Preferences (if applicable)
    public const string PreferencesFileName = "preferences.json";

    // Internationalization (if enabled)
    public const string DefaultCulture = "fr";
    public static readonly string[] SupportedCultures = ["fr", "en"];

    // Window
    public const double WindowMinWidth = 1024;
    public const double WindowMinHeight = 768;
    public const double WindowDefaultWidth = 1280;
    public const double WindowDefaultHeight = 800;

    // Snackbar position - layout.md §5 (Phase 3 choice, persisted preference)
    public const string SnackbarPosition = "bottom-right";

    // Logging - @rules/logging.md
    public const string LogLevel = "Information";
    public const long LogMaxBytes = 1_000_000;          // 1 MB, Serilog rolling file limit

    // Splash (if enabled in Phase 3) - minimum on-screen time before dismissal - @rules/splash.md
    public const int SplashMinDurationMs = 1200;
}
```

- Any constant reused in more than one file goes into `AppConfig`.
- Absolute paths are resolved **once**, in a service (`Environment.GetFolderPath(SpecialFolder.ApplicationData)`) - never recomputed in a ViewModel or a View.
- Zero brush, zero size, zero duration in `AppConfig` - visual values live in `Themes/Tokens.xaml`. The accent hex is the single exception: it is data fed to the accent manager, not a style value.

## Project files

### `Directory.Packages.props` - single source of package versions

Central Package Management is on (`<ManagePackageVersionsCentrally>true</ManagePackageVersionsCentrally>`). A `.csproj` declares `<PackageReference Include="..." />` **without a `Version` attribute**; the version lives here and nowhere else.

```xml
<Project>
  <PropertyGroup>
    <ManagePackageVersionsCentrally>true</ManagePackageVersionsCentrally>
    <CentralPackageTransitivePinningEnabled>true</CentralPackageTransitivePinningEnabled>
  </PropertyGroup>
  <ItemGroup>
    <PackageVersion Include="WPF-UI" Version="4.3.0" />
    <PackageVersion Include="CommunityToolkit.Mvvm" Version="8.4.2" />
    <PackageVersion Include="Microsoft.Extensions.Hosting" Version="10.0.10" />
    <PackageVersion Include="Serilog.Extensions.Hosting" Version="10.0.0" />
    <PackageVersion Include="Serilog.Sinks.File" Version="7.0.0" />
    <PackageVersion Include="Serilog.Sinks.Debug" Version="3.0.0" />
    <!-- if DB = SQLite -->
    <PackageVersion Include="Microsoft.Data.Sqlite" Version="10.0.10" />
    <!-- if tests enabled -->
    <PackageVersion Include="xunit.v3" Version="3.2.2" />
    <PackageVersion Include="Microsoft.NET.Test.Sdk" Version="18.8.1" />
    <PackageVersion Include="NSubstitute" Version="6.1.0" />
  </ItemGroup>
</Project>
```

Versions confirmed against nuget.org on 2026-08-11. They are the framework's starting point, not a freeze: re-confirm each one in Phase 1 with `dotnet package search <id> --exact-match` and record the pinned set in `docs/specs/01-scoping.md`.

### `Directory.Build.props` - shared compiler settings

```xml
<Project>
  <PropertyGroup>
    <TargetFramework>net10.0-windows</TargetFramework>
    <LangVersion>14.0</LangVersion>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
    <AnalysisMode>Recommended</AnalysisMode>
    <EnforceCodeStyleInBuild>true</EnforceCodeStyleInBuild>
    <GenerateDocumentationFile>true</GenerateDocumentationFile>
  </PropertyGroup>
</Project>
```

- `TreatWarningsAsErrors` is not negotiable: a warning is a defect, fixed at the root. `#pragma warning disable` requires a written justification on the line above.
- `EnforceCodeStyleInBuild` makes the `.editorconfig` IDE rules build errors, so `dotnet format` and `dotnet build` agree.
- **`ImplicitUsings` does not provide `System.IO` in a WPF project.** The SDK removes it to avoid the ambiguity between `System.IO.Path` and `System.Windows.Shapes.Path`. Every file touching `Path`, `File`, `Directory`, `FileInfo`, `DirectoryInfo`, `Stream` or `IOException` declares `using System.IO;` — application **and** test project, as soon as it carries `UseWPF`. The failure is a wave of `CS0103`/`CS0246` that looks like a broken build configuration and is not.

### Application `.csproj`

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>WinExe</OutputType>
    <UseWPF>true</UseWPF>
    <ApplicationIcon>Assets\icon.ico</ApplicationIcon>
    <Version>1.0.0</Version>            <!-- canonical version - @rules/versioning.md -->
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="WPF-UI" />
    <PackageReference Include="CommunityToolkit.Mvvm" />
    <PackageReference Include="Microsoft.Extensions.Hosting" />
    <PackageReference Include="Serilog.Extensions.Hosting" />
    <PackageReference Include="Serilog.Sinks.File" />
    <PackageReference Include="Serilog.Sinks.Debug" />
  </ItemGroup>
</Project>
```

### `.editorconfig`

Delivered at the project root. Carries the C# formatting conventions, the naming rules, and the severity of the IDE/CA analyzers. Minimum: file-scoped namespaces, `var` only when the type is apparent, `_camelCase` private fields, `PascalCase` members, severity `error` on the rules the framework enforces elsewhere (unused usings, missing `ConfigureAwait` where required by `@rules/threading.md`).

## Dependency notes

- **WPF UI (`WPF-UI` 4.3.0)**: the Fluent control set and theme (`design-system.md`). Ships a `net10.0-windows7.0` target, so it matches the framework's TFM directly. Its namespaces and manager type names moved between the 3.x and 4.x lines - the code in `design-system.md` and `@rules/xaml.md` targets **4.x**; keep the major pinned per project.
- **CommunityToolkit.Mvvm**: source generators for `[ObservableProperty]` and `[RelayCommand]`. Requires the partial-class pattern on every ViewModel.
- **Microsoft.Extensions.Hosting**: `IHost` composition root, DI container, configuration, and the Serilog integration point.
- **Serilog**: mandatory in every project (`@rules/logging.md`).
- **Microsoft.Data.Sqlite**: only if the Phase 1 DB choice is SQLite (`@rules/db.md`). No EF Core - migrations are hand-written.
- **Tests (if enabled in Phase 1)**: `xunit.v3`, `Microsoft.NET.Test.Sdk`, and the runner package in the test project only. Detail: `@rules/tests.md`.

> **Version maintenance**: package versions age quickly. Re-confirm the current stable version and the target-framework compatibility of every package at generation, and record what was pinned. Never carry a version number over from another project without checking it.

## Internationalization (if enabled in Phase 1)

- `.resx` resource files under `src/App.Wpf/Resources/`: `Strings.resx` (neutral, FR) and `Strings.en.resx`.
- **Write `Strings.Designer.cs` next to the `.resx`, never generate it at build time.** The WPF markup compilation pass builds a temporary project (`<Name>_xxxxx_wpftmp.csproj`) that does not run resource generation: an accessor produced into `obj/` does not exist during that pass, and every `{x:Static properties:Strings.Key}` fails with `CS0103` pointing at a project whose name does not appear anywhere in the solution. Declare it as `<Compile Update="Resources\Strings.Designer.cs"><DependentUpon>Strings.resx</DependentUpon></Compile>`, generate its body from the `.resx` (read the XML with `XmlDocument.Load` — `Get-Content` mangles accents on PowerShell 5.1), and start the file with `#nullable enable`: a file marked `<auto-generated>` needs it before using nullable annotations.
- All visible strings go through the generated `Strings.Key` accessor, bound from XAML via a `{x:Static}` reference or a localization markup extension - never a literal in a `Content` or `Text` attribute.
- Dotted-notation keys per entity, expressed as resource names: `Record_Saved`, `Nav_Settings`.
- Culture loaded at startup from preferences, FR by default: set `CultureInfo.DefaultThreadCurrentUICulture` before the first window is created.
- Culture change: requires re-resolving the bound strings. Either re-create the shell or expose the strings through an observable localization service. State which one the project uses in the Phase 4 contract.
- Zero visible hardcoded string in Views, ViewModels, or Services. If i18n is not enabled: a single `Strings.resx` anyway (future toggle at zero cost) - exception: a "Small" project where a `Labels` static class is enough.

## Logging

Summary - full detail in `@rules/logging.md`.

- Serilog configured on the `IHost` builder, before any service resolves.
- File sink: `%APPDATA%\<AppName>\logs\app-.log`, rolling, capped at `AppConfig.LogMaxBytes`, level `AppConfig.LogLevel` (`Debug` if env var `[APP_NAME]_DEBUG=1`).
- Zero `Console.WriteLine` / `Debug.WriteLine` in delivered code - only `ILogger<T>`.

## Packaging

Moved out of this rule: see `@rules/packaging.md` (publish profile, self-contained single-file output, application icon, assembly versions, ZIP archive).

## `.gitignore`

Delivered at the project root in the last batch (`@rules/mvvm.md` batch table · `/wpf-p5-development`). Single source of truth for what stays out of the repo. Comments in English (the authoring language).

```gitignore
# --- Build outputs ---------------------------------------------------------
bin/
obj/
/publish/
/artifacts/
.env

# --- App runtime data (defensive; normally under %APPDATA%, outside the repo) -
*.db
preferences.json
logs/

# --- Visual Studio / Rider -------------------------------------------------
.vs/
.idea/
*.user
*.suo

# --- Claude Code -----------------------------------------------------------
# Personal, never committed.
.claude/settings.local.json
.claude/agent-memory/
# NOTE: .claude/settings.json IS a delivered asset - do NOT ignore it.

# Local work plan - never committed.
tasks/

# Private specs. Only the published changelog is committed.
docs/*
!docs/release/
docs/release/*
!docs/release/CHANGELOG.md

# OS noise.
.DS_Store
Thumbs.db
desktop.ini
```

- **`bin/` and `obj/` are unanchored on purpose** - every project of the solution produces them, at every depth.
- **Publish output is anchored** (`/publish/`, `/artifacts/`) - the leading slash confines the pattern to the repo root so a folder named `publish` inside `docs/` is never swallowed.
- **App runtime data is defensive** (`*.db`, `preferences.json`, `logs/`) - the app writes the SQLite DB, `preferences.json`, and logs under `%APPDATA%` (`@rules/security.md`), never the project folder. The patterns are a safety net; no legitimate committed file uses these names.
- **Never ignored** (delivered assets): `docs/release/CHANGELOG.md` (the negated pattern above), `.claude/settings.json`, the generated root `CLAUDE.md`, `tests/`, `Directory.Packages.props`, and `Directory.Build.props`.
- Verify the template with `git add -A` + `git status`, **not** only `git check-ignore` - the negation rules make `check-ignore` misleading.

## Integrity verification

Detailed in `@rules/verification.md`. Key points: every constant reused in more than one file lives in `AppConfig` (zero visual value there, the accent hex excepted); no `Version` attribute on any `PackageReference` (Central Package Management is the single source); `Directory.Build.props` carries `Nullable`, `TreatWarningsAsErrors`, and `EnforceCodeStyleInBuild`; `.editorconfig` present at the root; package versions confirmed at generation and recorded in the scoping spec; i18n resources complete when enabled.
