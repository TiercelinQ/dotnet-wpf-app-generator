# XAML rules - resources, themes, Fluent baseline

## Files

| File                                       | Role                                                                     |
| ------------------------------------------ | ------------------------------------------------------------------------ |
| `src/App.Wpf/Themes/Tokens.xaml`           | Token dictionary - sizes, spacings, radii, durations, brush aliases      |
| `src/App.Wpf/Themes/Tokens.Light.xaml`     | Light theme overrides of Fluent brushes (palette roles)                  |
| `src/App.Wpf/Themes/Tokens.Dark.xaml`      | Dark theme overrides of Fluent brushes (palette roles)                   |
| `src/App.Wpf/Themes/Styles.xaml`           | All control styles - consume only resource keys                          |
| `src/App.Wpf/Themes/Splash.xaml`           | Splash styles (if splash enabled) - consume only resource keys - @rules/splash.md |

Merged once in `App.xaml`, in this order: the WPF UI Fluent dictionaries, then `Tokens.xaml`, then the theme-specific token dictionary, then `Styles.xaml`. Order matters: a project override must come **after** the Fluent dictionary it overrides.

```xml
<!-- App.xaml -->
<Application.Resources>
  <ResourceDictionary>
    <ResourceDictionary.MergedDictionaries>
      <ui:ThemesDictionary Theme="Light" />
      <ui:ControlsDictionary />
      <ResourceDictionary Source="Themes/Tokens.xaml" />
      <ResourceDictionary Source="Themes/Tokens.Light.xaml" />
      <ResourceDictionary Source="Themes/Styles.xaml" />
    </ResourceDictionary.MergedDictionaries>
  </ResourceDictionary>
</Application.Resources>
```

## Absolute rules

1. **Zero hardcoded visual value in XAML or C#** - zero literal color, size, margin, or duration on a styled element. Two tolerated exceptions: values computed at runtime that cannot be a resource (for example a position following the pointer), justified with a comment; and the splash window `Background` set in code before the dictionaries load (`@rules/splash.md`), commented as sourced from the application background brush.
2. **`Styles.xaml` contains no literal value** - only `{StaticResource}` / `{DynamicResource}`. Any new value goes through a token in `Tokens.xaml` first.
3. **Every style carries a comment** naming the source token(s) or Fluent brush(es).
4. **Dark mode is a dictionary swap**: the theme manager replaces the Fluent theme dictionary and the project token dictionary together. `Styles.xaml` contains **no** theme condition, no trigger on the theme, no `if (isDark)` in C#.
5. **Fluent owns depth**: surfaces come from the theme brushes (`CardBackgroundFillColorDefaultBrush`, `LayerFillColorDefaultBrush`), corner radii from `CornerRadiusSm` / `CornerRadiusMd`. Zero hand-written `DropShadowEffect` - it is forbidden, both for the look and for the render cost.
6. **Naming conventions**: style keys in `PascalCase` suffixed by the control role (`PrimaryButtonStyle`, `DataGridHeaderStyle`); token keys in `PascalCase` (`Spacing4`, `CornerRadiusMd`, `IconSizeLg`). `x:Name` only where the code-behind or a binding genuinely needs the element.
7. **Zero third-party styling framework beyond WPF UI** - no second control library, no theme pack layered on top. One Fluent source.
8. **`DynamicResource` for anything themed, `StaticResource` for anything fixed.** A brush that changes with the theme must be `DynamicResource` or it freezes at load time. Sizes, spacings, and radii are `StaticResource`.
9. **No `Panel.ZIndex` literal** - use the `Z*` tokens (`design-system.md` §13).
10. **Bindings do the work, not the code-behind.** A view's `.xaml.cs` holds the constructor and, at most, view-only plumbing (focus, animation start). Zero business logic, zero data access (`@rules/mvvm.md`).

## Traps that compile, pass every analyzer, and break at run time

None of the following raises a build error, a format warning or a test failure. Each one has
cost a delivered application.

### A `Setter` only targets a `DependencyProperty`

