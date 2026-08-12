# Layout System — v1.0 (WPF)

> Companion layout reference — not a constraint. This file provides: (1) a **proposed default
> composition** and a **catalog of alternative composition patterns** (§12) that Claude co-designs
> from in Phase 3, the user amending or replacing freely;
> (2) the **feedback spec** (snackbars, dialogs) serving the error contract; (3) **defaults and
> technical recommendations** (dimensions, behaviors) — never a composition restriction.
> The retained composition is the one validated in `docs/specs/03-surfaces.md` and locked in
> `docs/specs/04-architect.md`.
> Built on `design-system.md v1.0 (WPF)`. The two files are inseparable.

## Changelog

| Version | Date       | Main change                                                                                      |
| ------- | ---------- | ------------------------------------------------------------------------------------------------ |
| v1.0    | 2026-08-11 | initial: Fluent shell (`FluentWindow` + `TitleBar` + `NavigationView`) as the default composition · snackbar feedback spec (6 positions) · dialog spec · composition pattern catalog (§12) |

Every generated application references the active version in its `README.md`.

---

## 1. GLOBAL STRUCTURE

Proposed default composition — submitted in Phase 3, amendable or replaceable by the user.

```
┌─────────────────────────────────────────────────────┐
│              TITLE BAR (48px)                       │
│  [ Icon / Name ]                     [ Theme ] [ _ □ × ] │
├──────────┬──────────────────────────────────────────┤
│ NAV PANE │                                          │
│ (280px)  │            MAIN CONTENT                  │
│          │            (scrollable area)             │
│ [ico] …  │                                          │
│ [ico] …  │                                          │
├──────────┴──────────────────────────────────────────┤
│                 STATUS BAR (28px)                   │
└─────────────────────────────────────────────────────┘
```

Proposed XAML skeleton (`Views/MainWindow.xaml`):

```
<ui:FluentWindow x:Name="AppShell">      Grid rows: TitleBarHeight, *, StatusBarHeight
  <ui:TitleBar x:Name="TitleBar" />
  <ui:NavigationView x:Name="NavView">   pane + content frame
  <ContentPresenter x:Name="MainContent" />
  <StatusBar x:Name="StatusBar" />
  <ui:SnackbarPresenter x:Name="SnackbarHost" />   overlaid (Panel.ZIndex)
  <ContentControl x:Name="Drawer" />               overlaid (optional)
</ui:FluentWindow>
```

**Right drawer** (optional, over the content):

```
┌─────────────────────────────────────────────────────┐
│                    TITLE BAR                        │
├──────────┬────────────────────────┬─────────────────┤
│ NAV PANE │    MAIN CONTENT        │ DRAWER (320px)  │
│          │    (reduced)           │ sliding         │
├──────────┴────────────────────────┴─────────────────┤
│                   STATUS BAR                        │
└─────────────────────────────────────────────────────┘
```

**Snackbar** (overlaid, bottom-right corner by default):

```
┌─────────────────────────────────────────────────────┐
│                    TITLE BAR                        │
├──────────┬──────────────────────────────────────────┤
│ NAV PANE │            MAIN CONTENT                  │
│          │                       [ Snackbar 1 ]     │
│          │                       [ Snackbar 2 ]     │
├──────────┴──────────────────────────────────────────┤
│                   STATUS BAR                        │
└─────────────────────────────────────────────────────┘
```

---

## 2. WINDOW

Default values — customizable in Phase 3.

