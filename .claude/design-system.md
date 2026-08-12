# Design System — v1.0 (WPF)

> Binding reference for all .NET/WPF applications.
> Use: Windows desktop applications, personal and professional use.
> Inseparable from `layout.md`.
> All tokens are **XAML resource keys** declared in `src/App.Wpf/Themes/Tokens.xaml`, merged **after** the Fluent dictionaries.

**Visual language (v1.0)**: Fluent by default. The application looks like a Windows 11 application because it uses the Windows 11 control set — WPF UI (lepoco/wpfui) supplies the WinUI 3 controls (`NavigationView`, `InfoBar`, `Snackbar`, `TitleBar`, `Card`) and the Fluent theme. Depth, surfaces, corner radii, and elevation come from the theme; the project contributes its **accent** and, optionally, four role overrides. Motion is the theme's own. The signature gesture is the `NavigationView` selection indicator, which Fluent already animates.

## Changelog

| Version | Date       | Main change                                                                 |
| ------- | ---------- | --------------------------------------------------------------------------- |
| v1.0    | 2026-08-11 | initial: Fluent baseline via WPF UI · accent-driven palette with 4 optional role overrides · Segoe UI Variable typography · Segoe Fluent Icons · resource-key token model in `Themes/Tokens.xaml` · light/dark switched at runtime by the theme manager |

> Derived from the design system of the source framework. What is kept: the palette model (one mandatory accent, four optional roles), the token discipline (zero hardcoded visual value), the accessibility targets, and the layering scale. What is dropped: the bespoke "depth by stroke" doctrine, the accent-tinted neutrals, and the per-project derived semantics — Fluent owns surfaces, elevation, and semantic colors.

Every generated application references the active version in its `README.md`.

---

## 1. TYPOGRAPHY

Fluent's type ramp, exposed as resource keys so views never write a literal `FontSize`.

| Token key           | Value | Usage                          |
| ------------------- | ----- | ------------------------------ |
| `FontFamilyDefault` | Segoe UI Variable Text | All applications      |
| `FontSizeXs`        | 12    | Status bar, secondary labels   |
| `FontSizeSm`        | 14    | Labels, subtitles, body        |
| `FontSizeBase`      | 16    | Primary text, navigation       |
| `FontSizeLg`        | 18    | Secondary section titles       |
| `FontSizeXl`        | 20    | Intermediate titles            |
| `FontSize2Xl`       | 24    | Primary section titles         |
| `FontWeightNormal`  | Normal    | Body, descriptions         |
| `FontWeightMedium`  | Medium    | Labels, navigation items   |
| `FontWeightSemiBold`| SemiBold  | Titles, headers            |
| `FontWeightBold`    | Bold      | Primary titles             |

```xml
<!-- Themes/Tokens.xaml -->
<FontFamily x:Key="FontFamilyDefault">Segoe UI Variable Text, Segoe UI, Segoe UI Variable Display</FontFamily>
<system:Double x:Key="FontSizeBase">16</system:Double>
```

> `Segoe UI Variable` is the Windows 11 UI face; the fallback chain lands on `Segoe UI` for Windows 10. Zero embedded font, zero dependency; the application always looks native to its OS.

### Line height

| Token key        | Value | Usage                                     |
| ---------------- | ----- | ----------------------------------------- |
| `LeadingTight`   | 1.25  | Titles (`FontSizeLg`, `FontSize2Xl`)      |
| `LeadingNormal`  | 1.5   | Body, labels                              |

Applied as `LineHeight` on `TextBlock` styles (`LineStackingStrategy="BlockLineHeight"`).

### Numerals

Data grids, status bar counters, and any column of figures set `TextOptions.TextFormattingMode="Ideal"` and use the tabular figure variant of Segoe UI Variable so digits align vertically.

---

## 2. COLORS

A project's colors come from a **palette**. Only the **accent is mandatory**: Fluent derives every surface, stroke, and text brush, and the accent manager derives the accent variants. The four other roles (main background, secondary background, text, details) remain available as **explicit overrides** — when provided, their values win over the Fluent defaults.

### Palette roles → resources