`<Setter Property="X" />` on a plain CLR property throws `XamlParseException` the first time the
type is loaded — before any UI exists. `Window.WindowStartupLocation`, `Owner` and `DialogResult`
are **not** dependency properties: set them on the element itself. `Width`, `Height`,
`WindowStyle`, `ResizeMode`, `ShowInTaskbar`, `AllowsTransparency`, `Topmost`, `WindowState`,
`Background` and `Icon` are.

### `BasedOn` is mandatory — except where there is no implicit style

A named style without `BasedOn` replaces the implicit style wholesale, template included: the
control renders as a flat rectangle with no content and no exception (§ "Absolute rules" above).
But `BasedOn="{StaticResource {x:Type X}}"` on a type that has **no** implicit style throws at
load: *"Impossible de trouver la ressource nommée 'Wpf.Ui.Controls.X'"*, and the application does
not start.

- **With `BasedOn`**: every templated control — `FluentWindow`, `TitleBar`, `SplitButton`,
  `TextBox`, `ProgressRing`, `Button`, `TextBlock`, `ListBox`, `ListBoxItem`, `TreeView`,
  `ProgressBar`, `ScrollViewer`, `Separator`, `MenuItem`, `GridSplitter`, `ItemsControl`.
- **Without**: presentation elements that carry no template of their own — `ui:SymbolIcon`,
  `ui:SnackbarPresenter` (verified on WPF UI 4.3.0).

When in doubt, launch the application: the failure is an explicit `XamlParseException` in the
log, never a compile error.

### Never write `DataContext="{Binding}"`

It looks like "reproduce the inherited context"; it binds the property to its own value, which
is self-referential, and it replaces inheritance with a local value that may never resolve.
Omitting the attribute is what makes inheritance work.

### `ui:TitleBar.Header` receives no `DataContext`

Content placed in the header is realized inside the control's template. Neither inheritance nor
`RelativeSource AncestorType=Window` reaches it: every `Command` binding resolves to null, the
buttons stay **enabled** — a `Button` with no command is never greyed out — and clicking does
nothing. Give it a `x:Name` and assign `DataContext` from the shell constructor.

Moving the commands out of the header is not a fix: with `ExtendsContentIntoTitleBar`, that band
is window caption and a control merely overlaid on it never receives a click. They must sit in
the header **and** be given their context.

### Diagnosing a binding that does nothing

1. A **visible witness** settles the context question: bind a `TextBlock` to a simple property
   (`Text="{Binding ZoomPercent}"`). Empty means no `DataContext`.
2. `InvokePattern.Invoke()` through UI Automation tests the **command**; a synthetic mouse click
   tests the **hit-testing**. They fail for different reasons — measure them separately.
3. On an inactive window the first click only activates it and is swallowed. Always send two
   before concluding.

## Theme switching

```csharp
// Services/AppThemeService.cs - principle (Wpf.Ui.Appearance)
ApplicationThemeManager.Apply(theme, WindowBackdropType.Mica, updateAccent: false);  // swaps the Fluent dictionary
ApplicationAccentColorManager.Apply(AppConfig.AccentColorValue, theme);              // writes the Accent* resources
ReplaceTokenDictionary(theme);                                                       // Tokens.Light.xaml <-> Tokens.Dark.xaml
await _preferences.SetAsync("theme", theme.ToString());
```

> The service is named `AppThemeService` / `IAppThemeService` on purpose: WPF UI ships its own `Wpf.Ui.IThemeService`, and two interfaces named `IThemeService` in the same container is a resolution trap. Register only the project one unless a WPF UI control genuinely requires theirs.

- Initial theme: persisted preference, otherwise the Windows app theme.
- Icons follow automatically (they bind theme brushes through `DynamicResource`) - no action.
- The accent must be re-applied on a theme change: its light and dark variants differ.

## Internal organization of `Tokens.xaml`