| Property             | Default                                                                 |
| -------------------- | ----------------------------------------------------------------------- |
| window type          | `ui:FluentWindow` with `ExtendsContentIntoTitleBar="True"`               |
| `MinWidth`           | 1024                                                                    |
| `MinHeight`          | 768                                                                     |
| position on launch   | centered on the primary display; when the persisted-position preference is on and a position was saved, that saved position is restored instead (centering is the first-launch / preference-off fallback) |
| size on launch       | `AppConfig.WindowDefaultWidth` × `AppConfig.WindowDefaultHeight` (1280×800); restored via the preference when enabled |
| theme on launch      | follows the Windows app theme                                           |
| OS default theme     | light                                                                   |
| show                 | `Show()` called once, at the end of the startup sequence, never before the window is complete (zero white flash). Never created hidden — `@rules/splash.md` |
| `Background`         | current theme background brush (anti-flash)                             |
| backdrop             | `WindowBackdropType.Mica` when the OS supports it, `None` otherwise     |
| native menu          | none — commands live in the shell (§12 P3 for a menu bar)               |
| `Icon`               | `Assets/icon.ico` (provided by the user, otherwise the WPF default)     |

---

## 3. NAVIGATION PANE

| Token                | Default                                  |
| -------------------- | ---------------------------------------- |
| expanded width       | `NavPaneWidth` = 280                     |
| compact width        | `NavPaneCompactWidth` = 48               |
| display mode         | `PaneDisplayMode="Left"`, switched to `LeftMinimal` (icons only) below 1000px window width |
| background           | theme pane background                    |
| right separator      | `BorderWidth` `ControlStrokeColorDefaultBrush` |
| item padding         | `Spacing2` vertical, `Spacing3` horizontal |

### Pane zones (top → bottom)

```
[ App icon + name ]
[ Navigation items ]
···
[ Footer items: Settings, Theme ]
```

| Zone   | Content                                                        |
| ------ | -------------------------------------------------------------- |
| Header | App icon `IconSizeLg` (24) + name `FontWeightSemiBold` `FontSizeBase` |
| Body   | `NavigationViewItem` list — one per top-level view             |
| Footer | Settings item + theme toggle                                   |

### Navigation items

- `ui:NavigationViewItem` with `Icon` (`SymbolIcon`, `IconSizeMd`) + `Content` (label, `FontWeightMedium` `FontSizeSm`).
- Labels wrap within the pane width; never truncated with an ellipsis.
- Selected item: accent text plus the control's own **selection indicator** (`design-system.md` §8) — never hand-built.
- Item `Tag` carries the page key; the ViewModel maps it to the content, so navigation stays testable without the view.
- No sub-item nesting beyond one level; beyond that, use a master-detail inside the page (P4).

### Theme toggle

- Icon only (`SymbolIcon` sun / moon), size `IconSizeLg` = 24.
- Mandatory `ToolTip` and `AutomationProperties.Name`: "Passer en mode sombre" / "Passer en mode clair".
- Instant toggle — the theme manager swaps the dictionaries and the preference is persisted.

---

## 4. MAIN CONTENT AREA

| Token             | Default                                |
| ----------------- | -------------------------------------- |
| background        | theme application background           |
| inner padding     | `Spacing6` = 24                        |
| scroll            | vertical — `ScrollViewer` `Auto`       |
| max content width | `ContentMaxWidth` = 1024 (centered)    |

### Section header

```
[ Section title ]   [ Subtitle / short description ]
```

- Title: `FontWeightBold` `FontSize2Xl` (24), primary text brush.
- Subtitle: `FontWeightNormal` `FontSizeSm` (14), secondary text brush.
- Bottom margin: `Spacing6` = 24 before the content.

---

## 5. SNACKBAR

Fully replaces the inline banner. No inline banner in the applications.
Host: `ui:SnackbarPresenter` declared once in the shell and registered with WPF UI's `ISnackbarService` (`SetSnackbarPresenter`) from the shell constructor. ViewModels inject the project's `IFeedbackService`, which wraps it (`rules/errors.md`).

### Position — Phase 3 choice

6 positions available. Default: `bottom-right`.

| Position        | Anchor          |
| --------------- | --------------- |
| `top-right`     | top + right     |
| `top-left`      | top + left      |
| `top-center`    | top + center    |
| `bottom-right`  | bottom + right  |
| `bottom-left`   | bottom + left   |
| `bottom-center` | bottom + center |

> Motion policy (`design-system.md` §6): the presenter's own show/hide transition is kept; nothing else animates.

### Margins and stacking