| Role (palette)       | Mandatory | Drives                          | Also derives                                                            |
| -------------------- | --------- | ------------------------------- | ----------------------------------------------------------------------- |
| Accent               | yes       | `SystemAccentColor`             | `SystemAccentColorPrimary` / `Secondary` / `Tertiary` (light and dark variants), `AccentTextFillColorPrimaryBrush`, `AccentFillColorDefaultBrush`, selection, focus |
| Main background      | optional  | `ApplicationBackgroundBrush`    | window and page background                                              |
| Secondary background | optional  | `LayerFillColorDefaultBrush`    | cards, expanders, secondary surfaces                                    |
| Text                 | optional  | `TextFillColorPrimaryBrush`     | `TextFillColorSecondaryBrush`, `TextFillColorTertiaryBrush`             |
| Details              | optional  | `ControlStrokeColorDefaultBrush`| `ControlStrokeColorSecondaryBrush`, separators, card borders            |

**Precedence**: an explicit role override replaces the Fluent brush for that role in both theme dictionaries; every brush not overridden keeps its Fluent value. Overrides are declared once in `Themes/Tokens.Light.xaml` / `Themes/Tokens.Dark.xaml`, per theme.

**Where each key comes from** (WPF UI 4.3.0, verified): the theme dictionaries (`ui:ThemesDictionary`) ship the neutral keys - `ApplicationBackgroundBrush`, `LayerFillColorDefaultBrush`, `CardBackgroundFillColorDefaultBrush`, `TextFillColorPrimary/Secondary/TertiaryBrush`, `ControlStrokeColorDefault/SecondaryBrush`, `ControlFillColorSecondary/TertiaryBrush`, `TextOnAccentFillColorPrimaryBrush`, and the `SystemFillColorSuccess/Caution/Critical(+Background)Brush` semantics. The **accent keys are written at runtime** by `ApplicationAccentColorManager` - `SystemAccentColor`, `SystemAccentColorPrimary/Secondary/Tertiary`, `AccentFillColorDefault/Secondary/TertiaryBrush`, `AccentTextFillColorPrimary/Secondary/TertiaryBrush`, `AccentFillColorSelectedTextBackgroundBrush`. Do not look for an accent brush in a static dictionary: it exists only after the accent has been applied, which is why the application order below matters.

### Accent application

The accent is applied once at startup, before the main window is shown, and re-applied on a theme change. It is the **only** color the application computes; the variants come from the library.

```csharp
// App.xaml.cs — principle, called from the composition root
using Wpf.Ui.Appearance;

// 1) Theme first: swaps the Fluent dictionary. updateAccent: false so step 2 owns the accent.
ApplicationThemeManager.Apply(currentTheme, WindowBackdropType.Mica, updateAccent: false);

// 2) Accent: writes the Accent* / SystemAccentColor* resources for that theme.
ApplicationAccentColorManager.Apply(AppConfig.AccentColorValue, currentTheme);
```

Signatures (WPF UI 4.3.0, `Wpf.Ui.Appearance`):

- `ApplicationThemeManager.Apply(ApplicationTheme applicationTheme, WindowBackdropType backgroundEffect = WindowBackdropType.Mica, bool updateAccent = true)`
- `ApplicationAccentColorManager.Apply(Color systemAccent, ApplicationTheme applicationTheme = ApplicationTheme.Light, bool systemGlassColor = false, bool systemAccentColor = false)`
- `ApplicationAccentColorManager.ApplySystemAccent()` - follow the Windows accent instead of the project one, when the project deliberately defers to the OS.

`AppConfig.AccentColor` is the only place the project's accent hex lives (`rules/config.md`); `AccentColorValue` is its parsed `Color`. Changing it re-skins the whole application.

### Named palettes (Phase 1 catalog)

`/wpf-p1-scoping` presents these. A preset is defined by its **accent alone**; the four optional roles may still be listed to override a Fluent brush. Custom palettes: 1 mandatory hex (accent) + up to 4 optional overrides.

| Name                 | Accent  | Optional overrides                                   |
| -------------------- | ------- | ---------------------------------------------------- |
| Steel Blue (default) | #4682B4 | —                                                    |
| Teal                 | #0D9488 | —                                                    |
| Forest               | #059669 | —                                                    |
| Slate                | #4F46E5 | —                                                    |
| Amber                | #B45309 | Main bg #FFFDFB, Secondary bg #FBF6EF                |
| Ruby                 | #BE123C | —                                                    |

