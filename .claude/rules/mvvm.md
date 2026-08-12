# MVVM rules - WPF

## Layer mapping

| Layer     | Location                     | Content                                             |
| --------- | ---------------------------- | --------------------------------------------------- |
| Model     | `src/App.Wpf/Models/`        | DTOs, entities, business exceptions, `Result<T>`    |
| Service   | `src/App.Wpf/Services/`      | Business logic, data access, external processes     |
| ViewModel | `src/App.Wpf/ViewModels/`    | Presentation state, commands, validation            |
| View      | `src/App.Wpf/Views/`         | XAML, bindings, zero logic                          |

## Responsibilities

### Models - `Models/`
- Plain C#. Records for DTOs, sealed classes for entities.
- Declare named business exceptions (`Models/Errors.cs`) and the `Result<T>` contract (`@rules/errors.md`).
- **Forbidden**: any WPF type (`Window`, `Dispatcher`, `Brush`, `ICommand`), any `System.Windows` using.
- **Forbidden**: any import from `Services/`, `ViewModels/`, or `Views/`.

### Services - `Services/`
- One interface + one implementation per responsibility: `IRecordService` / `RecordService`.
- Registered in the DI container in the composition root; consumers depend on the interface.
- Validate every input coming from a ViewModel before use (`@rules/security.md`).
- Convert expected failures into `Result<T>` at the public boundary (`@rules/errors.md`). Never throw an expected business failure to a ViewModel.
- Async and cancellable: every method that touches I/O takes a `CancellationToken` (`@rules/threading.md`).
- **Forbidden**: any WPF type, any knowledge of a ViewModel or a View.

### ViewModels - `ViewModels/`
- `partial class` deriving from `ObservableObject` (CommunityToolkit.Mvvm). One file per view: `[Entity]ViewModel.cs`.
- State through `[ObservableProperty]`; actions through `[RelayCommand]` with a `CanExecute` guard where the action is conditional.
- Collections bound to the UI are `ObservableCollection<T>`, mutated **on the UI thread only** (`@rules/threading.md`).
- Validation through `ObservableValidator` / `INotifyDataErrorInfo` - never a check inside a view.
- Depend on service **interfaces**, injected through the constructor. Zero `new` on a service, zero service locator.
- **Forbidden**: any WPF type beyond the MVVM primitives. No `Window`, no `MessageBox`, no `Dispatcher` call except the documented marshalling helper, no direct data access.

### Views - `Views/`
- XAML per view: `[Entity]View.xaml` (+ its `.xaml.cs` holding the constructor and nothing else).
- `DataContext` set by the container, never `new`-ed in the code-behind.
- Show feedback through `IFeedbackService`, driven by the ViewModel - never business error handling (`@rules/errors.md`).
- `Views/Layout/`: structural controls (shell window, title bar, navigation pane, status bar, drawer, dialog host).
- **Forbidden**: business logic, data access, service calls, event handlers that do anything beyond view-only plumbing (focus, animation start, drag).

## Unidirectional dependencies

```
Views ──binding──▶ ViewModels ──interface──▶ Services ──▶ Models
                                                  │
Models (DTOs, Result<T>, exceptions) ◀────────────┴── referenced by all layers
```

- `Models/` has no dependency on anything above it.
- One entity = one model + one service + one ViewModel + one view.
- Shared constants in `AppConfig` (`@rules/config.md`).

## Composition root

`App.xaml.cs` builds the `IHost`, registers every service, ViewModel, and view, then resolves the shell:

```csharp
// App.xaml.cs - registration principle
services.AddSingleton<IAppPaths, AppPaths>();
services.AddSingleton<IPreferencesService, PreferencesService>();

// WPF UI infrastructure services (Wpf.Ui) - used as shipped, never reimplemented
services.AddSingleton<ISnackbarService, SnackbarService>();
services.AddSingleton<IContentDialogService, ContentDialogService>();

// Project services
services.AddSingleton<IFeedbackService, FeedbackService>();   // Result<T> -> snackbar - @rules/errors.md
services.AddSingleton<IAppThemeService, AppThemeService>();   // theme + accent - @rules/xaml.md
services.AddSingleton<IRecordService, RecordService>();

services.AddSingleton<MainWindow>();
services.AddSingleton<ShellViewModel>();
services.AddTransient<RecordView>();
services.AddTransient<RecordViewModel>();
```

