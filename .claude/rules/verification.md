# Verification rules - single source of truth

> Centralized, reusable verification for the whole framework. Referenced by `/wpf-p5-development`, `/wpf-add-feature`, `/wpf-fix-issue`, and `/wpf-run-tests` - never duplicated in those skills.
> Two parts: **executable verification** (run real commands) and **static integrity** (read the code). Run silently; report only on a discrepancy.

---

## A. Executable verification (run the commands)

When the environment allows it (the .NET SDK is available), these commands are **mandatory** and a failure is **blocking** - do not mark work as done while any of them fails. Run them in order:

```
dotnet restore                              # packages resolve against Directory.Packages.props
dotnet build -c Debug                       # MUST be clean - TreatWarningsAsErrors is on
dotnet format --verify-no-changes           # format + analyzers - no pending change
dotnet test                                 # xUnit - only if tests were enabled in Phase 1
dotnet publish src/App.Wpf -c Release -p:PublishProfile=win-x64   # packaging only - project path mandatory, app closed
```

Rules:
- A non-zero exit or any reported error is a failure -> fix the root cause, do not silence the rule. Re-run until clean.
- **A warning is an error** (`TreatWarningsAsErrors`, `@rules/config.md`). Never suppress one with `#pragma warning disable` without a written justification on the line above, and never suppress it to make the build pass.
- **`NU1008`** on build means a `Version` attribute was written on a `PackageReference` while Central Package Management is on. Move the version to `Directory.Packages.props`.
- **`dotnet format` fails on a file it did not write**: run it once to apply, then re-run with `--verify-no-changes` to confirm. Never commit a formatting-only diff mixed into a feature change.
- **`dotnet test` with no test project** is a no-op, not a success: if tests were enabled in Phase 1, a missing project is a defect.
- If the .NET SDK is **not** available in the environment, say so explicitly, fall back to the static checks below (read-through), and tell the user which commands they must run themselves before considering the work verified. Never claim a clean build you could not run.
- Quote the relevant command output as proof when reporting completion.

---

## A-bis. Acceptance run — MANDATORY, and blocking

**A green command chain proves nothing about the interface.** It has been fully green on an
application that opened no window at all: no test renders XAML (`@rules/tests.md`), and a
rendering defect raises no exception. Every defect ever reported by a user on a delivered app
came through this gap. Running the application is not optional polish, it is part of the
verification.

Run it before declaring anything delivered:

1. **Launch without any argument**, then with the nominal input if the app takes one. The empty
   start is the most common path and the one never exercised while building a feature.
2. **A window must be visible.** `MainWindowHandle` at 0 is not a diagnosis: enumerate the
   process windows (`EnumWindows` + `GetWindowThreadProcessId`) and read `IsWindowVisible` and
   `GetWindowRect` for each — it distinguishes "never created" from "created but hidden" from
   "off-screen".
3. **Read `%APPDATA%\<AppName>\logs\app-*.log`.** The three global handlers write everything
   there; a `XamlParseException` names the file and the line.
4. **Exercise every command of the Phase 4 contract**, one by one. A `Command` binding that
   resolves to null leaves the button enabled and silent — nothing else reveals it. Automate it:
   `InvokePattern.Invoke()` through UI Automation for the command, a synthetic mouse click for
   the hit-testing, and check an observable effect (a status bar value, a pane that folds).
   Send **two** clicks: on an inactive window the first only activates it.
5. **Look at the result in both themes**, and compare a rendered asset against a reference at
   the *same scale* — a comparison across scales proves nothing.
6. **Close the window and confirm the process exits.** A survivor signals a window still open,
   and it will lock the executable at the next publish.
7. **Run the README install block by copy-paste**, from the project root. A command written in a
   deliverable is a claim; it must have been run in that exact form.

Report what was checked and what could not be. Never write "verified" over a scope not covered.
- The generated app ships a `.claude/settings.json` (deny guards on secrets/artifacts + a `Stop` hook running `dotnet format --verify-no-changes`). These enforce the rules automatically in later maintenance sessions but **do not replace** this checklist.

---

## B. Static integrity (read the code)