### Theme switching

Light and dark are switched at runtime by the theme manager, which swaps the merged Fluent dictionary. `Themes/Tokens.xaml` declares its overrides in **two `ResourceDictionary` files** (`Tokens.Light.xaml`, `Tokens.Dark.xaml`) selected by the same mechanism — never with a `DynamicResource` written per element.

- Initial theme: persisted preference, otherwise the Windows app theme (`ShouldSystemUseDarkMode`).
- A theme change re-applies the accent for the new theme (the variants differ) and persists the preference.
- Zero theme condition inside `Styles.xaml` — the dictionaries carry the difference (`rules/xaml.md`).

### Semantic colors

Fluent ships them; the project does not derive them. Use the theme's own resources so meaning stays consistent with the rest of Windows.

| Semantic | Brush key                            | Usage                        |
| -------- | ------------------------------------ | ---------------------------- |
| success  | `SystemFillColorSuccessBrush`        | Success snackbar, icon       |
| warning  | `SystemFillColorCautionBrush`        | Warning snackbar, icon       |
| danger   | `SystemFillColorCriticalBrush`       | Danger snackbar, icon, `.btn-danger` fill |
| info     | `AccentFillColorDefaultBrush`        | Info snackbar — info is the accent |

Their background counterparts (`SystemFillColorSuccessBackgroundBrush` and siblings) back the snackbar surfaces. Snackbar body text always uses `TextFillColorPrimaryBrush`.

### Charts / visualization palette

Chart series consume the semantic and accent brushes through resource keys (`ChartPrimaryBrush` = `AccentFillColorDefaultBrush`, `ChartSuccessBrush` = `SystemFillColorSuccessBrush`, and so on). They follow both themes with no redefinition.

### Text selection

| Token key            | Value                                | Usage                       |
| -------------------- | ------------------------------------ | --------------------------- |
| `SelectionBrush`     | `AccentFillColorSecondaryBrush`      | Selected text background    |
| `SelectionTextBrush` | `TextFillColorPrimaryBrush`          | Selected text color         |
| `TextOnAccentBrush`  | `TextOnAccentFillColorPrimaryBrush`  | Text on an accent-filled button |

---

## 3. SPACING

Declared as `Thickness` resources. Views never write a literal `Margin` or `Padding`.

| Token key   | Value | Usage                     |
| ----------- | ----- | ------------------------- |
| `Spacing1`  | 4     | Micro-spacing             |
| `Spacing2`  | 8     | Compact inner padding     |
| `Spacing3`  | 12    | Standard padding          |
| `Spacing4`  | 16    | Inter-element spacing     |
| `Spacing5`  | 20    | Intermediate spacing      |
| `Spacing6`  | 24    | Main content padding      |
| `Spacing7`  | 28    | Wide intermediate spacing |
| `Spacing8`  | 32    | Major separation          |

```xml
<Thickness x:Key="Spacing4">16</Thickness>
<Thickness x:Key="Spacing4Horizontal">16,0</Thickness>
```

Directional variants (`Spacing4Horizontal`, `Spacing4Vertical`) are declared alongside the uniform one when a style needs them — never inline.

---

## 4. COMPONENT SIZES

### Fixed sizes (global visual anchors)

| Token key           | Value | Usage                       |
| ------------------- | ----- | --------------------------- |
| `TitleBarHeight`    | 48    | Title bar height            |
| `StatusBarHeight`   | 28    | Status bar height           |
| `NavPaneWidth`      | 280   | Expanded navigation pane    |
| `NavPaneCompactWidth` | 48  | Collapsed navigation pane   |
| `DrawerWidth`       | 320   | Right drawer width          |
| `ContentMaxWidth`   | 1024  | Max centered content width  |
| `IconSizeSm`        | 16    | Small icon                  |
| `IconSizeMd`        | 20    | Standard icon               |
| `IconSizeLg`        | 24    | Navigation / title bar icon |

### Dynamic sizes — general principle

**Rule**: no control has a fixed `Width` or `Height` except the anchors above. Dimensions result from content + padding. Zero hardcoded `Width`/`Height` in XAML outside the fixed tokens.

