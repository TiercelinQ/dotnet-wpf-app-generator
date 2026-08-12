# Threading rules - WPF UI thread

> This rule has no counterpart in the source framework: its runtime was single-threaded, so nothing had to be marshalled. WPF has a dedicated UI thread that owns every `DispatcherObject`, and touching a bound object from another thread throws at runtime, often only under load or only on a slow machine. This is the first cause of runtime faults in a WPF application.

## The one rule

**Everything that touches the UI runs on the UI thread. Everything that waits runs off it.**

A command handler starts on the UI thread, awaits its I/O (which resumes on the UI thread by default in WPF), and updates its bound properties there. Nothing else is allowed to write a bound property.

## Async in commands

```csharp
// ViewModels/RecordViewModel.cs
[RelayCommand]
private async Task LoadAsync(CancellationToken ct)
{
    IsBusy = true;                                   // UI thread
    try
    {
        var result = await _records.ListAsync(ct);   // off the UI thread, inside the service
        if (!result.Ok) { _snackbar.Show(result.Error!); return; }

        Records.Clear();                             // back on the UI thread - the await resumed here
        foreach (var record in result.Data!) { Records.Add(record); }
    }
    catch (OperationCanceledException)
    {
        // not an error - @rules/errors.md
    }
    finally
    {
        IsBusy = false;
    }
}
```

- `[RelayCommand]` on an `async Task` method generates an `IAsyncRelayCommand`: it tracks execution, so `IsRunning` can disable the button and a second click cannot re-enter.
- The `CancellationToken` parameter is supplied by the generated command. Take it whenever the work can be long.

## `ConfigureAwait`

| Where                       | Rule                                                                  |
| --------------------------- | --------------------------------------------------------------------- |
| ViewModels, Views           | **no `ConfigureAwait(false)`** - the continuation must return to the UI thread |
| Services, Models, Helpers   | **`ConfigureAwait(false)` on every await** - they never touch the UI   |
| Tests                       | as the code under test requires                                       |

A service that captures the UI context needlessly serializes work back onto the UI thread and can deadlock if any caller ever blocks. A ViewModel that drops the context then updates a bound property throws.

## `async void`

- **Forbidden**, with exactly one exception: an event handler whose signature demands it (`Window.Loaded`, `Closing`). Those handlers do nothing but call an `async Task` method and await it inside a `try/catch` - an exception escaping an `async void` cannot be caught by the caller and takes the process down through `AppDomain.UnhandledException`.
- Everywhere else, return `Task`.

```csharp
// Views/MainWindow.xaml.cs - the tolerated exception, with its guard
private async void OnLoaded(object sender, RoutedEventArgs e)
{
    try { await ((ShellViewModel)DataContext).InitializeAsync(); }
    catch (Exception ex) { _logger.LogError(ex, "Echec de l'initialisation du shell"); }
}
```

## Marshalling from a background thread

When work genuinely runs on a background thread (a timer, a file watcher, a process callback, a `Task.Run`), the UI update is marshalled:

```csharp
// The single sanctioned marshalling call, in a ViewModel
Application.Current.Dispatcher.Invoke(() => Status = message);        // synchronous
await Application.Current.Dispatcher.InvokeAsync(() => Items.Add(x)); // asynchronous
```

- Prefer restructuring so the marshalling is not needed: return the value from the awaited call and assign it on the UI thread.
- `Dispatcher.Invoke` from a ViewModel is tolerated for callback-based sources only, and each call carries a comment naming the background source.
- `BindingOperations.EnableCollectionSynchronization` is an alternative for a collection genuinely mutated from several threads. It is a Phase 4 contract decision, not an ad-hoc fix.

## Cancellation

- Every service method that performs I/O, waits on a process, or loops over a large set takes a `CancellationToken` and honors it.
- The ViewModel cancels on navigation away and on window close.
- `OperationCanceledException` is caught and ignored at the command boundary (`@rules/errors.md`); it is never surfaced as a failure and never counted as an error in the logs.

## Long work and responsiveness

- Anything that would block the UI thread for more than ~50 ms moves off it: `await` an async API, or `Task.Run` for a CPU-bound stretch.
- CPU-bound work uses `Task.Run` **in the service**, never in the ViewModel: the ViewModel awaits an async method and stays free of scheduling decisions.
- No `Thread.Sleep`, no `.Result`, no `.Wait()`, no `GetAwaiter().GetResult()` on the UI thread - each of them freezes the window and can deadlock.
- `DispatcherTimer` for UI-tick work (a clock, a countdown); `System.Timers.Timer` for background work, whose callback marshals as above.

## Anti-patterns - what NOT to do

- **Do not** write a bound property or mutate an `ObservableCollection` from a background thread without marshalling.
- **Do not** use `async void` outside an event handler, and never without a `try/catch`.
- **Do not** call `.Result`, `.Wait()`, or `GetAwaiter().GetResult()` - anywhere, but especially on the UI thread.
- **Do not** use `ConfigureAwait(false)` in a ViewModel, and do not omit it in a service.
- **Do not** fire and forget a `Task` - if it is genuinely fire-and-forget, log its faults explicitly.
- **Do not** use `Thread.Sleep` to wait for anything.
- **Do not** treat `OperationCanceledException` as a failure.
- **Do not** create a `Dispatcher` frame (`DoEvents`-style pumping) to make a synchronous wait feel responsive.
- **Do not** touch a `DispatcherObject` (any WPF control, brush, or `ObservableCollection` bound to one) from a `Task.Run` body.

## Integrity verification

Detailed in `@rules/verification.md`. Key points: no `async void` outside a guarded event handler; no `.Result` / `.Wait()` / `GetAwaiter().GetResult()` in the delivered sources; `ConfigureAwait(false)` present in services and absent in ViewModels; every long-running service method cancellable and its token honored; every `Dispatcher.Invoke` commented with its background source; no `Thread.Sleep`; collections bound to the UI mutated on the UI thread only.
