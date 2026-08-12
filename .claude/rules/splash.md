# Splash screen rules - WPF app

> Conditional - only when Phase 3 "Splash screen" = `Yes`. A splash is a short launch window shown while the main window boots, then dismissed. Opt-in, decided in Phase 3, locked in the Phase 4 contract, implemented in Phase 5. When disabled: no splash file, no config constant, the main window shows normally.

The splash follows the design system (Fluent theme, palette, dark mode) exactly like the rest of the UI - zero hardcoded visual value, brushes read from the theme dictionaries. It shows the **application icon if one is defined**, otherwise the application name centered (text-only).

## Icon source

> **A `.ico` is never displayed by WPF.** A multi-resolution icon lets the decoder pick a frame,
> and it settles on a small one and scales it up: the logo renders visibly soft. `DecodePixelWidth`
> does **not** override that choice — the produced bitmap has the requested size and still comes
> from the wrong frame. Ship two assets: `Assets/icon.ico` for `<ApplicationIcon>`, `Window.Icon`
> and the taskbar, where Windows picks correctly; and `Assets/icon.png` (512 px) for everything
> the interface draws. Load the PNG in the code-behind — `BeginInit` → `DecodePixelWidth` →
> `CacheOption.OnLoad` → `UriSource` → `EndInit` — since markup gives no control over the order
> in which those are applied, and a decode size set after the source has no effect.

- The splash reuses the **application icon** captured in Phase 1 (`Assets/icon.ico`), displayed
  through its `Assets/icon.png` counterpart.
- If no icon was defined in Phase 1 and the splash is enabled, Phase 3 offers an **optional icon path** (free-form). A provided image is saved as `Assets/icon.ico` and becomes the app icon everywhere (window, taskbar, executable via `ApplicationIcon`) - not a splash-only asset. See `@rules/packaging.md`.
- No icon at all: the splash shows the application name only. Never a placeholder image.

## Files

| File                                  | Role                                                                                          |
| ------------------------------------- | --------------------------------------------------------------------------------------------- |
| `src/App.Wpf/Views/SplashWindow.xaml` | Frameless splash window - `WindowStyle="None"`, `ResizeMode="NoResize"`, `ShowInTaskbar="False"`, centered, small fixed size. No ViewModel, no service, no binding beyond the app name. |
| `src/App.Wpf/Themes/Splash.xaml`      | Splash styles - consume only resource keys from the theme dictionaries (`@rules/xaml.md`).     |

The splash is a plain `Window`, not a `FluentWindow`: it has no title bar to extend and no backdrop to negotiate. It merges the same theme dictionaries as the shell, so light and dark render identically to the app.

## Config constant - `AppConfig.cs`

```csharp
// Splash (if enabled in Phase 3) - minimum on-screen time before dismissal
public const int SplashMinDurationMs = 1200;
```

The minimum duration avoids a flash on fast startup: the splash stays at least `SplashMinDurationMs`, then closes once the main window is ready.

## Orchestration - `App.xaml.cs`

The splash is created and dismissed by the composition root, before the main window is shown. `StartupUri` is **not** set in `App.xaml`: the root decides what to show.

- Resolve the startup theme (`Light`/`Dark`): the persisted `theme` preference if preferences are enabled (`PreferencesService`), otherwise the Windows app theme. Apply it and the accent **before** the splash is created, so the splash is already themed.
- Show the splash, record the timestamp.
- Build the host, run the migrations (`@rules/db.md`), resolve the shell window and initialize it.
- Wait out the remaining `SplashMinDurationMs`, close the splash, **then** show the shell — once.

```csharp
// App.xaml.cs - principle, inside OnStartup
ApplyTheme(startupTheme);                                   // @rules/xaml.md - before any window
var splash = new SplashWindow();
splash.Show();
var shownAt = Stopwatch.StartNew();

var host = BuildHost();                                     // @rules/mvvm.md
await host.StartAsync().ConfigureAwait(true);

var shell = host.Services.GetRequiredService<MainWindow>();
RestoreGeometry(shell);                                     // saved position, else centered
await InitializeShellAsync(shell).ConfigureAwait(true);     // everything the first frame needs

var remaining = AppConfig.SplashMinDurationMs - (int)shownAt.ElapsedMilliseconds;
if (remaining > 0)
{
    await Task.Delay(remaining).ConfigureAwait(true);       // never Thread.Sleep
}

splash.Close();
shell.Show();                                               // shown once, already complete
shell.Activate();
```

> **Never create the shell hidden and reveal it from its own `Loaded`.** `Show()` on a window
> whose `Visibility` is `Hidden` leaves it hidden, `Loaded` fires anyway, and the reveal then
> depends on a continuation that may never run: the application starts, logs normally, keeps a
> live process — and displays nothing. Worse, `ShutdownMode.OnLastWindowClose` counts that
> hidden window as open, so the user has nothing to close and the process never exits; it also
> locks its own executable and breaks the next `dotnet publish`.
>
> Showing the shell only at the end achieves the same goal (no white flash) with no ordering
> assumption: the window is not shown until it is complete.

- The wait is an `await Task.Delay`, never `Thread.Sleep` - the splash must keep rendering (`@rules/threading.md`).
- `ConfigureAwait(true)` is deliberate here: this code touches windows and must resume on the UI thread.
- The splash window's `Background` is set from the theme's application background brush. If the dictionaries are not merged yet at that instant, a literal hex is tolerated **once**, commented as sourced from that brush - the single visual literal the rules allow outside the token dictionaries (`@rules/xaml.md`).

## Theme

- The splash respects dark mode when the theme is resolvable at startup (preference or OS), because the theme is applied before the splash is created.
- No theme trigger inside `Splash.xaml` - theming is the dictionary swap, consistent with `@rules/xaml.md`.

## Anti-patterns - what NOT to do

- **Do not** create the shell with `Visibility.Hidden` and reveal it from an event - show it once, at the end of the startup sequence.
- **Do not** bind a `.ico` to an `Image.Source` or an `ImageIcon.Source` - display the PNG.
- **Do not** hardcode a color or a size in `Splash.xaml` - consume resource keys. The commented `Background` literal in the composition root is the only tolerated exception.
- **Do not** give the splash a ViewModel, a service, or a `DataContext` beyond the app name - it renders and self-dismisses.
- **Do not** use `Thread.Sleep` for the minimum duration - it freezes the splash into a white rectangle.
- **Do not** show the splash in the taskbar or let it take focus back from the shell.
- **Do not** set `ShutdownMode` such that closing the splash exits the app - the shell is the main window.
- **Do not** ship the splash when Phase 3 "Splash screen" = No (no file, no `SplashMinDurationMs`, no orchestration).
- **Do not** block the shell forever if `Loaded` is slow - the splash closes when the shell is ready; it is not a modal gate.

## Integrity verification

Detailed in `@rules/verification.md`. Key points (if splash enabled): `Views/SplashWindow.xaml` + `Themes/Splash.xaml` present; `SplashMinDurationMs` in `AppConfig`; splash created and dismissed in `App.xaml.cs`, the shell shown **once** at the end of the sequence and never created hidden nor revealed from `Loaded`; `StartupUri` absent from `App.xaml`; theme and accent applied before the splash is created; no `Thread.Sleep`; `Splash.xaml` consumes only resource keys (save the commented composition-root background); the displayed logo loaded from `Assets/icon.png`, not from the `.ico`, or text-only fallback.