| Control            | Width                                     | Height                     | Exception                              |
| ------------------ | ----------------------------------------- | -------------------------- | -------------------------------------- |
| Button             | content + horizontal padding              | content + vertical padding | aligned group: `SharedSizeGroup`       |
| TextBox            | stretches in its container                | content + vertical padding | —                                      |
| DataGrid column    | `SizeToCells` / `*`                       | —                          | actions column: fixed                  |
| Navigation item    | pane width                                | content + vertical padding | —                                      |
| Label              | content, wrap if constrained              | content                    | —                                      |
| ContextMenu        | longest item                              | content                    | —                                      |
| Dialog             | content                                   | content                    | `MinWidth` 480 (see `layout.md` §8)    |
| TreeViewItem       | content + indentation                     | vertical padding           | —                                      |
| Snackbar           | —                                         | multi-line content         | fixed width 360                        |

---

## 5. SHAPE, ELEVATION, BORDERS, OPACITY

Fluent expresses depth with **layered surfaces plus a subtle stroke**, and the theme already carries both. The project does not invent an elevation language; it uses the theme's surfaces (`CardBackgroundFillColorDefaultBrush`, `LayerFillColorDefaultBrush`) and strokes.

| Token key           | Value | Usage                                        |
| ------------------- | ----- | -------------------------------------------- |
| `CornerRadiusSm`    | 4     | Buttons, fields, badges                      |
| `CornerRadiusMd`    | 8     | Cards, dialogs, snackbars, flyouts           |
| `BorderWidth`       | 1     | Standard borders, separators                 |
| `BorderWidthEmphasis` | 2   | Focus, field-in-error                        |
| `BorderWidthAccent` | 4     | Snackbar leading accent                      |

> Corner radii come in two steps only. A nested surface uses the smaller step. No third radius, no per-control value.

### Opacity

| Token key          | Value | Usage                                  |
| ------------------ | ----- | -------------------------------------- |
| `OpacityDisabled`  | 0.4   | Disabled interactive elements          |
| `OpacityOverlay`   | 0.4   | Dialog / drawer dimming overlay        |

Disabled controls rely on the Fluent disabled visual state where one exists; `OpacityDisabled` covers custom composites only.

---

## 6. TRANSITIONS

| Token key            | Value                          | Usage                                 |
| -------------------- | ------------------------------ | ------------------------------------- |
| `EaseOut`            | `CubicEase` `EaseOut`          | Every transition                      |
| `TransitionDefault`  | 160 ms                         | hover, focus, color/border changes    |
| `TransitionSlow`     | 240 ms                         | Panels, drawer, navigation indicator  |

**Motion policy**: hover/focus/state changes transition; nothing else animates. No entry animations on flyouts, dialogs, or snackbars beyond what the Fluent control templates already do. The only expressive movement is the `NavigationView` selection indicator, which the theme animates on its own — do not reimplement it.

---

## 7. FOCUS

Fluent's focus visual (a two-tone ring) is the system focus indicator. Keep it.

- `FocusVisualStyle` is never set to `{x:Null}`.
- `KeyboardNavigation.TabNavigation` set to `Cycle` on dialogs and to `Local` on panes.
- Custom composite controls declare a focus visual consistent with the theme, using `BorderWidthEmphasis` and the accent brush.

---

## 8. INTERACTIVE CONTROL STATES

Applies to **neutral interactive controls**: navigation items, list/grid/tree items, pagination buttons, secondary and ghost buttons. Accent-filled controls follow §9.

Fluent's control templates already define `PointerOver`, `Pressed`, `Disabled`, and `Selected` visual states. Use them; do not restate them per element.

| State                | Rule                                                                         |
| -------------------- | ---------------------------------------------------------------------------- |
| default              | Base style from the theme                                                    |
| `PointerOver`        | Theme's `ControlFillColorSecondaryBrush` surface + stroke step, `TransitionDefault` |
| `Pressed`            | Theme's `ControlFillColorTertiaryBrush` (transient press feedback)            |
| selected             | Accent text and the navigation selection indicator (below)                    |
| disabled             | Theme's disabled state, or `OpacityDisabled` + `IsHitTestVisible="False"` on composites |
| keyboard focus       | Fluent focus visual (§7), never removed                                       |

> A selected item (persistent) stays distinct from a pressed item (transient). Do not conflate them.

### Signature gesture — the navigation selection indicator