- Singleton for anything holding state or a resource (paths, preferences, DB, theme, shell).
- Transient for a per-navigation view and its ViewModel.
- The container is built once. No static access to it from a ViewModel or a View.

## Generated reference tree

```
my-app/
├── MyApp.sln
├── Directory.Packages.props        # package versions (single source) - @rules/config.md
├── Directory.Build.props           # TFM, nullable, warnings as errors - @rules/config.md
├── .editorconfig
├── .gitignore                      # repo hygiene (delivered last batch) - @rules/config.md
├── README.md
├── docs/
│   └── specs/                      # generation specs (user's language): 01-scoping ... 04-architect
├── src/App.Wpf/
│   ├── App.wpf.csproj
│   ├── App.xaml · App.xaml.cs      # entry point, IHost, DI, global handlers, theme, splash
│   ├── AppConfig.cs                # application constants
│   ├── Assets/                     # icon.ico, packaging assets
│   ├── Models/
│   │   ├── Errors.cs               # named business exceptions
│   │   ├── Result.cs               # Result<T> contract - @rules/errors.md
│   │   └── [Entity].cs
│   ├── Services/
│   │   ├── AppPaths.cs             # %APPDATA% resolution - @rules/security.md
│   │   ├── PreferencesService.cs
│   │   ├── FeedbackService.cs      # Result<T> -> WPF UI snackbar - layout.md §5
│   │   ├── AppThemeService.cs      # theme + accent - @rules/xaml.md
│   │   ├── SfCliService.cs         # sf runner + typed helpers (if Salesforce CLI) - @rules/sf-cli.md
│   │   ├── Data/
│   │   │   ├── DatabaseService.cs  # single DB access point (if DB != none) - @rules/db.md
│   │   │   └── MigrationRunner.cs  # versioned migrations (if DB != none) - @rules/db.md
│   │   └── [Entity]Service.cs
│   ├── ViewModels/
│   │   ├── ShellViewModel.cs       # navigation, status bar, theme toggle
│   │   ├── OrgViewModel.cs         # Org Manager (if Salesforce CLI) - @rules/sf-cli.md
│   │   └── [Entity]ViewModel.cs
│   ├── Views/
│   │   ├── MainWindow.xaml         # shell (default pattern - follows the retained composition, layout.md §12)
│   │   ├── SplashWindow.xaml       # splash (if enabled) - @rules/splash.md
│   │   ├── Layout/                 # TitleBar, StatusBar, Drawer, DialogHost
│   │   ├── OrgView.xaml            # Org Manager UI (if Salesforce CLI) - @rules/sf-cli.md
│   │   └── [Entity]View.xaml
│   ├── Converters/                 # IValueConverter implementations, one per file
│   ├── Helpers/                    # pure static functions (formatting, validation)
│   ├── Resources/                  # Strings.resx, Strings.en.resx (if i18n)
│   └── Themes/
│       ├── Tokens.xaml             # tokens - @rules/xaml.md
│       ├── Tokens.Light.xaml       # light palette overrides
│       ├── Tokens.Dark.xaml        # dark palette overrides
│       ├── Styles.xaml             # styles consuming resource keys
│       └── Splash.xaml             # splash styles (if enabled) - @rules/splash.md
└── tests/App.Wpf.Tests/            # xUnit (if enabled) - @rules/tests.md
```

`Helpers/`: pure functions only (date/number formatting, validation). Forbidden: business logic, data access, WPF imports.
`Converters/`: presentation-only transforms. A converter that needs a service is a sign the ViewModel should expose the value ready to bind.

## Batch delivery

**Small project (3 batches):**

| Batch | Content                                                                                       |
| ----- | --------------------------------------------------------------------------------------------- |
| 1     | `Models/` + `Services/`                                                                       |
| 2     | `ViewModels/` + `Views/` + `Converters/`                                                      |
| 3     | `App.xaml` + `App.xaml.cs` + `AppConfig.cs` + `Themes/` + `Resources/` + `Helpers/` + root configs (incl. `.gitignore`, `.sln`, `Directory.*.props`) + README + instructions |

