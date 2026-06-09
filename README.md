# Auto Layout / Auto Propping Optimizer Lab

[![Deploy GitHub Pages](https://github.com/Javen99/Interactive-Furniture-Layout/actions/workflows/pages.yml/badge.svg)](https://github.com/Javen99/Interactive-Furniture-Layout/actions/workflows/pages.yml)
[![Live demo](https://img.shields.io/badge/demo-GitHub%20Pages-1f8a84)](https://javen99.github.io/Interactive-Furniture-Layout/)

A standalone Web/TypeScript prototype for experimenting with automatic kitchen worktop prop placement. It uses synthetic room plans, primitive object shapes, and a small cost model inspired by public interior-layout research.

Live demo: <https://javen99.github.io/Interactive-Furniture-Layout/>

Suggested GitHub metadata: `Interactive TypeScript lab for automatic kitchen worktop prop placement using public interior-layout research ideas.`

Suggested topics: `interior-design`, `layout-optimization`, `typescript`, `react`, `vite`, `simulated-annealing`, `computational-design`, `furniture-layout`.

![Auto Layout Optimizer Lab preview](docs/preview.svg)

## Research Basis

This project is inspired by public SIGGRAPH 2011 papers:

- Paul Merrell, Eric Schkufza, Zeyang Li, Maneesh Agrawala, Vladlen Koltun, "Interactive Furniture Layout Using Interior Design Guidelines." The paper formulates interior layout as weighted design-guideline costs and explores alternatives with stochastic sampling while respecting user constraints.
- Lap-Fai Yu et al., "Make It Home: Automatic Optimization of Furniture Arrangement." The companion direction adds automatic optimization terms for accessibility, visibility, pathways, walls, and object relationships.

The implementation here is deliberately hobby-sized. It does not use proprietary work repositories, product catalogs, work assets, measured customer rooms, or private naming conventions.

## Paper-To-Prototype Mapping

- Design guideline costs become weighted TypeScript score terms.
- User constraints become pinned props and fixed fixtures.
- Stochastic layout search becomes a deterministic seeded simulated-annealing loop.
- Paper-style alternatives become ranked suggestions with per-term breakdowns.
- Evaluation is kept lightweight: synthetic scenarios, repeated seeds, score deltas, hard-violation counts, accessibility/pathway penalties, and optimizer diagnostics.

## MVP

- 2D top-down SVG editor for synthetic kitchen worktop layouts.
- Scene JSON model for room bounds, surfaces, fixtures, access zones, pathways, view/focal points, and movable props.
- Drag, rotate, pin, import, and export controls.
- Visual authoring controls for creating, selecting, moving, editing, and deleting surfaces, fixtures, access zones, and pathways.
- Routed pathway authoring with optional waypoint handles and segment-aware accessibility scoring.
- Scene validation for duplicate IDs, missing references, invalid dimensions, invalid weights, invalid pathways, and out-of-room warnings.
- Undo and redo for scene-authoring edits, imports, resets, suggestion application, and cost-weight changes.
- Cost-weight profiles for balanced, accessibility-first, display-first, and custom scoring.
- Editable relationship rules for near/avoid prop-to-fixture and prop-to-prop preferences.
- Seeded simulated-annealing optimizer with ranked suggestions and candidate-slot placement proposals.
- Score breakdown for bounds, collisions, pinned movement, clearance, relationships, surface fit, alignment, balance, and visibility.
- Scenario gallery with repeated-seed benchmark summaries.
- Deterministic benchmark-seed replay for reproducing ranked suggestions.
- Optimizer diagnostics for accepted/rejected moves, score history, and rejected cost causes.
- Access-zone and routed pathway primitives for keeping fixture approaches, worktop fronts, and route corridors usable.
- Candidate slot previews for the selected prop, showing plausible legal placements around fixtures, access zones, and pathways.
- Downloadable scene JSON, benchmark reports, and study reports for sharing scenario evidence.
- Blind A/B review mode with local preference voting and exportable study reports.
- Unit tests for geometry, routed pathways, relationship rules, slot generation, scoring, validation, authoring, and optimizer repeatability.

## Tech Stack

- Vite
- React
- TypeScript
- Vitest
- lucide-react icons

## Run

```bash
npm install
npm run dev
```

PowerShell on this machine may block `npm.ps1`. Use `npm.cmd` instead:

```powershell
npm.cmd install
npm.cmd run dev
```

## Test

```bash
npm test
npm run build
```

## Deploy

GitHub Pages is configured through `.github/workflows/pages.yml`.

1. In GitHub, open repository settings.
2. Under Pages, set the source to GitHub Actions.
3. Push to `main` or run the workflow manually.
4. Open <https://javen99.github.io/Interactive-Furniture-Layout/>.

## Project Shape

- `src/domain/types.ts`: public scene JSON, optimizer, benchmark, cost-profile, and study-report types.
- `src/domain/authoring.ts`: immutable scene primitive editing helpers.
- `src/domain/costProfiles.ts`: named scoring profiles and weight updates.
- `src/domain/validation.ts`: structural scene validation and optimizer/evaluation gating.
- `src/domain/sceneHistory.ts`: lightweight undo/redo scene snapshots.
- `src/domain/downloads.ts`: JSON download metadata and browser download helper.
- `src/domain/geometry.ts`: oriented rectangle math, containment, overlap, and placement helpers.
- `src/domain/relationships.ts`: data-driven near/avoid relationship rules and candidate-pose penalties.
- `src/domain/slots.ts`: deterministic candidate surface-slot generation and quality scoring.
- `src/domain/scoring.ts`: weighted guideline terms.
- `src/domain/optimizer.ts`: deterministic stochastic search.
- `src/domain/evaluation.ts`: repeated-seed benchmark summaries, seed replay, and study reports.
- `src/domain/presets.ts`: synthetic public-safe example scenes.
- `src/components`: interactive lab UI.

## How To Evaluate A Layout

- Start with the benchmark panel and compare initial score, optimized score, hard violations, and per-term deltas across fixed seeds.
- Check the validation panel before running benchmarks; hard errors block optimization, warnings flag odd but runnable scenes.
- Use Replay seeds to regenerate ranked suggestions from the same scenario seeds and confirm optimizer changes remain deterministic.
- Tune cost profiles intentionally: accessibility-first should improve clear approaches and pathways, while display-first should prioritize balance and visibility.
- Use Relationship Rules to inspect or tune why props prefer certain fixture/prop distances; old scenes without rules still use built-in defaults.
- Select a prop to inspect candidate slot previews; the best outlined slot should avoid blocked fixtures, access zones, and route corridors.
- Use Blind Review to record score-hidden A/B preferences, then export a study report for qualitative evidence.
- Add or edit synthetic scenarios when introducing a new term so regressions are visible in tests and exported reports.

## Roadmap

- Add a Web Worker only if benchmark runs become visibly blocking.
- Add stronger scenario benchmark coverage and richer report comparisons before attempting whole-room furniture layout.
- Keep Unity/C# as a later port target once this TypeScript version is a stable reference.
