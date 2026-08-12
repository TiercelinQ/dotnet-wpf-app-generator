# Security rules - WPF - NON-NEGOTIABLE

Applied to 100% of generated applications. Any deviation requires the contract declaration protocol (stop -> declare -> validate).

WPF has no sandbox and no process boundary to lock down: the whole application runs with the user's rights, in one process. The attack surface is therefore **what the application reads, writes, and executes**. These rules cover exactly that.

## 1. User data location

- Application data (`preferences.json`, SQLite database, logs, caches) lives under `%APPDATA%\<AppName>` - resolved once, in `Services/AppPaths.cs`:

```csharp
public sealed class AppPaths : IAppPaths
{
    public string UserData { get; } = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
        AppConfig.AppName);
}
```

- **Never** write beside the executable: a self-contained app may sit in a read-only or per-machine location, and a portable copy on a USB stick would carry another user's data.
- No application data committed (`.gitignore`: `*.db`, `preferences.json`, `logs/` - `@rules/config.md`).
- The folder is created on first use, with the default ACL - never widened.

## 2. Secrets

- **No hardcoded secret in the code, ever.** Not a token, not a password, not a connection string with credentials, not an API key - including in a comment or a test fixture.
- A secret that must persist is protected with DPAPI, scoped to the current user:

```csharp
var protectedBytes = ProtectedData.Protect(
    Encoding.UTF8.GetBytes(secret), optionalEntropy: null, DataProtectionScope.CurrentUser);
```

- DPAPI ties the ciphertext to the Windows account. That is the intended behavior: a copied file is useless on another machine or account.
- **Never** store a secret in `preferences.json` in clear text. `preferences.json` holds non-secret values only (theme, window size, an org alias, a binary path).
- Secrets are never logged (`@rules/logging.md`), never shown in a snackbar, never included in an error description passed to the UI.

## 3. Input validation

- Every value crossing into a service from the UI is validated before use: type, required fields, bounds, format. Validation lives in the service, close to the operation, not only in the ViewModel - a ViewModel check is a UX affordance, not a guarantee.
- Validation by dedicated methods or `ObservableValidator` attributes on the ViewModel plus an explicit service-side check. A schema library only if validated in Phase 1.
- **File paths received from the user** are resolved then confined:

```csharp
var full = Path.GetFullPath(Path.Combine(allowedRoot, candidate));
if (!full.StartsWith(allowedRoot + Path.DirectorySeparatorChar, StringComparison.Ordinal))
{
    throw new SecurityException("Chemin hors du repertoire autorise.");
}
```

  Zero traversal. `Path.Combine` alone does not protect: an absolute `candidate` silently wins.
- SQL queries: **always** parameterized (`@rules/db.md`). Zero concatenation, zero interpolation - the `PRAGMA user_version` write is the single documented exception, and its value is a compile-time `int`.

## 4. External process execution

- Spawn with `ProcessStartInfo` and an **`ArgumentList`**, never a concatenated `Arguments` string:

```csharp
var psi = new ProcessStartInfo(binaryPath)
{
    UseShellExecute = false,        // mandatory: no shell, no injectable command line
    RedirectStandardOutput = true,
    RedirectStandardError = true,
    CreateNoWindow = true,
};
psi.ArgumentList.Add("org");
psi.ArgumentList.Add("list");
psi.ArgumentList.Add(userProvidedAlias);   // separate element - never spliced into a string
```

- `UseShellExecute = false` is the command-injection guard: with it, there is no shell to interpret metacharacters. Setting it to `true` to "make it work" is forbidden.
- User-provided values (aliases, queries, paths) go in as **separate `ArgumentList` elements**.
- Runners live in `Services/` and are reached through an interface. A ViewModel never starts a process.
- `Process.Start` on a **document or URL** (`UseShellExecute = true` by necessity) is allowed only on constants declared in `AppConfig` - never on a value coming from the UI or from data.

## 5. WebView2 (only if a Phase 1 feature requires it)

- Not a default dependency. If a feature needs embedded web content:
  - Navigation restricted to an allowlist of origins, enforced in `NavigationStarting` (cancel anything else).
  - `AreDevToolsEnabled = false` and `AreDefaultContextMenusEnabled = false` in Release.
  - No host object exposed to the page (`AddHostObjectToScript`) unless it was validated in Phase 1, and then with the narrowest possible surface.
  - The user data folder set under `%APPDATA%\<AppName>\WebView2`, never the default beside the executable.
- No remote resource anywhere else in the app: fonts and icons are the OS ones, assets are embedded.

## 6. XAML and reflection

- **Never** load XAML from a file or a string at runtime (`XamlReader.Load`) with content the user or a data source controls - it instantiates arbitrary types.
- No `BinaryFormatter`, no `SoapFormatter`, no `NetDataContractSerializer`. Deserialization uses `System.Text.Json` with a known target type.
- `Assembly.LoadFrom` on a path built from user input: forbidden.

## 7. Misc

- **Single instance** if the application writes data (SQLite/JSON): a named `Mutex` checked at startup, so two instances never corrupt the same file.
- Keep .NET on a supported version; re-check the package set at generation (`@rules/config.md`).
- Debug affordances (verbose logging, developer menus, `DebugEnabled()`) are gated on the environment variable or `#if DEBUG`, never shipped enabled in Release.
- Exception details are logged, not shown raw: a snackbar description carries a message, never a stack trace or a file path outside the user's own data folder.

## Anti-patterns - what NOT to do

- **Do not** write application data beside the executable.
- **Do not** hardcode a secret, or store one in `preferences.json`.
- **Do not** log, display, or pass a secret into an error description.
- **Do not** use a value from the UI without validating it in the service.
- **Do not** build a SQL string by concatenation or interpolation.
- **Do not** build a process command line as a string, and do not set `UseShellExecute = true` to run a program.
- **Do not** start a process from a ViewModel or a View.
- **Do not** call `XamlReader.Load` on untrusted content, or `BinaryFormatter` at all.
- **Do not** widen a file ACL, run elevated, or ask for elevation to work around a permission error.
- **Do not** ship with developer affordances enabled.

## Integrity verification

Detailed in `@rules/verification.md`. Key points: user data under `%APPDATA%` through `AppPaths`; no secret in code, logs, or `preferences.json`, DPAPI used where one is persisted; every service input validated and every user-supplied path resolved and confined; SQL 100% parameterized; every external process started with `UseShellExecute = false` and an `ArgumentList`, from a service; WebView2 (if present) origin-restricted with no host object; no runtime XAML load of untrusted content, no `BinaryFormatter`; single-instance mutex when the app writes data; debug affordances gated.