The selected indicator of the `NavigationView` is an accent pill that **slides** between items. It is the identity gesture of the system and it ships with the control: it is configured, never hand-built.

- Never replace it with a hand-written `Border` plus an animation.
- Where a horizontal tab strip is used instead (`layout.md` §12 alternative pattern), the tab control's own selection indicator plays the same role.
- Under "reduce motion" (`SystemParameters` animation setting off), the indicator snaps — the theme handles it.

---

## 9. BUTTONS

| Variant   | Style key            | Background                         | Text                        | Border                       |
| --------- | -------------------- | ---------------------------------- | --------------------------- | ---------------------------- |
| Primary   | `PrimaryButtonStyle` | `AccentFillColorDefaultBrush`      | `TextOnAccentBrush`         | none                         |
| Secondary | `SecondaryButtonStyle` | theme default control fill       | `TextFillColorPrimaryBrush` | `ControlStrokeColorDefaultBrush` |
| Danger    | `DangerButtonStyle`  | `SystemFillColorCriticalBrush`     | `TextOnAccentBrush`         | none                         |
| Ghost     | `GhostButtonStyle`   | transparent                        | `TextFillColorSecondaryBrush` | transparent                |

**States per variant**: taken from the Fluent template (`PointerOver` and `Pressed` darken the fill by the theme's own steps). Only the accent and critical fills are set by the project; the state steps are the theme's.

**Dynamic sizing** — the size results from content + padding:

| Size                | Vertical padding | Horizontal padding | Font                              |
| ------------------- | ---------------- | ------------------ | --------------------------------- |
| `ButtonSmall`       | `Spacing1` (4)   | `Spacing3` (12)    | `FontWeightMedium` `FontSizeXs`   |
| `ButtonMedium` (default) | `Spacing2` (8) | `Spacing4` (16)  | `FontWeightMedium` `FontSizeSm`   |
| `ButtonLarge`       | `Spacing3` (12)  | `Spacing6` (24)    | `FontWeightMedium` `FontSizeBase` |

**Aligned button group**: a `Grid` with `Grid.IsSharedSizeScope="True"` and a common `SharedSizeGroup` on the button columns — width unified on the widest button.

---

## 10. ICONS — Segoe Fluent Icons

Font: **Segoe Fluent Icons**, shipped with Windows 11 (Windows 10 falls back to Segoe MDL2 Assets). Zero image asset, zero download, zero licence question.

```xml
<!-- Usage in a view -->
<ui:SymbolIcon Symbol="Home24" FontSize="{StaticResource IconSizeMd}"
               Foreground="{DynamicResource IconDefaultBrush}" />
```

| Token key            | Value                            |
| -------------------- | -------------------------------- |
| `IconDefaultBrush`   | `TextFillColorSecondaryBrush`    |
| `IconActiveBrush`    | `AccentTextFillColorPrimaryBrush`|
| `IconSuccessBrush`   | `SystemFillColorSuccessBrush`    |
| `IconWarningBrush`   | `SystemFillColorCautionBrush`    |
| `IconDangerBrush`    | `SystemFillColorCriticalBrush`   |
| `IconInfoBrush`      | `AccentFillColorDefaultBrush`    |
| `IconMutedBrush`     | `TextFillColorTertiaryBrush`     |

> The icon brushes alias theme brushes, so they follow the palette and both themes with no redefinition.

**Sizes**: `IconSizeSm` (16), `IconSizeMd` (20), `IconSizeLg` (24), applied as `FontSize`.

**Theme change**: no action — the brushes are dynamic resources, icons follow instantly.

---

## 11. XAML APPLICATION RULES

1. **Zero hardcoded visual value in XAML or C#.** Every color, size, font is a resource key from `Themes/Tokens.xaml`. Zero literal `Background="#RRGGBB"`, zero literal `Margin="12"` on a styled element.
2. **Every styled control carries a `Style`** referencing a named resource. `x:Name` is reserved for the shell anchors the ViewModel or the code-behind genuinely needs.
3. **Dark mode is a dictionary swap** performed by the theme manager — never a per-element `DynamicResource` condition and never a theme test in C#.
4. **`Styles.xaml` contains no literal value** of color, size, or duration — only `{StaticResource}` / `{DynamicResource}`. Every style carries a comment naming the source token.
5. **The navigation selection indicator is the control's own** (§8): never reimplemented, never animated by hand.

```xml
<!-- Styles.xaml — token: ApplicationBackgroundBrush / TextFillColorPrimaryBrush -->
<Style TargetType="Window" x:Key="AppWindowStyle">
  <Setter Property="Background" Value="{DynamicResource ApplicationBackgroundBrush}" />
  <Setter Property="Foreground" Value="{DynamicResource TextFillColorPrimaryBrush}" />
</Style>
```

---

## 12. ACCESSIBILITY

Target: **WCAG 2.1 level AA**.

| Criterion             | Rule                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------ |
| Text contrast         | ≥ 4.5:1 normal text, ≥ 3:1 large text (≥ 18px bold or ≥ 24px) and UI components             |
| Tertiary text         | Disabled / decorative only, exempt from AA. Never for primary content                       |
| Status bar text       | `TextFillColorSecondaryBrush` (not tertiary). Essential/error status uses the primary brush |
| Accent contrast       | The chosen accent ≥ 3:1 against the application background in both themes, and the on-accent text ≥ 4.5:1 against the accent fill |
| Automation properties | Every interactive control carries `AutomationProperties.Name`; icon-only buttons always     |
| Minimum target size   | 24px. `ButtonSmall` (~24px) is the floor; prefer `ButtonMedium` for touch contexts          |
| Focus visibility      | Fluent focus visual always visible, never set to `{x:Null}`                                 |
| Keyboard reachability | Every command reachable without a pointer; `AccessKey` on primary dialog actions            |
| Reduced motion        | The Windows animation setting is honored by the Fluent templates; custom animations check `SystemParameters.ClientAreaAnimation` |
| High contrast         | The Fluent theme follows the Windows high-contrast setting; project overrides must not hardcode a color that survives it |

> Contrast figures are computed estimates, not tool-measured. Phase 1 runs the AA check on: text/background, secondary text/background, accent/background, on-accent text/accent, **and default text on the selection surface** in both themes; it reports failures without blocking.

### Text on a selected item

A selected `ListBoxItem`, `TreeViewItem` or grid row takes the accent as its background. When
the project accent is dark, a label that keeps `TextFillColorPrimaryBrush` becomes unreadable in
the light theme — dark on dark. The pair is easy to miss because the Phase 1 grid checks the
accent against the *background*, not against the *text that lands on it*.

The fix belongs to the container, not to the template: leave the inner `TextBlock` without a
`Foreground` so it inherits, set a default `Foreground` on the item style, and add a trigger.

```xml
<Style x:Key="OutlineItemStyle" BasedOn="{StaticResource {x:Type ListBoxItem}}" TargetType="ListBoxItem">
  <Setter Property="Foreground" Value="{DynamicResource TextFillColorPrimaryBrush}" />
  <Style.Triggers>
    <Trigger Property="IsSelected" Value="True">
      <Setter Property="Foreground" Value="{DynamicResource TextOnAccentFillColorPrimaryBrush}" />
    </Trigger>
  </Style.Triggers>
</Style>
```

A `Foreground` set inside the `DataTemplate` wins over the container and defeats the trigger.

---

## 13. LAYERING (z-order)

WPF has no `z-index`: order comes from the visual tree and from the popup layer. The scale below is the **declaration order** every generated shell follows, so a persistent danger snackbar is never hidden.

| Token key           | Order | Element                                        |
| ------------------- | ----- | ---------------------------------------------- |
| `ZContent`          | 0     | Main content (`Grid` row of the shell)         |
| `ZDrawerOverlay`    | 100   | Drawer dimming overlay                         |
| `ZDrawer`           | 110   | Right drawer                                   |
| `ZDialogOverlay`    | 200   | Dialog dimming overlay                         |
| `ZDialog`           | 210   | Dialog host                                    |
| `ZFlyout`           | 300   | Flyout / context menu (popup layer)            |
| `ZSnackbar`         | 400   | Snackbar host                                  |

> Declared as `ZIndex` integers in `Tokens.xaml` and applied with `Panel.ZIndex` on the shell overlays. Flyouts and context menus live in the popup layer and are already above the window content; their entry exists so the shell keeps one readable ordering table. No hardcoded `Panel.ZIndex` outside these tokens.
