# Error handling rules

## Model -> Service -> ViewModel -> View escalation convention

- **Model**: defines explicit business exceptions (classes extending `Exception`, declared in `Models/Errors.cs`).
- **Service**: raises those exceptions internally and **converts them at its public boundary** into a structured result. A service method that a ViewModel calls returns `Result<T>` and does not throw for an expected failure.
- **ViewModel**: reads the result, calls `IFeedbackService` (see below). Handles no business rule, formats the message.
- **View**: binds. No error logic at all.

Unexpected exceptions are not converted: they propagate to the global handlers below, which log and surface a persistent danger snackbar.

## Result contract

Single type in `Models/Result.cs`:

```csharp
public enum FeedbackType { Success, Info, Warning, Danger }

public sealed record ResultError(FeedbackType Type, string Message, string? Description = null);

public readonly record struct Result<T>
{
    public bool Ok { get; private init; }
    public T? Data { get; private init; }
    public ResultError? Error { get; private init; }

    public static Result<T> Success(T data) => new() { Ok = true, Data = data };
    public static Result<T> Failure(ResultError error) => new() { Ok = false, Error = error };
}
```

A method with nothing to return uses `Result<Unit>` (a `Unit` empty record declared next to it) rather than a second type. One contract, no variants.

## Full example

```csharp
// Models/Errors.cs
public sealed class RecordNotFoundException(string message) : Exception(message);
public sealed class DatabaseException(string message, Exception? inner = null) : Exception(message, inner);
```

```csharp
// Services/RecordService.cs
public async Task<Result<Record>> SaveAsync(RecordInput input, CancellationToken ct)
{
    if (!Validate(input, out var error))                      // @rules/security.md
    {
        return Result<Record>.Failure(new(FeedbackType.Warning, error));
    }

    try
    {
        return Result<Record>.Success(await _repository.SaveAsync(input, ct));
    }
    catch (RecordNotFoundException ex)
    {
        _logger.LogError(ex, "Record introuvable");
        return Result<Record>.Failure(new(FeedbackType.Danger, ex.Message));
    }
    catch (SqliteException ex)
    {
        _logger.LogError(ex, "Echec base de donnees");
        return Result<Record>.Failure(
            new(FeedbackType.Danger, "Erreur base de donnees", ex.Message));
    }
}
```

```csharp
// ViewModels/RecordViewModel.cs
[RelayCommand]
private async Task SaveAsync(CancellationToken ct)
{
    var result = await _records.SaveAsync(BuildInput(), ct);
    if (!result.Ok)
    {
        _feedback.Show(result.Error!);
        return;
    }
    _feedback.Show(new(FeedbackType.Success, Strings.Record_Saved));
}
```

## Feedback surface - `IFeedbackService`

ViewModels never call WPF UI's `ISnackbarService` directly: a thin project service maps the framework's `ResultError` onto it, so the `FeedbackType` -> appearance mapping lives in exactly one place and a ViewModel test can substitute a single interface.

```csharp
// Services/FeedbackService.cs
public sealed class FeedbackService(ISnackbarService snackbar) : IFeedbackService
{
    public void Show(ResultError error) => snackbar.Show(
        title: Title(error.Type),
        message: error.Message + (error.Description is null ? "" : $"\n{error.Description}"),
        appearance: error.Type switch
        {
            FeedbackType.Success => ControlAppearance.Success,
            FeedbackType.Warning => ControlAppearance.Caution,
            FeedbackType.Danger => ControlAppearance.Danger,
            _ => ControlAppearance.Info,
        },
        icon: new SymbolIcon(Symbol(error.Type)),
        timeout: Timeout(error.Type));      // durations: layout.md §5
}
```

`ISnackbarService.Show(string title, string message, ControlAppearance appearance, IconElement? icon, TimeSpan timeout)` is WPF UI's own signature (4.3.0); a `danger` entry passes `TimeSpan.MaxValue` so it stays until dismissed (`layout.md` §5).

## Rules

- Zero `MessageBox.Show` for business errors - **snackbars only** (types, durations, anatomy: `layout.md` §5).
- Zero inline banner.
- Destructive confirmations (deletion...): styled dialog (`layout.md` §8), never `MessageBox`.
- Error handling on all critical operations: file I/O, database, external process, JSON parsing, `sf` CLI invocation (if the Salesforce integration is on - the runner maps a non-zero exit or a missing binary to a `Result` failure, never throws to the ViewModel; see `@rules/sf-cli.md`).
- **`OperationCanceledException` is not an error.** A cancelled operation returns silently, shows no snackbar, and is logged at `Debug` at most (`@rules/threading.md`).
- Unexpected exceptions: two global handlers, both mandatory, both installed in `App.xaml.cs` before the host starts.
  - `DispatcherUnhandledException` - UI thread. Log, show a persistent danger snackbar, set `e.Handled = true` so the app survives a recoverable view fault.
  - `AppDomain.CurrentDomain.UnhandledException` - background threads. Log; the process is going down, so flush the logger and let it.
  - `TaskScheduler.UnobservedTaskException` - a fire-and-forget task that faulted. Log at `Error`, mark observed. Its presence in the logs is a defect to fix, not a normal path.
- Visible error messages: go through the resource strings if i18n is enabled.

```csharp
// App.xaml.cs - principle
DispatcherUnhandledException += (_, e) =>
{
    _logger.LogError(e.Exception, "Exception non geree sur le thread UI");
    _feedback.Show(new(FeedbackType.Danger, Strings.Error_Unexpected, e.Exception.Message));
    e.Handled = true;
};
```

## Anti-patterns - what NOT to do

- **Do not** call `MessageBox.Show` for a business error or a confirmation - snackbar or styled dialog only.
- **Do not** let an expected business exception escape a service's public method - return `Result<T>.Failure(...)`.
- **Do not** build the user-facing message inside the model - the model raises a typed exception; the service or the ViewModel decides the wording (via the resource strings).
- **Do not** swallow an exception silently (`catch { }`) - map it to a `Result` failure or let it reach the global handlers.
- **Do not** catch `Exception` broadly in a service and turn everything into a danger message - catch the types you expect, let the rest propagate.
- **Do not** put error logic in a View or in a code-behind - the ViewModel reads `result.Ok`.
- **Do not** treat `OperationCanceledException` as a failure.
- **Do not** ship without the three global handlers.

## Integrity verification

Detailed in `@rules/verification.md`. Key points: business exceptions declared in `Models/Errors.cs`, converted at the service boundary, returned as `Result<T>`, surfaced as snackbars; no `MessageBox` for a business error or a confirmation; the three global handlers present in `App.xaml.cs`; no silently swallowed `catch`; cancellation not reported as an error.
