---
name: wpf-p5-development
description: Phase 5 of the WPF app generation cycle — development and batch delivery, files written directly to disk, executable verification, final README.
model: sonnet
---

# /wpf-p5-development — Batch development

## Role

Senior .NET/WPF developer — build the contracted app to a clean, buildable state.

## Goal

Deliver the application in batches, each one build- and format-clean and contract-compliant, ending with install instructions.

## Deliverable

The full project source on disk + `README.md` + verified build.

---

**Phase banner (show first)** — before anything else, output the phase banner as plain Markdown in the user's language, **never inside a code block or fenced block**. Three blocks, each on its own line: (1) H2 heading: Phase 5/5 — Development; (2) progress line: Scoping ✓ · Features ✓ · Surfaces ✓ · Architecture ✓ · ▶ Development; (3) intent in italics: Deliver the app in batches. See `## PIPELINE` in `CLAUDE.md`.

## Code rules

At start, read and fully apply: `@rules/mvvm.md` · `@rules/xaml.md` · `@rules/threading.md` · `@rules/errors.md` · `@rules/config.md` · `@rules/security.md` · `@rules/logging.md` · `@rules/db.md` (if DB) · `@rules/packaging.md` (if packaging) · `@rules/sf-cli.md` (if Salesforce CLI) · `@rules/splash.md` (if splash screen enabled in Phase 3) · `@rules/tests.md` (if tests) · `@rules/versioning.md` · `@rules/verification.md` (not auto-imported). **Read `design-system.md` and `layout.md`** (no longer auto-imported) before producing any UI. Read `docs/specs/04-architect.md` — it is the locked contract this build follows.

Critical reminders:

- `dotnet build` clean with `TreatWarningsAsErrors` · `dotnet format --verify-no-changes` clean · nullable enabled · XML doc on public types and members.
- Error handling on all critical operations; the three global exception handlers installed; file logging via Serilog (`@rules/logging.md`).
- UI thread discipline (`@rules/threading.md`): no `async void` outside a guarded handler, no `.Result`/`.Wait()`, cancellation honored.
- Zero hardcoded visual value in XAML or C# — everything in `Themes/Tokens.xaml` / `Themes/Styles.xaml`.
- Every styled control carries a `Style` referencing a named resource.
- No package that was not validated in Phase 1, and no version written outside `Directory.Packages.props`.

## Anti-patterns — what NOT to do

- **Do not** deviate from `docs/specs/04-architect.md` silently — any structural change triggers the deviation protocol (stop, declare, validate) from `@rules/mvvm.md`.
- **Do not** weaken a security rule to make something work (`@rules/security.md`) — validated inputs, confined paths, parameterized SQL, `UseShellExecute = false`.
- **Do not** put logic in a view's code-behind, call a service from a view, or `new` a service instead of resolving it.
- **Do not** suppress a warning to make the build pass — fix the cause.
- **Do not** leave a `// TODO`, an empty body, or a placeholder. Each batch is complete and self-contained.
- **Do not** introduce a package not in the contract.
- **Do not** mark the work done while `@rules/verification.md §A` is failing (see Verification below).

## Delivery