| Token                              | Value                                       |
| ---------------------------------- | ------------------------------------------- |
| width                              | 360 (fixed)                                 |
| margin from edge                   | `Spacing4` = 16                             |
| margin from title bar / status bar | `Spacing4` = 16 (per top/bottom anchor)     |
| spacing between snackbars          | `Spacing2` = 8                              |
| stacking                           | Vertical, queue, no overlap                 |
| stacking direction (top)           | new snackbar on top, older ones descend     |
| stacking direction (bottom)        | new snackbar at bottom, older ones rise     |

### Implementation

- The `SnackbarPresenter` is anchored per `AppConfig.SnackbarPosition`.
- `AppConfig.SnackbarPosition` = `"bottom-right"` by default, modified per Phase 3 choice.
- Each anchor is a named `Style` in `Styles.xaml` (alignment setters on the presenter — no inline value, `rules/xaml.md`).

### Display durations

| Type      | Duration   | Manual dismiss    |
| --------- | ---------- | ----------------- |
| `success` | 4s         | No                |
| `info`    | 4s         | No                |
| `warning` | 6s         | Yes (×)           |
| `danger`  | persistent | Yes (×) mandatory |

### Snackbar anatomy

```
┌────────────────────────────────────┐
│ [icon]  Main message           [×] │
│         Optional description       │
└────────────────────────────────────┘
```

| Token            | Value                                        |
| ---------------- | -------------------------------------------- |
| padding          | `Spacing3` vertical, `Spacing4` horizontal   |
| leading accent   | `BorderWidthAccent` = 4, semantic brush      |
| background       | semantic background brush                    |
| message font     | `FontWeightMedium` `FontSizeSm` (14)         |
| description font | `FontWeightNormal` `FontSizeXs`, secondary text brush |
| icon             | `IconSizeMd` = 20                            |

| Type      | Background                              | Accent                          | Icon (Segoe Fluent)  |
| --------- | --------------------------------------- | ------------------------------- | -------------------- |
| `success` | `SystemFillColorSuccessBackgroundBrush` | `SystemFillColorSuccessBrush`   | `CheckmarkCircle24`  |
| `warning` | `SystemFillColorCautionBackgroundBrush` | `SystemFillColorCautionBrush`   | `Warning24`          |
| `danger`  | `SystemFillColorCriticalBackgroundBrush`| `SystemFillColorCriticalBrush`  | `DismissCircle24`    |
| `info`    | theme layer background                  | `AccentFillColorDefaultBrush`   | `Info24`             |

> Snackbar message text uses the primary text brush. Icons use the matching `Icon*Brush` (`design-system.md` §10).
> Layering: the snackbar host uses `ZSnackbar` (400), above dialogs (`design-system.md` §13), so a persistent danger snackbar is never hidden.

---

## 6. RIGHT DRAWER

Optional component. Default values below.

| Token             | Default                                                          |
| ----------------- | ---------------------------------------------------------------- |
| width             | `DrawerWidth` = 320                                              |
| animation         | slide from the right, `TransitionSlow` = 240 ms (`TranslateTransform`) |
| background        | theme card background                                            |
| left border       | `BorderWidth` `ControlStrokeColorDefaultBrush`                   |
| corner radius     | `CornerRadiusMd` on the inner leading corners                    |
| padding           | `Spacing6` = 24                                                  |
| overlay           | primary text brush at `OpacityOverlay` (0.4)                     |

- Opened by explicit action only. Never automatically.
- Close: click the overlay, `Escape`, or the × button in the drawer.
- Drawer header: `FontWeightSemiBold` `FontSizeLg` (18) title + × button aligned right.
- Drawer content: vertically scrollable on overflow.

---

## 7. STATUS BAR

Default values below.

| Token              | Default                          |
| ------------------ | -------------------------------- |
| height             | `StatusBarHeight` = 28           |
| background         | theme layer background           |
| top border         | `BorderWidth` `ControlStrokeColorDefaultBrush` |
| horizontal padding | `Spacing4` = 16                  |
| font               | `FontWeightNormal` `FontSizeXs`  |
| text brush         | `TextFillColorSecondaryBrush`    |