```xml
<!-- ============================================================
     Tokens.xaml - [APP_NAME] v[VERSION]
     Reference: design-system.md v1.0 (WPF) - project palette
     ============================================================ -->
<ResourceDictionary>
  <!-- TYPOGRAPHY (family, sizes, weights, line heights) -->
  <!-- SPACING (Thickness, uniform + directional variants) -->
  <!-- FIXED SIZES (title bar, status bar, nav pane, drawer, content, icons) -->
  <!-- SHAPE (corner radii, border widths) -->
  <!-- OPACITY (disabled, overlay) -->
  <!-- TRANSITIONS (easing + durations) -->
  <!-- Z-ORDER (layering scale) -->
  <!-- BRUSH ALIASES (Icon*Brush, Chart*Brush, Selection*) -> Fluent brushes -->
</ResourceDictionary>
```

`Tokens.Light.xaml` / `Tokens.Dark.xaml` hold **only** the palette role overrides (`design-system.md` §2): application background, layer background, primary text, control stroke. Everything not overridden stays Fluent.

## Internal organization of `Styles.xaml`

```xml
<!-- ============================================================
     Styles.xaml - [APP_NAME] v[VERSION]
     Reference: design-system.md v1.0 (WPF) - layout.md v1.0
     ============================================================ -->

<!-- SHELL: window, title bar, navigation pane, content host, status bar -->
<!-- BUTTONS: PrimaryButtonStyle, SecondaryButtonStyle, DangerButtonStyle, GhostButtonStyle -->
<!-- INPUTS: TextBox, ComboBox, CheckBox, DatePicker - error state included -->
<!-- DATA: DataGrid (header, row, cell), TreeView, ListView -->
<!-- FEEDBACK: snackbar presenter anchors, dialog host, progress -->
<!-- OVERLAYS: drawer, dialog overlay -->
<!-- TEXT: section title, subtitle, status bar text -->
```

Each block opens with a comment naming the tokens it consumes. Styles that only set a Fluent property to a token value are still declared here, so no view sets it inline.

## Per-project palette

In Phase 1 the project picks a **palette** (named or custom): the accent is mandatory, the four other roles are optional overrides (main background, secondary background, text, details). The accent is applied through the accent manager, which derives its light and dark variants; the optional roles become brush overrides in `Tokens.Light.xaml` / `Tokens.Dark.xaml`. Everything else stays Fluent. The default palette is what `design-system.md` documents - a custom palette changes the override dictionaries only; `design-system.md` stays unchanged.

## Anti-patterns - what NOT to do

- **Do not** write a literal color, size, or margin on an element. Every styled element gets a `Style` and a named resource.
- **Do not** write a literal value in `Styles.xaml` - only resource references. New value: token first.
- **Do not** add a theme trigger or a theme test in C# - the theme is a dictionary swap.
- **Do not** add a `DropShadowEffect` or a gradient to fake elevation - Fluent surfaces already carry it.
- **Do not** use `StaticResource` for a themed brush - it freezes at load and dark mode breaks on that element.
- **Do not** merge a project dictionary before the Fluent dictionaries - the override would be overwritten.
- **Do not** stack a second control library or theme pack on top of WPF UI.
- **Do not** put logic in a view's code-behind - bind it (`@rules/mvvm.md`).
- **Do not** hardcode a `Panel.ZIndex` - use the `Z*` tokens.
- **Do not** write `DataContext="{Binding}"` - omit the attribute and let inheritance work.
- **Do not** target a plain CLR property with a `Setter`.
- **Do not** ask for `BasedOn` on a type that has no implicit style.
- **Do not** rely on inheritance for `TitleBar.Header` - assign its `DataContext` explicitly.

## Integrity verification

Detailed in `@rules/verification.md`. Key points: zero hardcoded visual value in XAML/C# (the commented splash background excepted); `Styles.xaml` consumes only resource keys; no theme condition outside the dictionary swap; dictionary merge order correct in `App.xaml`; themed brushes referenced with `DynamicResource`; no shadow effect; `Panel.ZIndex` read from the `Z*` tokens; view code-behind free of business logic; no `Setter` on a non-dependency property; `BasedOn` present on every templated control and absent where no implicit style exists; no `DataContext="{Binding}"`; `TitleBar.Header` given its context explicitly.
