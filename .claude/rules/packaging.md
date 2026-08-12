# Packaging rules - WPF

> Opt-in in Phase 1. When packaging = `Yes`, the last batch delivers the publish profile, the icon wiring, and the publish instructions. Also available later on explicit request. This rule has no counterpart in the source framework, where packaging was a section of the config rule; it is separated here because the .NET publish surface (runtime identifier, trimming, single-file, assembly versions) is large enough to stand on its own.

## Distribution model

**Self-contained, single-file, portable.** The output is one `.exe` the user copies and runs. No installer, no runtime prerequisite, no code-signing certificate, no store submission.

| Aspect          | Value                                                        |
| --------------- | ------------------------------------------------------------ |
| Runtime         | self-contained (`--self-contained true`)                     |
| Runtime identifier | `win-x64` (add `win-arm64` only if asked)                 |
| Output shape    | single file (`PublishSingleFile`)                            |
| Compression     | on (`EnableCompressionInSingleFile`)                         |
| Trimming        | **off** - WPF is not trim-compatible                         |
| ReadyToRun      | optional, on by default (faster cold start, larger binary)   |
| Delivery        | ZIP archive of the publish folder                            |

Cost: roughly 70-150 MB per binary. That is the accepted price of "no runtime to install". A framework-dependent publish is the alternative when the target machine is known to carry the matching .NET runtime; it is a per-project decision recorded in the scoping spec, not a default.

## Publish profile

`src/App.Wpf/Properties/PublishProfiles/win-x64.pubxml`, delivered commented:

```xml
<Project>
  <PropertyGroup>
    <PublishProtocol>FileSystem</PublishProtocol>
    <Configuration>Release</Configuration>
    <Platform>Any CPU</Platform>
    <TargetFramework>net10.0-windows</TargetFramework>
    <RuntimeIdentifier>win-x64</RuntimeIdentifier>
    <SelfContained>true</SelfContained>
    <PublishSingleFile>true</PublishSingleFile>
    <EnableCompressionInSingleFile>true</EnableCompressionInSingleFile>
    <PublishReadyToRun>true</PublishReadyToRun>
    <PublishTrimmed>false</PublishTrimmed>       <!-- WPF is not trim-safe. Never set to true. -->
    <PublishDir>..\..\publish\win-x64\</PublishDir>
  </PropertyGroup>
</Project>
```

Command:

```bash
dotnet publish src/App.Wpf -c Release -p:PublishProfile=win-x64
```

Two conditions, both of which have broken a delivery:

- **The project path is mandatory.** Without it the command targets the solution, so the test
  project is published too and fails with `NETSDK1151: a self-contained executable cannot be
  referenced by a non-self-contained one`. Write the path in every instruction handed to the
  user, and never document a form that has not been run as written.
- **The application must be closed.** A running instance locks its own executable and
  `GenerateBundle` fails with `UnauthorizedAccessException`. Say so in the README next to the
  command.

`PublishSingleFile` alone leaves WPF's native libraries loose next to the executable — the
result is not a single file. Add `<IncludeNativeLibrariesForSelfExtract>true</IncludeNativeLibrariesForSelfExtract>`,
and `<DebugType>none</DebugType>` with `<AllowedReferenceRelatedFileExtensions>none</AllowedReferenceRelatedFileExtensions>`
so the published folder holds the executable and nothing else.

## Application icon

**Two assets, two roles.** A `.ico` is for Windows; it must never be bound to an `Image.Source`
or an `ImageIcon.Source`. The WPF decoder picks a frame of its own choosing — a small one — and
scales it up, so the logo renders soft; `DecodePixelWidth` does not override that choice, only
the size of the bitmap it produces.

| Asset | Role |
| --- | --- |
| `Assets/icon.ico` | `<ApplicationIcon>`, `Window.Icon`, taskbar — Windows selects the right frame |
| `Assets/icon.png` (512 px) | everything the interface draws: splash, `ImageIcon`, headers |