> WCAG: the secondary text brush on the layer background sits near the AA threshold (4.5:1) — the Phase 1 AA check reports the exact ratio. Essential or error status uses the primary text brush for full contrast. The tertiary brush is reserved for disabled/decorative use (see `design-system.md` §12).

### Status bar zones (left → right)

```
[ Status message ]  ···  [ Progress ]  [ Contextual info ]
```

| Zone   | Content                                                                     |
| ------ | --------------------------------------------------------------------------- |
| Left   | Current status message ("Prêt", "Chargement…", "3 éléments sélectionnés")   |
| Center | Compact `ProgressBar` (height 8) — visible only when an operation is running |
| Right  | Fixed contextual info (record count, version, DB connection…)                |

---

## 8. RECURRING COMPONENTS

### Data grid (`DataGrid`)

- `AutoGenerateColumns="False"`, columns declared explicitly, `CanUserAddRows="False"`.
- Header: theme layer background, `FontWeightSemiBold` `FontSizeSm`, secondary text brush.
- Header bottom border: `BorderWidthEmphasis` on the default stroke brush.
- Row: dynamic height (vertical padding `Spacing2` = 8), bottom border `BorderWidth` on the subtle stroke brush.
- Columns: `SizeToCells` or `*`. Exception: actions column — fixed width per content.
- Column sorting: `CanUserSortColumns="True"`, one sort column at a time; the active column shows the built-in indicator. A presentational column such as the actions column sets `CanUserSort="False"`.
- Selected row: accent secondary fill background.
- Row hover: the theme's `PointerOver` state.
- Row alternation: disabled (`AlternationCount="0"`) — uniform surfaces.
- Pagination below the grid recommended beyond ~50 rows.
- Binding: `ItemsSource` to an `ObservableCollection<T>` exposed by the ViewModel; never a code-behind fill.

### Input form

- Labels above the fields, `FontWeightMedium` `FontSizeSm`, primary text brush.
- Fields: `HorizontalAlignment="Stretch"` in their container, dynamic height (vertical padding `Spacing2` = 8).
- Spacing between fields: `Spacing4` = 16.
- Field in error: `BorderWidthEmphasis` critical brush + a message below the field, `FontSizeXs`, critical brush. Validation surfaces through `INotifyDataErrorInfo` on the ViewModel (`rules/mvvm.md`), never through code-behind checks.
- Form actions: aligned right — Cancel (`SecondaryButtonStyle`) + Confirm (`PrimaryButtonStyle`), dynamic width per label, `SharedSizeGroup` to align them.
- Submission via a `RelayCommand` with a `CanExecute` guard — never a click handler that mutates the model.

### Tree view (`TreeView`)

- Indentation per level: `Spacing4` = 16.
- Expand/collapse icon: `SymbolIcon` chevron, `IconSizeSm` = 16, tertiary text brush.
- Item height: dynamic (vertical padding `Spacing1` = 4).
- Selected item: accent secondary fill background.
- `HierarchicalDataTemplate` bound to the ViewModel tree; no manual `TreeViewItem` construction.

### Charts / Visualization

- Background: transparent (inherits the main content).
- Palette: `ChartPrimaryBrush`, `ChartSuccessBrush`, `ChartWarningBrush`, `ChartDangerBrush`, `ChartInfoBrush`.
- Legend: `FontWeightNormal` `FontSizeSm`, secondary text brush.
- Chart library: to validate in Phase 1 (none by default).

### Dialog

```
┌─────────────────────────────────────┐
│  Dialog title                   [×] │
├─────────────────────────────────────┤
│                                     │
│  Content (form, text…)              │
│                                     │
├─────────────────────────────────────┤
│              [ Cancel ] [ Confirm ] │
└─────────────────────────────────────┘
```

Hosted by `ui:ContentDialog` inside the shell's dialog host, driven by WPF UI's `IContentDialogService` (its `ContentPresenter` registered from the shell constructor) injected into the ViewModels.

