# Salesforce CLI integration rules - WPF app

> Conditional - only when Phase 1 "Salesforce CLI" = `Yes`. When enabled, the default scaffold is **runner + typed helpers + a starter Org Manager** (`@rules/mvvm.md`). Targets the **`sf` v2 CLI** only. The app never handles OAuth tokens - `sf` owns the auth flow and the OS keychain.

The runner lives in the **Services layer** (`Services/SfCliService.cs`) - a ViewModel never starts a process. The Org Manager view reaches it through the standard path (`@rules/mvvm.md`): `view -> viewmodel -> service`.

## Command catalog (source of truth for sf commands/flags)

This rule is the **hub** that routes every sf-aware skill to the command catalog under `.claude/sf-cli-reference/`. Whenever you write or modify an `sf` invocation (a helper's argument list, a new subcommand, a flag):

1. **Never invent** an `sf` command, subcommand, or flag from memory - verify it against the catalog.
2. Read `sf-cli-reference/INDEX.md` first (small: convention + capability -> file map), then **open only the section file** matching the capability you need (`auth-orgs.md`, `metadata-deploy.md`, `apex.md`, `data.md`, `packaging.md`, `users-schema.md`, `platform-api.md`, `advanced.md`). **Never read the whole catalog** - it is large; section-scoped reads keep the context lean.
3. Each catalog entry states the exact flags and whether `--json` / `--api-version` / `-o, --target-org` apply. The typed helpers below source their arguments from there.
4. The catalog reflects `sf` v2 at a given release; field names and flags drift across versions. For anything uncertain or recent (`advanced.md` plugins), confirm against the installed CLI with `sf <command> --help`.

## Principle

The application shells out to the user's `sf` binary with `--json` and parses the envelope. Everything the integration needs (orgs, auth, SOQL, Tooling API, metadata, Apex) is an `sf` subcommand - no Salesforce SDK dependency.

- `sf` is a **runtime prerequisite**; if absent, a clear snackbar (the runner maps the "file not found" start failure). The official Salesforce Extension Pack / DX tooling is a documented optional recommendation in the README only - never a hard dependency of the generated app.
- **Resolve `sf` through an `SfPath` preference.** When persistent preferences are enabled (Phase 1), store an optional `SfPath` key in `preferences.json` (`PreferencesService`): empty means the bare command `sf` is resolved from `PATH`; set means the configured absolute path is used. Inject the reader into the service: `new SfCliService(() => _preferences.Get("SfPath") ?? "sf", logger)`. This covers non-standard installs without a platform branch.
- **On Windows, `sf` is a `sf.cmd` shim.** `Process.Start` with `UseShellExecute = false` cannot execute a `.cmd` directly - it needs a real executable. Resolve the shim first, and run it through `cmd.exe /c` only as the documented fallback, with the arguments still passed as separate `ArgumentList` elements (`@rules/security.md`):

```csharp
// Resolution order: the SfPath preference, then PATH (sf.cmd / sf.exe / sf.ps1 via `where sf`).
// A .cmd shim is launched as: cmd.exe /c <shimPath> <args...>  - the args stay separate elements,
// so there is still no injectable command line.
```

- **Install (documented in the README, not imposed)**: the official `sf` installer bundles its own Node and avoids coupling to a system Node version; `npm install -g @salesforce/cli` also works. Either way the app only needs `sf` reachable (PATH or `SfPath`).

## Runner - `Services/SfCliService.cs`

```csharp
public sealed record SfEnvelope<T>(int Status, T Result, string[]? Warnings, string? Message, string? Name);

public sealed class SfCliService(Func<string> resolveBin, ILogger<SfCliService> logger) : ISfCliService
{
    /// <summary>Runs `sf &lt;args&gt; --json`. Arguments stay separate elements - never a command string.</summary>
    public async Task<Result<T>> RunAsync<T>(IReadOnlyList<string> args, CancellationToken ct)
    {
        var psi = new ProcessStartInfo(resolveBin())
        {
            UseShellExecute = false,          // command-injection guard - @rules/security.md
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            CreateNoWindow = true,
        };
        foreach (var arg in args) { psi.ArgumentList.Add(arg); }
        psi.ArgumentList.Add("--json");

        try
        {
            using var process = Process.Start(psi)
                ?? throw new InvalidOperationException("Process.Start a renvoye null.");

            var stdout = process.StandardOutput.ReadToEndAsync(ct);
            var stderr = process.StandardError.ReadToEndAsync(ct);
            await process.WaitForExitAsync(ct).ConfigureAwait(false);

            var payload = await stdout.ConfigureAwait(false);
            if (string.IsNullOrWhiteSpace(payload)) { payload = await stderr.ConfigureAwait(false); }

            var envelope = TryParse<T>(payload);
            if (envelope is null) { return Fail<T>("Reponse sf illisible.", payload); }
            if (envelope.Status != 0) { return Fail<T>(envelope.Message ?? "Commande sf en echec.", envelope.Name); }
            return Result<T>.Success(envelope.Result);
        }
        catch (Win32Exception ex)      // binary not found
        {
            logger.LogError(ex, "Salesforce CLI introuvable");
            return Fail<T>("Salesforce CLI (sf) introuvable. Installez le CLI ou definissez la preference SfPath.");
        }
    }
}
```

- Both output streams are read **concurrently with the wait**: reading one to the end before waiting deadlocks as soon as the other buffer fills. This is the classic `Process` trap and the reason the code above starts both reads first.
- The runner returns `Result<T>` (`@rules/errors.md`). The ViewModel surfaces the failure as a snackbar and only reads `result.Ok`.
- Parse **defensively**: `sf` field names vary across CLI versions. Read the `status`/`result` envelope, guard missing fields, and verify the actual shape at generation time against the installed `sf`. Deserialize with `System.Text.Json` and `JsonSerializerOptions { PropertyNameCaseInsensitive = true }`.
- Map a non-zero status, a missing binary, or unparseable output to a `Result` failure - the ViewModel decides the wording.
- Cancellation: the token is honored on the wait and on the stream reads; a cancelled run is not an error (`@rules/threading.md`).

## Typed helpers (on top of the runner)

```csharp
Task<Result<IReadOnlyList<OrgInfo>>> ListOrgsAsync(CancellationToken ct);            // sf org list -> result.nonScratchOrgs / scratchOrgs (defensive)
Task<Result<string?>> GetDefaultOrgAsync(CancellationToken ct);                      // sf config get target-org
Task<Result<Unit>> SetDefaultOrgAsync(string alias, CancellationToken ct);           // sf config set target-org=<alias>
Task<Result<Unit>> LoginWebAsync(string alias, CancellationToken ct);                // sf org login web --alias <alias>   (sf opens the browser)
Task<Result<Unit>> LogoutAsync(string alias, CancellationToken ct);                  // sf org logout --target-org <alias> --no-prompt
Task<Result<Unit>> ReconnectAsync(string alias, CancellationToken ct);               // re-run login web for an expired token
Task<Result<QueryResult>> QueryAsync(string soql, string? org, CancellationToken ct);        // sf data query --query <soql>
Task<Result<QueryResult>> QueryToolingAsync(string soql, string? org, CancellationToken ct); // sf data query --use-tooling-api --query <soql>
Task<Result<DeployResult>> RetrieveAsync(RetrieveArgs args, CancellationToken ct);   // sf project retrieve start
Task<Result<DeployResult>> DeployAsync(DeployArgs args, CancellationToken ct);       // sf project deploy start
Task<Result<ApexResult>> RunApexAsync(string file, string? org, CancellationToken ct);       // sf apex run --file <file>
```

- Each helper builds the argument list and delegates to `RunAsync<T>()`. Model the return types defensively (only the fields the UI uses). DTOs (`OrgInfo`, `QueryResult`) live in `Models/`.
- **Every helper's command and flags are verified against the catalog** (the comment after each helper points at its capability): orgs/auth/config -> `sf-cli-reference/auth-orgs.md`, `QueryAsync`/`QueryToolingAsync` -> `data.md`, `RunApexAsync` -> `apex.md`, `RetrieveAsync`/`DeployAsync` -> `metadata-deploy.md`. Do not guess a flag - look it up in the matching section file.
- `OrgInfo`: read `Alias`, `Username`, `ConnectedStatus` (for example `Connected`, `RefreshTokenAuthError`), `IsDefaultUsername`, `InstanceUrl` when present.

## Auth orchestration

- The application **drives** `sf org login/logout` and `sf config set target-org`; it never reads, writes, or stores a token. `sf` performs the OAuth web flow and stores tokens in its own keychain.
- "Reconnect on expired token" = re-run `sf org login web` for that alias (`ConnectedStatus == "RefreshTokenAuthError"`).
- The app may persist a **non-secret** alias in `preferences.json`; never a token (`@rules/security.md`). If a real secret ever has to be stored, use DPAPI - never plain `preferences.json`.

## Starter Org Manager (default scaffold)

One entity = `model + service + viewmodel + view` (`@rules/mvvm.md`). The Org Manager is that entity for the `sf` integration:

- **Model** (`Models/OrgInfo.cs`): the DTOs the UI binds.
- **Service** (`Services/SfCliService.cs`): the runner + typed helpers above, behind `ISfCliService`.
- **ViewModel** (`ViewModels/OrgViewModel.cs`): one `[RelayCommand]` per action (`ListOrgs`, `Login`, `Logout`, `Reconnect`, `SetDefault`), each validating its input (alias non-empty) before calling the service and surfacing the `Result` through the snackbar service. After any mutating action, re-list the orgs.
- **View** (`Views/OrgView.xaml`): lists orgs from the bound collection, shows connected (`CheckmarkCircle24`) versus disconnected (`DismissCircle24`) state and marks the default org, with buttons add / remove / reconnect / set-default / refresh. Icon colors through the icon brushes (`IconSuccessBrush` / `IconDangerBrush`), no logic in the code-behind. A logout goes through the styled confirmation dialog (`layout.md` §8).

## Anti-patterns - what NOT to do

- **Do not** build the `sf` command as a concatenated string, and do not set `UseShellExecute = true` to run it - pass an `ArgumentList`.
- **Do not** read one output stream to the end before `WaitForExit` - start both reads first, or the process deadlocks on a full buffer.
- **Do not** start `sf` from a ViewModel or a View - the runner lives in `Services/` behind an interface.
- **Do not** read, store, or log an org token - `sf` owns tokens; the app stores at most a non-secret alias.
- **Do not** add a Salesforce SDK for the v1 use cases - the CLI covers them.
- **Do not** throw a raw exception out to the ViewModel - the runner returns `Result<T>` (`@rules/errors.md`).
- **Do not** assume exact `sf --json` field names - parse defensively and verify against the installed CLI.
- **Do not** target `sfdx` (legacy) - `sf` v2 only.
- **Do not** block the UI thread waiting for the process (`@rules/threading.md`).

## Integrity verification

Detailed in `@rules/verification.md`. Key points (if sf enabled): all `sf` calls go through `Services/SfCliService.cs` with `UseShellExecute = false` and an `ArgumentList` (no command string, no ViewModel spawn); `sf` resolved from `PATH` or the `SfPath` preference, `.cmd` shim handled; both output streams read concurrently with the wait; a missing binary produces a clear snackbar pointing to the install or `SfPath`; no token stored or logged; Org Manager commands validate input and refresh the list after a mutation; the README documents the `sf` prerequisite, `SfPath`, and the optional tooling recommendation.