- Write to the project root chosen at the start of the flow (via `/wpf-app` or `/wpf-p1-scoping`); if it was not set in this flow, ask for it once: `Destination folder for the files? (e.g. C:\projects\MyApp)`.
- Create the folders and write the files **directly to disk** — no manual action required.
- Announcement (in the user's language): `Batch N/[total] — [content]`
- Automatic chaining between batches without confirmation.
- After each delivered batch, if the session is running long or the context is heavily loaded, offer `/wpf-save-session` before starting the next batch — the automatic chaining above stays the default.
- Batch split: tables in `@rules/mvvm.md` (3 batches Small / 4 batches Medium-Large, frozen in Phase 2).

## Verification

Apply `@rules/verification.md` — the executable commands (§A, blocking when the env is available), **the acceptance run (§A-bis, blocking)**, and the static integrity checks (§B). Silent — reported only on a discrepancy. Cross-file checks run on the last batch.

**The acceptance run is not optional and cannot be replaced by the command chain.** After the last batch, launch the application — without argument, then with the nominal input — confirm a visible window, read the log, exercise every command of the Phase 4 contract through UI Automation and a real click, check both themes, and confirm the process exits on close. A delivery announced on a green build alone is a delivery announced on an unverified claim: it has already shipped an application that opened no window, and one whose title bar buttons did nothing.

## Last batch — mandatory extra deliverables

- **`App.xaml.cs`** with the strict init order: Serilog bootstrap logger → the three global exception handlers (`DispatcherUnhandledException`, `AppDomain.UnhandledException`, `TaskScheduler.UnobservedTaskException` — `@rules/errors.md`) → theme + accent applied (`@rules/xaml.md`) → frameless splash window shown (if splash enabled) → `IHost` built and started (Serilog, DI registrations — `@rules/mvvm.md`) → `MigrationRunner.Run()` (if DB, before any window) → shell window resolved and initialized, centered on the primary display (a saved position from the persisted-position preference, when enabled, takes precedence over centering) → wait out the remaining `SplashMinDurationMs` → close the splash → `shell.Show()` + `Activate()`, **once**. The shell is never created hidden and never revealed from its own `Loaded`: a window shown while `Visibility` is `Hidden` stays hidden, and the process then survives with no interface. `App.xaml` carries **no** `StartupUri`. See `@rules/splash.md` and `@rules/security.md`.
- **Solution and build files** at the project root: `[AppName].sln`, `Directory.Packages.props` (every package version pinned and confirmed in Phase 1), `Directory.Build.props`, `.editorconfig` (see `@rules/config.md`).
- If packaging enabled (Phase 1): the commented publish profile + `dotnet publish` instructions (see `@rules/packaging.md`).
- Install and run instructions:
  ```
  dotnet restore
  dotnet run --project src/App.Wpf        # development
  dotnet build                            # compilation (warnings are errors)
  dotnet format --verify-no-changes       # format + analyzers
  dotnet test                             # tests (if enabled in Phase 1)
  dotnet publish src/App.Wpf -c Release -p:PublishProfile=win-x64   # packaging - project path mandatory, app closed
  ```
- **`.gitignore`** written at the project root — template in `@rules/config.md §.gitignore`. Keeps `bin/`, `obj/`, the anchored publish outputs (`/publish/`, `/artifacts/`), `.env`, `tasks/`, `.claude/settings.local.json` + `.claude/agent-memory/`, and the private `docs/specs/` out of the repo, while **never** ignoring `docs/release/CHANGELOG.md`, `.claude/settings.json`, the generated `CLAUDE.md`, `tests/`, or the `Directory.*.props` files.
- **`docs/release/CHANGELOG.md`** written at the project root (create `docs/release/`), seeded per `@rules/versioning.md` — **in English**, Keep a Changelog shape: the preamble, an empty `## [Unreleased]`, and the initial `## [1.0.0] - <YYYY-MM-DD>` block with `### Added` / `- Initial release.`. The `1.0.0` matches the app version in the `.csproj` `<Version>` / `AppConfig.AppVersion`. Later releases are cut with `/wpf-release`.
- `README.md` written automatically at the project root: objective, stack, tree, services and commands, conventions, installation.
- **`CLAUDE.md`** written at the generated project root (in the user's language), recording the app's identity for future sessions:

  ```markdown
  # [nom-app]

  ## Origin

  Framework: wpf v1.0.0

  ## Business context

  [What the app does — synthesized from docs/specs/02-featuring.md: objective + key features]

  ## Deviations from the framework

  - None

  ## Maintenance

  - Load the project first: `/wpf-load-project`
  - Change it: `/wpf-add-feature` · `/wpf-fix-issue` · `/wpf-refactor-code` (each records the change under `[Unreleased]` in `docs/release/CHANGELOG.md`; the version does not move)
  - Verify: `/wpf-run-tests`
  - Publish a version: `/wpf-release` (turns the accumulated `[Unreleased]` changelog into a dated version and raises the version number)
  ```

  `[nom-app]` = display name / app name. The version here is the **framework** version declared at the top of the framework `CLAUDE.md` (currently 1.0.0) — not the app's own version (which starts at 1.0.0 in the `.csproj` / `docs/release/CHANGELOG.md`). Replace the `Deviations` list with every deviation validated via the Phase 4/5 deviation protocol (`- [deviation] — reason: [justification]`); if none, keep `- None`.

- **`.claude/settings.json`** written at the generated project root so the app stays self-enforced in later maintenance sessions:

  ```json
  {
    "permissions": {
      "allow": [
        "Bash(dotnet:*)",
        "Read",
        "Write",
        "Edit"
      ],
      "deny": [
        "Read(**/.env)",
        "Read(**/.env.*)",
        "Read(**/secrets/**)",
        "Write(**/.env)",
        "Write(**/.env.*)",
        "Write(**/secrets/**)",
        "Edit(**/.env)",
        "Edit(**/.env.*)",
        "Edit(**/secrets/**)",
        "Write(**/bin/**)",
        "Write(**/obj/**)",
        "Write(publish/**)",
        "Write(**/artifacts/**)"
      ]
    },
    "hooks": {
      "Stop": [{ "hooks": [{ "type": "command", "command": "dotnet format --verify-no-changes --no-restore" }] }]
    }
  }
  ```

  The `Stop` hook runs the fast static check at the end of each turn. Note in the README that the user can tune or remove it. **To skip it on doc-only turns** (make it conditional), ship the guard as `tools/stop-format.ps1` and point the hook at `powershell -NoProfile -ExecutionPolicy Bypass -File tools/stop-format.ps1` (a bare inline guard is not portable across cmd/PowerShell/bash — use the script). The guard: `git status --porcelain`, run the format check **only** when a `.cs`/`.xaml` path is present, and **degrade to always-check** if git is unavailable (no repo / error):

  ```powershell
  # tools/stop-format.ps1 - Stop-hook guard: check formatting only when a C#/XAML file has uncommitted changes.
  $changed = $true
  try {
      $status = git status --porcelain 2>$null
      if ($LASTEXITCODE -eq 0) { $changed = [bool]($status | Select-String -Pattern '\.(cs|xaml)$' -Quiet) }
  } catch { }   # no git -> check anyway
  if ($changed) { dotnet format --verify-no-changes --no-restore }
  ```

  **If the Salesforce CLI integration is on**, add `"Bash(sf:*)"` to the `allow` list (so maintenance sessions can verify flags with `sf <cmd> --help`).

  **Deny anchoring (deliberate):** no deny pattern may ever match `docs/release/CHANGELOG.md` (written at delivery and by the maintenance/release skills). A build-output deny whose folder name could collide with a documentation folder is **anchored to the project root** — `Write(publish/**)`, never the unanchored `Write(**/publish/**)`. Keep this anchoring when adding deny patterns.

- **`docs/sessions/SESSION_[app_name]_S0.md`** written at the project root (create `docs/sessions/`) — the **delivery baseline** session, produced automatically here, no user action. Apply the `/wpf-save-session` template as-is (that skill stays the single source of the format) with `[N]` **forced to `0`**: `Completed phase: 5 — Development`, `Next phase: — (delivered — maintenance via /wpf-load-project)`, every delivered batch checked, locked decisions and open points filled. **Overwrite** it if it already exists (Phase 5 replayed). `S0` is reserved for this baseline; manual `/wpf-save-session` saves keep numbering from `1`.
- Confirm `docs/specs/` is present and consistent with the delivered code.

## Splash screen — only if enabled in Phase 3

No dedicated batch. Deliver, per `@rules/splash.md`: `SplashMinDurationMs` in `AppConfig.cs` (Batch 1), the splash assets `src/App.Wpf/Views/SplashWindow.xaml` + `src/App.Wpf/Themes/Splash.xaml` (themes/entry batch — last non-test batch), and the splash orchestration in `App.xaml.cs` (shell hidden until `Loaded`, frameless splash window, no ViewModel, no `Thread.Sleep`). If a splash icon path was provided in Phase 3, save it as `Assets/icon.ico`. It counts toward the size, not a separate batch.

## Seed data — only if DB != none (Phase 1)

If a database was selected, deliver the standalone seed entry point contracted in Phase 4 (a `tools/Seed/` console project or a `--seed` switch on the app) that inserts a coherent demo dataset:

- Uses the services (`Services/`) — never raw SQL outside `Services/Data/`.
- Coherent, FK-respecting data (~5-15 rows per entity), realistic values in the user's language, parents before children.
- Idempotent: insert only if the target tables are empty (count check first); re-running must not duplicate rows.
- Run instruction added to the README. Never called from `App.xaml.cs`.

**No dedicated batch**: the seed ships inside the **last code batch** (the one already carrying the root configs — `@rules/mvvm.md` batch tables), before the tests batch when both apply. The announced batch total stays the calibration count (`## CALIBRATION` in `CLAUDE.md`). See `@rules/db.md`.

## Test batch — only if Phase 1 tests = Yes

Add a final dedicated batch: announce `Batch [final]/[total] — tests/ + test packages`. Deliver `tests/App.Wpf.Tests/` mirroring `src/App.Wpf/` (per `@rules/tests.md`: service pattern with substituted dependencies, ViewModel pattern asserting commands and feedback, in-memory SQLite, no network), the test `.csproj` referencing the application project, and the test packages added to `Directory.Packages.props`. Append the `dotnet test` instruction to the README.

## Final delivery summary

Once the last batch (plus the tests batch if any) is delivered, close Phase 5 with a **delivery summary** in the user's language. **Make every file and the project folder a clickable Markdown link** `[label](path)`, each path pointing to the real on-disk location under the project root (relative to the project root, or absolute if the project root lies outside the current workspace). **Valid link syntax (mandatory)**: a Markdown link destination cannot contain spaces unless wrapped in angle brackets. When the path contains spaces (typical of absolute Windows paths), wrap the destination in `<…>` and use forward slashes, e.g. `[README.md](<E:/Informatique/1-projects/.../my-app/README.md>)`. Without spaces, a plain relative path is fine. List:

- **Project folder** — the project root (clickable).
- **README.md** — how to run, stack, tree, conventions (clickable).
- **Generated `CLAUDE.md`** — the app identity for future sessions (clickable).
- **Documentation — phase specs** — one clickable link each: `docs/specs/01-scoping.md`, `docs/specs/02-featuring.md`, `docs/specs/03-surfaces.md`, `docs/specs/04-architect.md`, plus the delivery baseline `docs/sessions/SESSION_[app_name]_S0.md`.
- **How to run** — the key commands (also in the README):

  ```
  dotnet restore
  dotnet run --project src/App.Wpf
  ```

  (+ the seed instruction if a DB was selected; `dotnet test` if tests enabled; `dotnet publish src/App.Wpf -c Release -p:PublishProfile=win-x64` if packaging enabled.)

- **Maintenance & release** — after delivery: `/wpf-load-project` first, then `/wpf-add-feature` · `/wpf-fix-issue` · `/wpf-refactor-code` to change it, `/wpf-run-tests` to verify, and `/wpf-release` to publish a version (it turns the accumulated `[Unreleased]` changelog into a dated version and raises the number). The same reminder is recorded in the generated `CLAUDE.md`.

The summary points to the documents; it does not restate them.

## Post-delivery adjustments

Isolated fix on the affected file + direct dependencies. Deliver the complete fixed file.
After resolving an anomaly: cleanup report (`@rules/mvvm.md`) then offer `Do you want to remember this point? /wpf-save-memory`.