| Token         | Default                                     |
| ------------- | ------------------------------------------- |
| width         | dynamic per content, `MinWidth` 480         |
| background    | theme application background                |
| border        | `BorderWidth` on the default stroke brush   |
| corner radius | `CornerRadiusMd`                            |
| padding       | `Spacing6` = 24                             |
| overlay       | primary text brush at `OpacityOverlay` (0.4)|

- Opened by explicit action only.
- Close: × button, Cancel, `Escape`, or click on the overlay.
- Header: `FontWeightSemiBold` `FontSizeLg` title + × button on the right, bottom border on the subtle stroke brush.
- Footer: actions on the right — Cancel (secondary) + Confirm (primary), top border on the subtle stroke brush.
- Content: vertically scrollable on overflow.
- Zero `MessageBox.Show` — always this styled dialog (`rules/errors.md`).

### Pagination

Shown below a grid when it grows long — beyond ~50 rows by default.

```
[ ← ]  [ 1 ]  [ 2 ]  [ 3 ]  ···  [ 12 ]  [ → ]
                  Page 2 sur 12
```

| Token             | Default                                              |
| ----------------- | ---------------------------------------------------- |
| position          | below the grid, aligned right                        |
| spacing from grid | `Spacing4` = 16                                      |
| page button       | dynamic per number, padding `Spacing2` horizontal    |
| active button     | accent secondary fill background, accent text        |
| inactive button   | `GhostButtonStyle`                                   |
| button hover      | theme `PointerOver` state                            |
| ← → buttons       | `IconSizeSm` icons, disabled on first/last page via `CanExecute` |
| page label        | `FontWeightNormal` `FontSizeXs`, tertiary text brush, centered |
| visible pages     | 5 numbers by default — `···` ellipsis beyond         |

---

## 9. GLOBAL KEYBOARD NAVIGATION

Default shortcuts — customizable in Phase 3.

| Shortcut            | Action                                  |
| ------------------- | --------------------------------------- |
| `Tab` / `Shift+Tab` | Navigate between interactive elements   |
| `Enter` / `Space`   | Activate the focused button / item      |
| `Escape`            | Close the active drawer / dialog / flyout |
| `Alt+1…9`           | Direct navigation to pane item N        |
| `Ctrl+,`            | Open Settings                           |

Implementation: `InputBindings` (`KeyBinding` → `RelayCommand`) declared on the shell window — never a global hotkey registration, which is reserved for out-of-focus shortcuts and not required here.

---

## 10. PERSISTED PREFERENCES

A `preferences.json` file under `%APPDATA%\<AppName>` — read and written only by `Services/PreferencesService.cs` (`rules/security.md`), injected into the ViewModels.

| Preference           | Default value |
| -------------------- | ------------- |
| theme                | OS system     |
| window size          | 1280×800      |
| window position      | centered      |
| navigation pane state| expanded      |
| drawer state         | closed        |
| language (if i18n)   | fr            |
| snackbar position    | bottom-right  |

---

## 11. DESIGN SYSTEM CROSS-REFERENCE

This file does not redefine tokens — it consumes them. Every visual value is traced to `design-system.md v1.0 (WPF)`.

| Need                       | Token / brush                                             |
| -------------------------- | --------------------------------------------------------- |
| Main background            | `ApplicationBackgroundBrush`                              |
| Secondary areas background | `LayerFillColorDefaultBrush`                              |
| Drawer / card background   | `CardBackgroundFillColorDefaultBrush`                     |
| Primary text               | `TextFillColorPrimaryBrush`                               |
| Secondary text             | `TextFillColorSecondaryBrush`                             |
| Strokes                    | `ControlStrokeColorDefaultBrush` / `ControlStrokeColorSecondaryBrush` |
| Active / selection color   | `AccentFillColorDefaultBrush` / `AccentFillColorSecondaryBrush` |
| Focus                      | Fluent focus visual (`design-system.md` §7)               |
| Easing                     | `EaseOut`                                                 |
| Panel transitions          | `TransitionSlow` = 240 ms                                 |
| State transitions          | `TransitionDefault` = 160 ms                              |
| Shape                      | `CornerRadiusSm` = 4 / `CornerRadiusMd` = 8               |
| Elevation                  | theme surfaces — never a hand-written shadow              |
| Line height                | `LeadingTight` 1.25 / `LeadingNormal` 1.5                 |
| Overlay opacity            | `OpacityOverlay` 0.4                                      |
| Stacking order             | `Z*` layering scale (`design-system.md` §13)              |

