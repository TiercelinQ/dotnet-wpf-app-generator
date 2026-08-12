---
name: wpf-p3-surfaces
description: Phase 3 of the WPF app generation cycle — guided UI co-design based on the layout.md pattern catalog (navigation, content organization, forms), tailored proposal, grouped detail questions, validated synthesis written to the layout spec before Phase 4.
model: sonnet
---

# /wpf-p3-surfaces — Layout co-design

## Role
UI designer — map the validated features onto a layout co-defined with the user.

## Goal
Define the concrete layout (navigation, content organization, forms and actions, drawer/dialog, snackbar position, recurring components), co-designed from the `layout.md` pattern catalog (§12), freely amendable by the user.

## Deliverable
`docs/specs/03-surfaces.md` (written in the user's language) + on-screen synthesis.

---

## 1. Analysis

**Phase banner (show first)** — before anything else, output the phase banner as plain Markdown in the user's language, **never inside a code block or fenced block**. Three blocks, each on its own line: (1) H2 heading: Phase 3/5 — Surfaces; (2) progress line: Scoping ✓ · Features ✓ · ▶ Surfaces · Architecture · Development; (3) intent in italics: Map the validated features onto the layout. See `## PIPELINE` in `CLAUDE.md`.

**Read `design-system.md` and `layout.md` first** (no longer auto-imported) — `layout.md` includes the **§12 composition pattern catalog** (P1 NavigationView pane — the default, P2 horizontal tabs, P3 menu bar, P4 master-detail).

Then read the features validated in Phase 2 (`docs/specs/02-featuring.md`) and derive the signals that drive the co-design: number of top-level views, flat or grouped hierarchy, dominant entities, list/detail needs, command density, form volume. These signals choose the recommended option of every question below — never ask what the features already answer.

## 2. Structuring questionnaire — questions via `AskUserQuestion`

Adaptive. **Cap: 2 `AskUserQuestion` calls before the proposal** — one call is usually enough (group the open axes into a single call of ≤ 4 questions). Ask only the axes the features leave open; derive the others silently. For each question, mark the option you recommend with `(recommended)`, chosen from the validated feature context, and **justify it in one line** against the features. Ask with `AskUserQuestion` (clickable options, ≤ 4 options each, **Other** for a composition the user defines). Ask in the user's language:

1. **Main navigation** — options drawn from the `layout.md` §12 catalog, the recommended one first:
   A. NavigationView pane (P1) — 3+ views, grouped sections, long labels; the Fluent default
   B. Horizontal tabs (P2) — 2-5 top-level views of comparable weight, flat hierarchy
   C. Menu bar (P3) — many commands for few views (document/action-oriented app)
   D. Master-detail (P4) — one dominant entity listed and inspected item by item
   **Other** — a composition the user describes.

2. **Content organization** — how the retained navigation is filled:
   A. One page per feature
   B. Sections grouping several features
   C. Master-detail inside the content area (list + detail, `layout.md §12` P4)

3. **Forms and actions** — where creation/editing happens:
   A. Dialog over the current page (`layout.md §8`)
   B. Dedicated page / section
   C. Inline in the list
   And where the actions sit: per row · in the section header · in the detail pane.

4. **Recurring components** — only if the features leave it open (data grid vs cards, density, pagination beyond ~50 rows). Otherwise derive them from the features without asking.

## 3. Tailored proposal

Compose the proposal from the retained pattern + the answers, adjusted to the validated features, and state explicitly that the user may amend any part of it or define a different composition. Produce (in the user's language):

## Proposed layout — [APP_NAME]

**Structure**
[Zones of the retained pattern — e.g. title bar + navigation pane / title bar + tabs / menu bar / master + detail — plus main content and status bar]

**Navigation**
| [Pane item / Tab / Section / Menu] | Content |
| --- | ------- |
| …   | …       |

**Recurring components**
- [Data grid / Form / Tree / Charts — depending on the features]

> If the Salesforce CLI integration is on (Phase 1), present the **Org Manager** surface as a baseline: a page listing the orgs (connected/disconnected state, default org marked) with add / remove / reconnect / set-default / refresh actions, typically its own pane item. Confirm its placement in the layout. See @rules/sf-cli.md.

## 4. Detail questions — questions via `AskUserQuestion`

Conditioned on the retained pattern. Same rules as above: recommended option marked, clickable options, ≤ 4 options each, **Other** for the rest, split into ≤ 4-question calls. Ask in the user's language, showing only the questions the retained pattern and the feature context make relevant:

A few choices to confirm:

1. [Only if P1 — NavigationView pane] Pane behavior (`PaneDisplayMode`):
   A. Auto — `Left` above 1000px, `LeftMinimal` (icons only) below
   B. Always `Left` (280px expanded)
   C. Always `LeftMinimal` (icons only, state persisted, `layout.md §10`)

   [Only if P2 — horizontal tabs] Header content beside the `Top` pane:
   A. App name only
   B. App name + global actions (search, theme)

2. Secondary panel: drawer or dialog?
   A. Drawer (persistent side panel)
   B. Dialog (overlay window)
   C. None

[If A — Drawer:]
3. Drawer width:
   A. Fixed 320 (design-system.md default)
   B. Fixed custom — specify the value
   C. Dynamic (adapts to content)

[If B — Dialog:]
3. Dialog size:
   A. Fixed — specify width × height
   B. Dynamic (adapts to content)

4. Dialog internal layout:
   A. Header + main content + footer
   B. Header + 2 columns (main content) + footer
   C. Header + main content (no footer)
   D. Other — I'm not sure, help me choose

5. Snackbar position (`layout.md §5`):
   A. Bottom-right (default)
   B. Bottom-left
   C. Bottom-center
   D. Top-right
   E. Top-left
   F. Top-center

If the project clearly needs no drawer or dialog, skip questions 3/4 and note the absence of a secondary panel. With P4 (master-detail) the detail pane usually replaces the drawer — confirm rather than assume. Question 5 (snackbars) is always asked; the choice sets `AppConfig.SnackbarPosition` and the persisted `snackbar position` preference.

If the user picks D on question 4: ask 3 questions with `AskUserQuestion` to help define the layout:

To help you choose the layout:

a. What is the main purpose of this dialog?
b. Are there actions to perform from this dialog? Yes / No
c. Is the content homogeneous (single block) or heterogeneous (several sections)?

Based on the answers, propose 2 suited layouts with a justified recommendation, then confirm before the synthesis.

6. **Splash screen** (`AskUserQuestion`): `Yes` (recommended) · `No`. A frameless splash window shown at launch until the main window is ready, following the design system (Fluent theme, palette, dark mode). See @rules/splash.md.
   - **If `Yes` and no application icon was defined in Phase 1**: ask, as free-form text, for an **optional** icon path (`.ico`/`.png`) to show on the splash — "Icon to display on the splash? (path, or leave empty for text-only)". A provided image is saved as `Assets/icon.ico` and becomes the app icon everywhere; empty → text-only splash (app name). If the Phase 1 icon is already set, the splash reuses it (no extra question).

## 5. Synthesis

Produce the complete synthesis of the validated layout (in the user's language): the retained composition pattern (`layout.md §12` name — P1/P2/P3/P4 — or "user-defined") and the amendments made to it, structure, navigation, content organization, forms and actions, secondary panel, recurring components, snackbar position, splash screen on/off + icon source.

**→ Explicit validation required before Phase 4.**

## 6. Write the spec

Once validated, write the synthesis to `docs/specs/03-surfaces.md` (in the user's language).

→ Chain to `/wpf-p4-architect` after validation.
