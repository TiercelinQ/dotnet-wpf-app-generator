# Logging rules - WPF

## Principle

- **Serilog** (`Serilog.Extensions.Hosting` + `Serilog.Sinks.File` + `Serilog.Sinks.Debug`) - mandatory dependency in every generated app. `Microsoft.Extensions.Logging` alone ships no file provider.
- Code never sees Serilog: it injects `ILogger<T>`. Serilog is the implementation behind the abstraction, configured once.
- File sink capped in size and rolling, so a long-running app never fills a disk.
- Zero `Console.WriteLine` / `Debug.WriteLine` / `Trace.WriteLine` in delivered code - only `ILogger<T>`.

---

## Centralized configuration

Single setup point, in the composition root, before any service resolves:

```csharp
// App.xaml.cs
private static IHost BuildHost() =>
    Host.CreateDefaultBuilder()
        .UseSerilog((_, configuration) =>
        {
            configuration
                .MinimumLevel.Is(DebugEnabled() ? LogEventLevel.Debug : ParseLevel(AppConfig.LogLevel))
                .WriteTo.File(
                    path: Path.Combine(UserDataPath, "logs", "app-.log"),
                    rollingInterval: RollingInterval.Day,
                    fileSizeLimitBytes: AppConfig.LogMaxBytes,
                    rollOnFileSizeLimit: true,
                    retainedFileCountLimit: 7,
                    outputTemplate: "{Timestamp:yyyy-MM-dd HH:mm:ss.fff} [{Level:u3}] {Message:lj}{NewLine}{Exception}");

            if (DebugEnabled())
            {
                configuration.WriteTo.Debug();     // Visual Studio output window, debug builds only
            }
        })
        .ConfigureServices(...)
        .Build();

private static bool DebugEnabled()
{
    // App `My-App` -> env var `MY_APP_DEBUG`. Non-alphanumerics normalized so the name is shell-usable.
    var key = $"{SanitizeUpper(AppConfig.AppName)}_DEBUG";
    return Environment.GetEnvironmentVariable(key) == "1";
}
```

- Log folder: `%APPDATA%\<AppName>\logs\` - never the install folder (`@rules/security.md`).
- `AppConfig.LogLevel` and `AppConfig.LogMaxBytes` live in `AppConfig` (`@rules/config.md`).
- `Log.CloseAndFlush()` (or the host's disposal) runs on exit, including from the `AppDomain.UnhandledException` handler, so the last entries reach the file.

---

## Usage in classes

```csharp
// Services/RecordService.cs
public sealed class RecordService(ILogger<RecordService> logger) : IRecordService
{
    public async Task<Result<long>> SaveAsync(RecordInput input, CancellationToken ct)
    {
        logger.LogDebug("Sauvegarde record {RecordId}", input.Id);
        // ...
    }
}
```

**Structured logging only**: message templates with named placeholders (`{RecordId}`), never string interpolation or concatenation. Interpolation destroys the structure and defeats the log format.

### Level conventions

| Level       | Usage                                                              |
| ----------- | ------------------------------------------------------------------ |
| Debug       | Detailed traces, intermediate values                               |
| Information | Important business steps (startup, key user action)                |
| Warning     | Unexpected but non-blocking conditions (user validation failed)    |
| Error       | Caught business failure (`DatabaseException`...) or unhandled exception |
| Critical    | The app cannot continue (migration ahead of the code, host build failure) |

### Errors always logged

In `catch` blocks that do not rethrow (a `Result` failure is returned, a snackbar is shown), call `logger.LogError(ex, "...")` so the stack trace lands in the file. The three global handlers (`@rules/errors.md`) log through the same `ILogger`. Pass the exception as the **first argument**, never inside the message template.

---

## Which logger where

| Layer      | Logger                          | Note                                              |
| ---------- | ------------------------------- | ------------------------------------------------- |
| Services   | `ILogger<TService>` injected    | the normal case                                   |
| ViewModels | `ILogger<TViewModel>` injected  | user-visible failures and command outcomes only   |
| Views      | none                            | a view has nothing to log (`@rules/mvvm.md`)      |
| Startup    | the bootstrap logger            | before the host exists, use Serilog's bootstrap logger so a host build failure is still recorded |

---

## Anti-patterns - what NOT to do

- **Do not** use `Console.WriteLine` / `Debug.WriteLine` in delivered code - only `ILogger<T>`.
- **Do not** interpolate the message (`$"Saved {id}"`) - use a template and a named placeholder.
- **Do not** put the exception in the template - pass it as the first argument.
- **Do not** log a password, token, connection string, or personally identifiable data.
- **Do not** configure a sink outside the composition root - single setup point.
- **Do not** call `Log.Logger` statically from a service - inject `ILogger<T>`.
- **Do not** silence a `catch` that does not rethrow without a `LogError`.
- **Do not** exit without flushing the logger.

## Integrity verification

Detailed in `@rules/verification.md`. Key points: Serilog configured once on the host builder; `ILogger<T>` injected everywhere else; file sink under `%APPDATA%`, rolling and size-capped; Serilog packages present in `Directory.Packages.props`; no `Console.WriteLine` in the delivered sources; every non-rethrowing `catch` calls `LogError`; structured templates, no interpolation; flush on exit.