**Medium / Large project (4 batches):**

| Batch | Content                                                                                       |
| ----- | --------------------------------------------------------------------------------------------- |
| 1     | `Models/` + `Services/Data/`                                                                  |
| 2     | `Services/` (business + app services)                                                         |
| 3     | `ViewModels/` + `Views/` + `Converters/`                                                      |
| 4     | `App.xaml` + `App.xaml.cs` + `AppConfig.cs` + `Themes/` + `Resources/` + `Helpers/` + root configs (incl. `.gitignore`, `.sln`, `Directory.*.props`) + README + instructions |

> **Salesforce CLI integration (if Phase 1 = Yes)** - no dedicated batch. `SfCliService.cs` ships with the other services; `OrgViewModel.cs` and `OrgView.xaml` ship with the ViewModels/Views batch. It counts toward the size (`## CALIBRATION` in `CLAUDE.md`). See `@rules/sf-cli.md`.

> **Splash screen (if Phase 3 = Yes)** - no dedicated batch. `SplashMinDurationMs` ships in `AppConfig.cs`; `SplashWindow.xaml` and `Themes/Splash.xaml` ship with the themes/entry batch (the last non-test batch, alongside `App.xaml.cs` which orchestrates the splash). It counts toward the size. See `@rules/splash.md`.

### Tests batch (only if Phase 1 tests = Yes)
Add a final dedicated batch - `tests/App.Wpf.Tests/` (mirroring `src/`) + the test project file + the test packages. -> Small 4 batches / Medium-Large 5 batches. Patterns and coverage: `@rules/tests.md`.

### Delivery format
- Announcement: `Batch N/[total] - [content]`
- Files written directly to disk, complete and self-contained.
- Automatic chaining between batches without confirmation.
- Last batch: install instructions (`dotnet restore`, `dotnet build`, `dotnet run --project src/App.Wpf`, `dotnet format --verify-no-changes`, `dotnet test`, `dotnet publish`) + `README.md` at the root.

## Anti-patterns - what NOT to do (MVVM)

- **Do not** put logic in a view's code-behind. A constructor and view-only plumbing, nothing else.
- **Do not** call a service from a View - the ViewModel does, through an injected interface.
- **Do not** reference a `Window`, a `Dispatcher`, or a `MessageBox` from a ViewModel - use the injected `IContentDialogService` and `IFeedbackService`.
- **Do not** `new` a service or a ViewModel - resolve it from the container.
- **Do not** import a WPF type into `Models/` or `Services/`.
- **Do not** mutate an `ObservableCollection` from a background thread (`@rules/threading.md`).
- **Do not** expose a service's entity straight to the view when the view needs a shaped value - the ViewModel shapes it.
- **Do not** spread one entity across more files than `model + service + viewmodel + view`. If it grows, that is a contract change -> declare the deviation (Phase 4 protocol).
- **Do not** put a shared constant in one layer - promote it to `AppConfig`.

## Post-delivery adjustments

Requested by the user after execution. Isolated fix on the affected file + its direct dependencies. Deliver the complete fixed file.

## Anomaly resolution - cleanup protocol

When an anomaly requires several attempts before being resolved, as soon as the definitive solution is identified and delivered, produce a mandatory cleanup report:

```
Anomaly resolved. Elements to remove from the previous attempts:

File [name]:
- [line / member / using / DI registration / style / resource key to delete]
- ...
```

- List only the elements added during the failed attempts that are no longer needed.
- Cover all affected files: C#, XAML, resources, project files.
- Deliver the complete cleaned files if the user confirms.
- Then offer: "Do you want to remember this point? `/wpf-save-memory`"

## Deletions

Total deletion across all files: code, usings, DI registrations, types, resource keys, styles, `.resx` entries. Forbidden: commented-out code, empty implementations, residue. Deliver the complete modified files.

## Integrity verification

Detailed in `@rules/verification.md`. Key points: layer responsibilities respected (zero logic in a view, zero WPF type in a model or a service); unidirectional dependencies (`Views -> ViewModels -> Services -> Models`); every service registered in the container and consumed through its interface; `DataContext` resolved by the container; architectural contract (`docs/specs/04-architect.md`) respected. Run silently every batch; cross-file checks on the last batch.