### Every batch / every change
1. The code compiles (read-through, then confirmed by §A when the environment allows it).
2. Usings: all used, none missing; dependency direction respected (`Views -> ViewModels -> Services -> Models`; `Models` referenced by all).
3. MVVM responsibilities respected (zero logic in a view's code-behind, zero WPF type in a service or a model). See `@rules/mvvm.md` anti-patterns.
4. Zero `// TODO`, zero unjustified empty implementation, zero unjustified `#pragma warning disable`, zero `!` null-forgiving operator without a reason.
4b. The three global handlers present in `App.xaml.cs` (`DispatcherUnhandledException`, `AppDomain.UnhandledException`, `TaskScheduler.UnobservedTaskException`) - see `@rules/errors.md`.
5. .NET 10 · C# 14 · nullable enabled · no deprecated API.
6. `design-system.md` compliance + the composition validated in `docs/specs/03-surfaces.md`/`04-architect.md` + the retained `layout.md` specs (snackbars, dialogs) - zero hardcoded visual value in XAML or C# (sanctioned exception: the splash background literal, `@rules/splash.md` - do not flag it). See `@rules/xaml.md` anti-patterns.
7. `@rules/security.md` respected (user data under `%APPDATA%`, no secret in code, validated inputs, confined paths, parameterized SQL, external processes with `UseShellExecute = false` and an `ArgumentList`).
8. `@rules/threading.md` respected (no `async void` outside a guarded handler, no `.Result`/`.Wait()`, `ConfigureAwait(false)` in services and absent in ViewModels, cancellation honored, no cross-thread mutation of a bound collection).
9. Errors: business exceptions raised in the model, converted at the service boundary, returned as `Result<T>`, surfaced as snackbars; no `MessageBox` for a business error. See `@rules/errors.md`.

### Last batch only - cross-file
10. Every service registered in the DI container and consumed through its interface; no `new` on a service, no service locator.
11. Every `DataContext` resolved by the container; every view referenced by the navigation has a registration.
12. Architectural contract (`docs/specs/04-architect.md`) respected - every file, service, and package matches the locked contract, or a declared+validated deviation exists.
13. Zero hardcoded visual value in XAML or C#; resource dictionaries merged in the documented order in `App.xaml`.
14. Resource strings: all used, none missing (if i18n enabled).
15. `docs/specs/` present and consistent with the delivered code.
16. `docs/release/CHANGELOG.md` present, Keep a Changelog-shaped (English), and its top released version equals the `.csproj` `<Version>` **and** `AppConfig.AppVersion` (all three agree). See `@rules/versioning.md`.
17. `.gitignore` present at the project root and correct (`@rules/config.md`): ignores `bin/`, `obj/`, the anchored publish outputs (`/publish/`, `/artifacts/`), `.env`, `tasks/`, `.claude/settings.local.json` + `.claude/agent-memory/`, and `docs/specs/`; **never** ignores `docs/release/CHANGELOG.md`, `.claude/settings.json`, the generated `CLAUDE.md`, `tests/`, or the `Directory.*.props` files. Verify with `git add -A` + `git status`, not only `git check-ignore` (the negation rules mislead it).

### Per-domain (conditional - see the matching rule for detail)
- **logging** (`@rules/logging.md`): Serilog configured once on the host builder; `ILogger<T>` injected elsewhere; file sink under `%APPDATA%`, rolling and size-capped; no `Console.WriteLine` in the delivered sources; every non-rethrowing `catch` calls `LogError`; structured templates; flush on exit.
- **DB** (`@rules/db.md`): `DatabaseService` single access point; `MigrationRunner` called from the composition root before the main window; `AppConfig.DbSchemaVersion` == `max(Migrations)`; no DB access outside `Services/Data/`; SQL parameterized; connections and commands disposed.
- **threading** (`@rules/threading.md`): the checks of §B.8, plus every `Dispatcher.Invoke` commented with its background source and no `Thread.Sleep`.
- **packaging** (`@rules/packaging.md`): if enabled, publish profile present, `PublishTrimmed` false, `ApplicationIcon` set with a 256 px layer, version properties consistent, `dotnet publish` producing a runnable single file, README documenting the SmartScreen warning.
- **sf-cli** (`@rules/sf-cli.md`): if enabled, all `sf` calls through `Services/SfCliService.cs` with `UseShellExecute = false` and an `ArgumentList` (no command string, no ViewModel spawn); `sf` resolved from `PATH` or the `SfPath` preference with the `.cmd` shim handled; both output streams read concurrently with the wait; missing binary maps to a clear snackbar; no token stored or logged; Org Manager commands validate input and refresh after a mutation.
- **splash** (`@rules/splash.md`): if enabled, `SplashWindow.xaml` + `Themes/Splash.xaml` present; `SplashMinDurationMs` in `AppConfig`; created and dismissed in `App.xaml.cs` with the shell hidden until `Loaded`; `StartupUri` absent; theme applied before the splash; no `Thread.Sleep`; icon resolved or text-only fallback.
- **tests** (`@rules/tests.md`): if enabled, each source module has a matching test (Phase 4 mapping); `dotnet test` exits 0; test packages present; no skipped or empty test.
- **versioning** (`@rules/versioning.md`): `docs/release/CHANGELOG.md` present and English; top released version == `.csproj` `<Version>` == `AppConfig.AppVersion`; maintenance changes recorded under `[Unreleased]` in the right category; after `/wpf-release`, `[Unreleased]` reset empty and the cut block carries the right version + date.

---

## C. Reporting

- The acceptance run of §A-bis is reported explicitly: which paths were launched, which commands
  were exercised, what was seen on screen. "Build and tests are green" is not a delivery report.
- All clean -> one short confirmation line in the user's language (no full recap of the checklist).
- Any discrepancy -> name the file, the failing check (§A command output or §B item number), and the fix applied or proposed.
- Verification that could not be run (no .NET SDK) -> state it plainly and list the commands the user must run.
