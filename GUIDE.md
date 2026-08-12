# Guide d'utilisation — WPF App Generator (unifié)

> Version unifiée : pipeline de génération + skills de maintenance, rôle explicite par skill, specs persistées, vérification exécutable, mémoire native.

---

## Structure du framework

```
wpf-app-generator/
├── CLAUDE.md                 # Instructions core (EN) · persona · communication FR · index commandes · calibrage
├── GUIDE.md                  # Ce fichier
├── README.md                 # Présentation du repo GitHub (EN)
├── CHANGELOG.md              # Changelog du générateur (distinct de celui des apps générées)
├── LICENSE
└── .claude/
    ├── design-system.md      # Référence visuelle contraignante (thème Fluent, WPF UI) — source de vérité unique
    ├── layout.md             # Cadre layout d'accompagnement — catalogue de patterns + composition par défaut + spec snackbars
    ├── sf-cli-reference/     # Catalogue commandes/flags sf v2 (chargé par section si intégration Salesforce)
    ├── rules/
    │   ├── mvvm.md           # Models · Services · ViewModels · Views, livraison par lots
    │   ├── xaml.md           # ResourceDictionary, tokens, thème clair/sombre, nommage
    │   ├── errors.md         # Contrat Result<T>, snackbars, handlers globaux d'exception
    │   ├── threading.md      # Thread UI, Dispatcher, async void, CancellationToken
    │   ├── security.md       # Données sous %APPDATA%, DPAPI, SQL paramétré, Process, WebView2
    │   ├── config.md         # AppConfig, Directory.Packages.props, .csproj, i18n
    │   ├── packaging.md      # dotnet publish self-contained single-file, icône, versions d'assembly
    │   ├── db.md             # Accès Microsoft.Data.Sqlite, migrations versionnées
    │   ├── sf-cli.md         # Intégration Salesforce CLI opt-in (runner Process, Org Manager)
    │   ├── splash.md         # Splash screen opt-in (fenêtre de démarrage, icône, thème)
    │   ├── tests.md          # xUnit v3, couverture par couche
    │   ├── logging.md        # Serilog obligatoire (fichier, niveaux, zéro Console.WriteLine)
    │   ├── versioning.md     # Changelog SemVer des apps générées
    │   ├── verification.md   # Vérification EXÉCUTABLE centralisée + intégrité statique
    │   └── readme.md         # Synchro README post-livraison (régénération auto)
    ├── skills/
    │   ├── wpf-app/               # Menu démarrage / reprise / maintenance (4 options)
    │   ├── wpf-p1-scoping/        # Scoping — 8 questions + couleur → docs/specs/01-scoping.md
    │   ├── wpf-p2-featuring/      # Fiche besoins → docs/specs/02-featuring.md
    │   ├── wpf-p3-surfaces/       # Proposition layout → docs/specs/03-surfaces.md
    │   ├── wpf-p4-architect/      # Contrat architectural verrouillé → docs/specs/04-architect.md
    │   ├── wpf-p5-development/    # Livraison par lots (enchaînement auto)
    │   ├── wpf-add-feature/       # Ajouter une feature à un projet livré (respect contrat + sécurité)
    │   ├── wpf-trace-feature/     # Tracer une fonctionnalité View→ViewModel→Service→Model
    │   ├── wpf-fix-issue/         # Corriger un bug — arbre de décision, cause racine
    │   ├── wpf-refactor-code/     # Restructurer sous validation explicite uniquement
    │   ├── wpf-migrate-design/    # Convertir une app antérieure vers la ligne de base Fluent
    │   ├── wpf-release/           # Figer une version SemVer (changelog cumulé)
    │   ├── wpf-run-tests/         # Vérification exécutable (build, format, tests)
    │   ├── wpf-load-project/      # Chargement d'un projet existant
    │   ├── wpf-generate-readme/   # Génération README.md projet existant
    │   ├── wpf-save-session/      # Sauvegarde de session
    │   ├── wpf-show-state/        # État courant du projet
    │   ├── wpf-show-contract/     # Arborescence du contrat validé
    │   └── wpf-save-memory/       # Persiste dans la mémoire native Claude Code
    ├── settings.json         # Permissions d'exécution (dotnet) + garde-fous deny (.env, secrets, artefacts)
    └── settings.local.json   # Overrides locaux (non versionné)
```

> Source de vérité **unique** : un seul `design-system.md` et un seul `layout.md`, sous `.claude/` (lus à la demande par les skills UI, non auto-importés — voir `CLAUDE.md` § BINDING REFERENCES). `design-system.md` est contraignant (thème) ; la composition décrite par `layout.md` est un **défaut modifiable**, co-défini en Phase 3 et verrouillé dans `docs/specs/04-architect.md`.