---

## 12. COMPOSITION PATTERNS

Catalog of alternative composition patterns for the Phase 3 co-design flow. The default composition (§1-§10) is pattern **P1**. Each pattern below is a starting point the user may amend or replace; dimensions are defaults. The retained composition is recorded in `docs/specs/03-surfaces.md` and locked in `docs/specs/04-architect.md`. The feedback spec (§5 snackbars, §8 dialogs) applies to every pattern.

### P1 — NavigationView pane (default)

Left navigation pane inside a Fluent window — the composition proposed by default in Phase 3, and the shape a Windows 11 user expects.

**Structure**: see §1 (shell, drawer, snackbar overlay) and §3 (pane zones, items, theme toggle). Not repeated here.

| Element        | Default                                          |
| -------------- | ------------------------------------------------ |
| title bar      | `TitleBarHeight` = 48 — §2                       |
| navigation pane| `NavPaneWidth` = 280, compact 48 — §3            |
| status bar     | `StatusBarHeight` = 28 — §7                      |

**When to recommend**: 3 or more top-level views; grouped sections; long labels; a navigation the user wants always visible. This is the default because it is the Fluent shell.

**Implementation notes**: anchors `AppShell`, `TitleBar`, `NavView`, `MainContent`, `StatusBar` (§1). The `NavigationView` owns page instantiation through its `Navigate` call; each page resolves its ViewModel from the container (`rules/mvvm.md`).

**Interactions**: snackbars (§5), drawer (§6), status bar (§7), and dialogs (§8) unchanged. Master-detail (P4) may be used inside a page.

### P2 — Horizontal tabs

Tab strip below the title bar — for 2-5 top-level views of comparable weight and a flat hierarchy.

**Structure**

```
┌─────────────────────────────────────────────────────┐
│              TITLE BAR (48px)                       │
├─────────────────────────────────────────────────────┤
│  [ Tab 1 ] [ Tab 2 ] [ Tab 3 ]        TABS (40px)   │
├─────────────────────────────────────────────────────┤
│            MAIN CONTENT                             │
│            (scrollable area)                        │
├─────────────────────────────────────────────────────┤
│                STATUS BAR (28px)                    │
└─────────────────────────────────────────────────────┘
```

| Element         | Default                                                             |
| --------------- | ------------------------------------------------------------------- |
| tab strip height| 40                                                                  |
| tab control     | `ui:NavigationView` with `PaneDisplayMode="Top"` - the Fluent horizontal navigation, same control as P1 |
| tab label       | `FontWeightMedium` `FontSizeSm` (14)                                |
| tab padding     | `Spacing4` = 16 horizontal                                          |
| selected tab    | accent text + the control's own selection indicator                 |
| unselected tab  | secondary text brush                                                |
| visible tabs    | 5 at most; beyond that, switch to P1                                |

**When to recommend**: 2-5 views of comparable weight, no sub-navigation, a window the user keeps narrow.

**Implementation notes**: anchor `NavView` with `PaneDisplayMode="Top"` - P2 is a display-mode switch on the P1 control, not a different control, so switching between the two patterns later costs one property. `MenuItemsSource` bound to the ViewModel's page collection; a single page is realized at a time. Never rebuild the selection indicator by hand (`design-system.md` §8).

**Interactions**: snackbars (§5), drawer (§6), status bar (§7), and dialogs (§8) unchanged. Master-detail (P4) may be used inside a tab.

### P3 — Menu bar

A classic File/Edit/View command bar above the content — for command-driven, document-oriented apps.