Load the PNG in the code-behind, in this order: `BeginInit` → `DecodePixelWidth` (the on-screen
size) → `CacheOption.OnLoad` → `UriSource` → `EndInit` → `Freeze`. Declared in markup, the order
belongs to the compiled BAML and a decode size applied after the source has no effect.

- File: `src/App.Wpf/Assets/icon.ico`, multi-resolution (16 to 256 px, 256 mandatory), generated
  from the largest source available — every frame downscaled from it, never upscaled.
- Executable icon: `<ApplicationIcon>Assets\icon.ico</ApplicationIcon>` in the `.csproj` (`@rules/config.md`).
- Window and taskbar: `Icon="/Assets/icon.ico"` on the shell window.
- Build action: `Resource` (embedded in the assembly), not `Content`. A `Content` icon would have to ship beside the single-file executable, which defeats the point.
- If the user provides no icon in Phase 1: the default WPF icon, noted in the generated README.
- **Splash icon (if the splash screen is on, Phase 3)**: the splash reuses this `Assets/icon.ico`. If no icon was set in Phase 1 and the user provides a splash icon path in Phase 3, save it as `Assets/icon.ico` - it then serves the window, the taskbar, and the executable too. No icon at all: text-only splash. See `@rules/splash.md`.

## Assembly versions

Three properties, all derived from the single canonical version (`@rules/versioning.md`):

| Property             | Value                | Role                                                |
| -------------------- | -------------------- | --------------------------------------------------- |
| `Version`            | `1.2.0`              | canonical, set in the `.csproj`, drives the others  |
| `AssemblyVersion`    | `1.2.0.0`            | binding identity - only the major matters at runtime |
| `FileVersion`        | `1.2.0.0`            | what Windows shows in the file properties dialog    |
| `InformationalVersion`| `1.2.0`             | what the About box and the logs report              |

`/wpf-release` writes `Version` and the `AppConfig.AppVersion` mirror; the three others derive from it in `Directory.Build.props` and are never edited by hand.

Also set once in `Directory.Build.props`, so the published file properties are not blank: `Company`, `Product`, `Copyright`.

## Archive

The deliverable is a ZIP of the publish folder, named `<AppName>-<Version>-win-x64.zip`:

```bash
Compress-Archive -Path publish/win-x64/* -DestinationPath publish/AppName-1.2.0-win-x64.zip -Force
```

The archive is produced by `/wpf-release` after the version is cut, so its name always carries the released version.

## SmartScreen

An unsigned executable downloaded from the internet triggers a Windows SmartScreen warning on first run. This is expected for personal distribution and is **documented in the generated README**, not worked around. Code signing is out of scope: it needs a certificate the project does not have.

## Anti-patterns - what NOT to do

- **Do not** set `PublishTrimmed` to `true` - WPF relies on reflection over XAML types and trimming breaks it at runtime, often only on a rarely-used view.
- **Do not** publish `Debug` - the profile pins `Release`, and a Debug publish ships the debug assemblies.
- **Do not** commit the `publish/` folder - it is gitignored (`@rules/config.md`).
- **Do not** hand-edit `AssemblyVersion` / `FileVersion` - they derive from `Version`.
- **Do not** ship the icon as `Content` next to a single-file executable.
- **Do not** display the `.ico` in the interface - that is what `icon.png` is for.
- **Do not** document a `dotnet publish` without the project path, and do not publish with the application running.
- **Do not** claim the binary is signed, or suggest a workaround to silence SmartScreen.
- **Do not** add a second runtime identifier "just in case" - each one doubles the publish time and the archive count.

## Integrity verification

Detailed in `@rules/verification.md`. Key points (if packaging enabled): publish profile present and commented; `PublishTrimmed` false; `ApplicationIcon` set and the `.ico` present with a 256 px layer; the four version properties consistent with the `.csproj` `Version` and with `AppConfig.AppVersion`; `dotnet publish` exits 0 and produces a runnable single file; the README documents the SmartScreen warning and the portable install.