---

## Spécificités de ce framework

| Apport                        | Détail                                                                          |
| ----------------------------- | ------------------------------------------------------------------------------- |
| **Rôle par skill**            | Chaque skill ouvre sur un persona ciblé (Role / Goal / Deliverable).            |
| **Specs persistées**          | Phases 1→4 écrivent `docs/specs/01-scoping.md` … `04-architect.md` (dans la langue de l'utilisateur). |
| **Contrat = source de vérité**| `docs/specs/04-architect.md` relu par `/wpf-load-project`, `/wpf-show-contract`, `/wpf-add-feature`, `/wpf-refactor-code`. |
| **Skills de maintenance**     | `wpf-trace-feature`, `wpf-add-feature`, `wpf-fix-issue`, `wpf-refactor-code`, `wpf-migrate-design`, `wpf-release`, `wpf-run-tests` avec arbres de décision et anti-patterns. |
| **Vérification exécutable**   | `rules/verification.md` : build, format, tests — échec bloquant.                |
| **Mémoire native**            | `/wpf-save-memory` écrit dans la mémoire native Claude Code + `MEMORY.md`.      |

---

## Installation

```bash
# Démarrer Claude Code depuis le dossier du framework (ou copier dans le projet cible).
claude
```

### Prérequis

```bash
claude --version      # Claude Code CLI installé et connecté
dotnet --version      # SDK .NET 10.0+ (pour exécuter les apps générées)
```

### Activer la mémoire (une seule fois, par machine)

```
/config → Memory → Enable auto memory → On
```

---

## Démarrer une nouvelle application

```
/wpf-app → 1
```

### Phase 1 — Scoping

8 questions en un seul bloc : objectif · base de données (SQLite Microsoft.Data.Sqlite / JSON / CSV / aucune) · préférences persistantes · i18n FR/EN · tests (xUnit v3) · icône `.ico` · packaging (`dotnet publish` self-contained) · intégration Salesforce CLI (opt-in `sf` v2 ; défaut recommandé à Yes si l'objectif mentionne Salesforce). Puis choix de la **palette** : un accent obligatoire + jusqu'à 4 rôles optionnels (fond principal, fond secondaire, texte, détails) en override. L'accent produit ses variantes claires et sombres via le gestionnaire d'accent de WPF UI ; les rôles optionnels surchargent les brosses Fluent correspondantes. Palette « Steel Blue » par défaut + 5 palettes nommées (Teal, Forest, Slate, Amber, Ruby) + palette personnalisée ; contrôle de contraste WCAG AA (averti, non bloquant).

Calibrage **provisoire** annoncé (figé après Phase 2) :

| Taille        | Lots (sans tests) | Lots (avec tests) |
| ------------- | ----------------- | ----------------- |
| Petit         | 3                 | 4                 |
| Moyen / Grand | 4                 | 5                 |

Écrit `docs/specs/01-scoping.md`.

### Phase 2 — Featuring

Fiche structurée + calibrage **confirmé** à partir du compte réel. Validation bloquante avant Phase 3. Écrit `docs/specs/02-featuring.md`.

### Phase 3 — Surfaces

Co-conception guidée. Questionnaire structurant (navigation horizontale ou verticale, organisation du contenu, formulaires et actions) appuyé sur le catalogue de patterns de `layout.md` §12 : `NavigationView` latérale (défaut), onglets horizontaux, barre de menus, master-detail. Puis proposition sur mesure, composition librement amendable, et questions de détail (position de la navigation, drawer/dialog, 6 positions de snackbars, splash screen). Validation bloquante. Écrit `docs/specs/03-surfaces.md`.

> **Splash screen (opt-in)** : question Oui/Non (Oui recommandé). Si Oui, fenêtre de démarrage sans cadre affichée jusqu'à ce que la fenêtre principale soit prête, suivant le design system (thème Fluent, palette, mode sombre). Elle affiche l'icône de l'app si définie (Phase 1) ; sinon, un chemin d'icône optionnel est demandé en Phase 3, à défaut le splash montre le nom de l'app. Durée minimale d'affichage configurable (`SplashMinDurationMs`). Détail : `rules/splash.md`.

### Phase 4 — Architect

Arborescence + rôle de chaque fichier + **tableau des services et commandes** (commande ViewModel → service → modèle → vue) + tableau tokens → ressources XAML. **Verrouillé après validation.** Écrit `docs/specs/04-architect.md` (source de vérité).

### Phase 5 — Development

Fichiers écrits directement sur le disque. Annonce `Lot N/[total] — [contenu]`. Enchaînement automatique. Dernier lot : fichiers racine (`.sln`, `Directory.Packages.props`, `Directory.Build.props`, `.editorconfig`), instructions d'installation, `README.md` + `tools/seed.cs` (jeu de données cohérent si une base est présente). Vérification exécutable appliquée.

---

## Reprendre une session

```
/wpf-save-session        # sauvegarder en fin de session (docs/sessions/)
/wpf-app → 2             # reprendre : fournir le chemin du fichier SESSION
```

La reprise est gérée par `/wpf-app` (option 2, ou bloc SESSION collé directement dans le message — reprise sans menu) : lecture complète du fichier SESSION, réponse `Resuming [APP_NAME] — [phase suivante] | Batch [X/total] | Open points: …`, puis enchaînement immédiat sans re-poser les questions résolues.

En fin de Phase 5, le générateur écrit automatiquement `docs/sessions/SESSION_[NomApp]_S0.md` : la session de référence de la livraison (écrasée si la Phase 5 est rejouée). Les `/wpf-save-session` manuels sont numérotés à partir de S1.

---

## Travailler sur un projet livré

```
/wpf-app → 3     # ou directement /wpf-load-project depuis la racine du projet
```

Claude lit `docs/specs/04-architect.md` (priorité), sinon le README, sinon le code, puis confirme la prise en charge en un bloc au format unifié (`Project loaded: [nom] v[version]`, stack, entités, services, tests, design system, specs, `Generator rules applied. Ready for: development · fixes · improvements · adjustments.`) et applique toutes les règles. Projet sans README : `/wpf-generate-readme`.

### Maintenance (`/wpf-app → 4`)

| Besoin                          | Commande      |
| ------------------------------- | ------------- |
| Ajouter une fonctionnalité      | `/wpf-add-feature`   |
| Comprendre / tracer le code     | `/wpf-trace-feature` |
| Corriger un bug                 | `/wpf-fix-issue`     |
| Restructurer (sous validation)  | `/wpf-refactor-code` |
| Convertir une app antérieure vers la ligne de base Fluent | `/wpf-migrate-design` |
| Figer une version SemVer (changelog cumulé) | `/wpf-release` |
| Vérifier le build / lancer les checks | `/wpf-run-tests` |

---

## Vérification exécutable

`rules/verification.md` est la source unique. Commandes (échec bloquant quand l'environnement le permet) :

```bash
dotnet restore                        # résolution des paquets (Central Package Management)
dotnet build -c Debug                 # compilation — zéro warning (TreatWarningsAsErrors)
dotnet format --verify-no-changes     # format + analyseurs Roslyn
dotnet test                           # xUnit — si tests activés (Phase 1)
dotnet publish -c Release             # packaging — si activé (Phase 1) ou sur demande
```

> `dotnet build` échoue sur un warning : c'est voulu (`TreatWarningsAsErrors`). Corriger la cause, jamais `#pragma warning disable` sans justification écrite.
> Erreur `NU1008` au build : une version de paquet a été écrite dans un `.csproj` alors que `Directory.Packages.props` est la source unique.

`/wpf-run-tests` exécute cette échelle ; `/wpf-fix-issue` y renvoie pour confirmer une correction.

---

## Sécurité et thread UI

`rules/security.md` est non négociable et appliqué à 100% : données utilisateur sous `%APPDATA%`, secrets via DPAPI (`ProtectedData`), SQL toujours paramétré, chemins résolus et confinés, processus externes lancés avec `ArgumentList`, WebView2 durci si utilisé. `rules/threading.md` en est le pendant côté interface : marshalling `Dispatcher`, zéro `async void` hors handlers, `CancellationToken` sur toute opération longue. `/wpf-fix-issue` et `/wpf-add-feature` y renvoient systématiquement.

---

## Gestion des anomalies et mémoire

Après correction (`/wpf-fix-issue` ou Phase 5), Claude produit un bilan de nettoyage puis propose `Veux-tu mémoriser ce point ? /wpf-save-memory`. `/wpf-save-memory` catégorise et écrit dans la **mémoire native Claude Code** (+ `MEMORY.md`).

Prérequis : la mémoire auto doit être activée (`/config → Memory → Enable auto memory → On`). Sans cette activation, `/wpf-save-memory` formule les notes mais ne les persiste pas entre sessions.

---

## Commandes de référence

| Commande               | Modèle | Action                                                    |
| ---------------------- | ------ | --------------------------------------------------------- |
| `/wpf-app`             | Haiku  | Menu démarrage / reprise / maintenance                    |
| `/wpf-p1-scoping`      | Sonnet | Scoping — 8 questions + couleur                           |
| `/wpf-p2-featuring`    | Sonnet | Fiche besoins                                             |
| `/wpf-p3-surfaces`     | Sonnet | Proposition layout + personnalisation                     |
| `/wpf-p4-architect`    | Sonnet | Contrat architectural verrouillé (services et commandes)  |
| `/wpf-p5-development`  | Sonnet | Livraison par lots — enchaînement automatique             |
| `/wpf-add-feature`     | Sonnet | Ajouter une feature à un projet livré                     |
| `/wpf-trace-feature`   | Sonnet | Tracer une fonctionnalité à travers les couches           |
| `/wpf-fix-issue`       | Sonnet | Corriger un bug — cause racine                            |
| `/wpf-refactor-code`   | Sonnet | Restructurer sous validation                              |
| `/wpf-migrate-design`  | Sonnet | Convertir une app antérieure vers la ligne de base Fluent |
| `/wpf-release`         | Sonnet | Figer une version SemVer depuis le changelog cumulé       |
| `/wpf-run-tests`       | Sonnet | Vérification exécutable                                   |
| `/wpf-load-project`    | Sonnet | Charger un projet existant                                |
| `/wpf-generate-readme` | Sonnet | Générer README.md d'un projet existant                    |
| `/wpf-save-session`    | Haiku  | Sauvegarder la session                                    |
| `/wpf-show-state`      | Haiku  | État courant                                              |
| `/wpf-show-contract`   | Haiku  | Contrat architectural validé                              |
| `/wpf-save-memory`     | Haiku  | Persister dans la mémoire native                          |

---

## Structure d'une application générée

```
mon-app/
├── MonApp.sln · Directory.Packages.props · Directory.Build.props · .editorconfig
├── README.md
├── CLAUDE.md                      # Identité projet (origine, contexte, écarts) — généré en fin de Phase 5
├── .claude/settings.json          # Garde-fous + hook de vérification (app auto-contrôlée)
├── docs/specs/                    # Specs de génération (langue utilisateur)
├── docs/release/CHANGELOG.md      # Changelog SemVer (Keep a Changelog)
├── src/App.Wpf/
│   ├── App.xaml · App.xaml.cs     # Point d'entrée, composition IHost
│   ├── AppConfig.cs               # Constantes applicatives
│   ├── Models/                    # DTOs, entités, exceptions métier nommées
│   ├── Services/                  # Logique métier, accès données, Result<T>
│   ├── ViewModels/                # ObservableObject + RelayCommand
│   ├── Views/                     # Fenêtres, pages, contrôles de layout XAML
│   ├── Resources/                 # Chaînes .resx (si i18n)
│   ├── Themes/                    # Tokens.xaml · Styles.xaml (fusionnés après Fluent)
│   └── Assets/                    # icône .ico, assets packaging
└── tests/App.Wpf.Tests/           # xUnit v3 (si activé)
```

### Versioning & changelog

Chaque app générée porte une version SemVer et un changelog `docs/release/CHANGELOG.md` (format Keep a Changelog, rédigé en anglais). Les skills de maintenance (`add-feature`, `fix-issue`, `refactor-code`, `migrate-design`) accumulent leurs entrées sous `## [Unreleased]` ; `/wpf-release` les fige en un bloc de version daté et incrémente la source de version (`<Version>` du `.csproj` + le miroir `AppConfig.AppVersion`). La version n'est jamais incrémentée en silence. Voir `rules/versioning.md`.

---

## Points de vigilance

- `.claude/design-system.md` et `.claude/layout.md` sont la **source de vérité unique** — ne pas les dupliquer. La composition portée par `layout.md` est un défaut modifiable (retenue validée en Phase 3) ; le thème de `design-system.md` reste contraignant.
- Le thread UI (`.claude/rules/threading.md`) : toute mutation d'une propriété liée depuis un thread de fond passe par le `Dispatcher`. C'est la première cause d'exception d'exécution en WPF.
- Les clés de ressources visuelles sont centralisées dans `Themes/Tokens.xaml` — zéro valeur visuelle en dur dans le XAML ou le C#.
- Le contrat (`docs/specs/04-architect.md`) est verrouillé. Tout changement structurel passe par `/wpf-add-feature` ou le protocole de déclaration d'écart.
- `/wpf-load-project`, `/wpf-generate-readme`, `/wpf-add-feature`, `/wpf-trace-feature`, `/wpf-fix-issue`, `/wpf-refactor-code`, `/wpf-migrate-design`, `/wpf-release`, `/wpf-run-tests` s'invoquent depuis la racine du projet cible.
- Les versions de paquets ne sont écrites que dans `Directory.Packages.props` — jamais dans un `.csproj`.