**Structure**

```
┌─────────────────────────────────────────────────────┐
│  File   Edit   View   Help          MENU BAR (32px) │
├─────────────────────────────────────────────────────┤
│              NAV PANE or TABS (optional)            │
├─────────────────────────────────────────────────────┤
│            MAIN CONTENT                             │
├─────────────────────────────────────────────────────┤
│                STATUS BAR (28px)                    │
└─────────────────────────────────────────────────────┘
```

| Element        | Default                                                       |
| -------------- | ------------------------------------------------------------- |
| height         | 32                                                            |
| control        | `Menu` styled with the Fluent template                        |
| background     | theme application background                                  |
| bottom border  | `BorderWidth` on the default stroke brush                     |
| menu label     | `FontWeightMedium` `FontSizeSm` (14), primary text brush       |
| label padding  | `Spacing2` vertical, `Spacing3` horizontal                    |
| open panel     | theme flyout background, `CornerRadiusMd`, `MinWidth` 200     |
| panel item     | `FontSizeSm`, padding `Spacing2` / `Spacing4`, `CornerRadiusSm` |
| separator      | `Separator` on the subtle stroke brush                        |
| disabled item  | tertiary text brush, `IsEnabled="False"`                      |
| layering       | popup layer (`design-system.md` §13)                          |

**When to recommend**: many commands for few views (editor, document tool, admin console); actions that do not map onto navigation items; users expecting the File/Edit/View convention.

**Implementation notes**: anchor `MenuBar`. Every `MenuItem` binds a `RelayCommand` from the shell ViewModel, with `CanExecute` driving the enabled state — never a click handler in the code-behind. Keyboard access keys (`_File`) are declared on the labels.

**Interactions**: snackbars (§5), drawer (§6), status bar (§7), and dialogs (§8) unchanged. The menu bar is a **command** surface: it composes with a navigation surface (P1 or P2) rather than replacing it.

### P4 — Master-detail

List panel + detail panel — for one dominant entity browsed and inspected item by item.

**Structure**

```
┌─────────────────────────────────────────────────────┐
│                    TITLE BAR                        │
├────────────────────┬────────────────────────────────┤
│  MASTER LIST       │  DETAIL PANE                   │
│  (320px)           │  (flexible)                    │
│  [ item ]          │  [ title + item actions ]      │
│  [ item selected ] │  [ fields / sections ]         │
│  [ item ]          │                                │
├────────────────────┴────────────────────────────────┤
│                   STATUS BAR                        │
└─────────────────────────────────────────────────────┘
```

| Element             | Default                                                    |
| ------------------- | ---------------------------------------------------------- |
| master list width   | 320                                                        |
| resizable split     | optional — `GridSplitter` 4 wide, default stroke brush     |
| list background     | theme layer background                                     |
| separator           | `BorderWidth` on the default stroke brush                  |
| list item padding   | `Spacing2` vertical, `Spacing4` horizontal                 |
| list item separator | `BorderWidth` on the subtle stroke brush                   |
| selected item       | accent secondary fill background (same role as the grid row, §8) |
| item hover          | theme `PointerOver` state                                  |
| detail padding      | `Spacing6` = 24                                            |
| empty state         | centered message, secondary text brush, `FontSizeSm`       |
| list header actions | add / refresh — top of the list panel                      |

**When to recommend**: a dominant entity listed and inspected/edited one at a time (records, orgs, files); the user needs the list and the detail visible together; it replaces the grid → dialog round trip.

**Implementation notes**: anchors `MasterList` and `DetailPane`, two columns of a `Grid` inside the content area. Selection lives in the ViewModel (`SelectedItem` bound two-way); the detail pane binds to it and shows an explicit empty state when it is null. Item actions live in the detail header, list-level actions in the list header.

**Interactions**: composes inside the content area of P1, P2, or P3. Snackbars (§5) and dialogs (§8) unchanged — a destructive confirmation stays a styled dialog (§8). The right drawer (§6) is usually redundant with the detail pane: pick one.
