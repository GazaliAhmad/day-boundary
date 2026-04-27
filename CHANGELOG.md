# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project aims to follow Semantic Versioning.

Note: the historical `1.0.0` section below documents the internal baseline for the archived v1 API line. It was not published as a package release. The first public package release was `2.0.0`.

## [3.0.2] - 2026-04-27

### Changed

- Simplified the published npm package so installed consumers now see a single canonical runtime surface under `lib/` with no duplicated `ver-03` runtime files.
- Stopped publishing the `guides/` documentation folder in the npm tarball and updated README documentation links to point at the GitHub-hosted guides instead.
- Inlined the current implementation into `lib/day-boundary.js` and `lib/window-durations.js` so the published package no longer exposes internal version-folder indirection.

## [3.0.1] - 2026-04-27

### Added

- Added an `examples/day-boundary-api-snippets/` browser example page covering `getWindowForZonedDateTime(...)` and `isSameWindow(...)` with focused, smaller demos.

### Changed

- Updated `examples/README.md` to list the API snippets example alongside the existing browser demos.
- Updated the top-level `README.md` examples list so it stays in sync with the current repository example set.

## [3.0.0] - 2026-04-24

### Breaking

- Removed the `day-boundary/shifts` subpath export.
- Kept the archived v2 line in the repository only instead of publishing a `day-boundary/v2` compatibility export in `3.0.0`.
- Removed `shifts.d.ts`.
- Removed shift-specific helpers:
  - `getShiftEndByElapsedDuration(...)`
  - `getShiftEndByWallClockDuration(...)`
  - `compareShiftEndings(...)`
  - `resolveShiftStart(...)`
  - `resolveShiftEnd(...)`
- Removed the shift-specific implementation folder and attendance policy toy app so the package surface is centered on boundary-window primitives.
- Removed the delivery-operations browser example because it duplicated attendance policy behavior with delivery-specific naming rather than demonstrating a distinct primitive.

### Added

- `getWindowEndByElapsedDuration(...)` in the root `day-boundary` export for resolving a boundary-window end by exact elapsed duration.
- `getWindowEndByWallClockDuration(...)` in the root `day-boundary` export for resolving a boundary-window end by local wall-clock duration.
- `compareWindowEndings(...)` in the root `day-boundary` export for comparing elapsed and wall-clock end results.
- `lib/day-boundary.js` as the stable public-facing local entry for the current implementation.
- `lib/window-durations.js` as the stable public-facing module path for boundary-window duration helpers.

### Changed

- Reframed elapsed-vs-wall-clock behavior as a core boundary-window primitive rather than shift-specific behavior.
- Renamed the shift duration toy app to the duration toy app and updated it to use the neutral helper names from the main `day-boundary` entry point.
- Updated package metadata, docs, tests, and examples to remove the shift companion API from the promoted surface.
- Kept archived `ver-01` and `ver-02` material in the repository while publishing only the current `3.0.0` package surface.
- Simplified the published documentation so npm users receive unversioned current guides at `guides/usage.md` and `guides/api.md`.
- Updated active browser examples to use the stable unversioned local entry path instead of exposing internal `ver-03` import paths.

### Migration

Replace shift-specific duration imports:

```js
import { compareShiftEndings } from 'day-boundary/shifts';
```

with root boundary-window duration imports:

```js
import { compareWindowEndings } from 'day-boundary';
```

Map the old duration helper names to the v3 root helpers:

- `getShiftEndByElapsedDuration(...)` -> `getWindowEndByElapsedDuration(...)`
- `getShiftEndByWallClockDuration(...)` -> `getWindowEndByWallClockDuration(...)`
- `compareShiftEndings(...)` -> `compareWindowEndings(...)`

Move shift, attendance, overtime, delivery, SLA, and overrun labels into application policy code layered above the neutral boundary-window results.

## [2.1.1] - 2026-04-22

### Changed

- Reorganized the longer-form documentation into `guides/`, moving the v2 usage/API docs, archived v1 usage guide, functions reference, and use-case material into a single documentation area with normalized filenames.
- Added a `guides/README.md` index and updated `README.md`, `ROADMAP.md`, and package-published file paths to align with the new documentation structure.
- Tightened the documentation split so business framing lives in `guides/business-use-cases.md`, implementation guidance lives in `guides/sql-dst-safe-queries.md`, and API usage/reference remain separate.
- Standardized guide markup, cross-links, heading capitalization, and human-readable Markdown link labels across `README.md` and the `guides/` set for better consistency and navigation.
- Added a delivery-operations browser example alongside the shift attendance toy app, showing rider online/offline windows, inferred closure, and post-window time handling with `day-boundary/shifts`.
- Kept browser examples in the GitHub repository while removing `examples/` from the published npm tarball, with `README.md` updated to use direct GitHub links for the hosted demos.

## [2.1.0] - 2026-04-21

### Added

- `resolveShiftStart(...)` in the v2 shifts companion layer for configurable start-tolerance handling around a shift boundary.
- `resolveShiftEnd(...)` in the v2 shifts companion layer for late log-off classification, missing log-off inference, and neutral time-beyond-scheduled-end measurement from scheduled shift end.
- Runtime validation for `startTolerance.before` and `startTolerance.after` using `Temporal.Duration`, including overlap protection so large tolerance windows cannot blur adjacent shift starts.
- Runtime validation for end-of-shift policy durations, including inference requirements for `missingLogOff.autoCloseAfter`.
- Strict package-wide declaration files in `index.d.ts` and `shifts.d.ts`, keeping the package in JavaScript while providing Temporal-only TypeScript contracts for both `day-boundary` and `day-boundary/shifts`.
- Test coverage for early arrivals, exact-boundary starts, late arrivals, outside-tolerance behavior, DST-safe early reassignment, overlap rejection on short DST days, late log-off handling, missing log-off inference, and post-end time measured from scheduled shift end.

### Changed

- Shift-start assignment now prioritizes exact elapsed-time comparisons via `Temporal.Instant`, keeping early and late tolerance handling DST-safe.
- End-of-shift resolution now separates attendance completion status from downstream payroll interpretation, with inferred log-off handling kept distinct from actual post-end time.
- Split the shifts companion implementation into focused internal modules under `lib/shifts/` for shared validation, start resolution, end resolution, and shift-ending calculations, while preserving `lib/day-boundary-shifts-v2.js` as the stable public entry point.
- Kept the archived v1 API line in the repository as historical reference, while leaving it outside the published npm package.
- Updated `README.md`, `V2-USAGE.md`, and `FUNCTIONS.md` to document the new shift start/end helpers and package-wide type declarations.
- Wired `package.json` exports and published files so editors and TypeScript consumers resolve `index.d.ts` for `day-boundary` and `shifts.d.ts` for `day-boundary/shifts`, with `lib/shifts/` included in the published package for the current layout.

## [2.0.2] - 2026-04-21

### Changed

- Refined `README.md` so the npm landing page makes the default v2 entry point clearer, with `FixedTimeBoundaryStrategy` and `getWindowForInstant` called out immediately for first-time users.
- Tightened README wording around operational windows, DST behavior, entry-point selection, and example naming for better consistency and coherence.
- Extracted inline styles from the browser example HTML files into sibling `styles.css` files for cleaner example structure in `examples/`.

## [2.0.1] - 2026-04-19

### Added

- `FUNCTIONS.md` as a dedicated v2 reference covering the public API table, internal helper inventory, strategy classes, and shifts companion functions.

### Changed

- Included `FUNCTIONS.md` in the published npm package via the `files` list in `package.json`.
- Improved npm package discoverability by refining the package description and keywords around Temporal, time zones, DST, business-day boundaries, reporting windows, shift scheduling, and payroll use cases.

## [2.0.0] - 2026-04-19

### Added

- `ROADMAP.md` capturing the product frame, API stabilization plan, packaging work, example strategy, and milestones for the reusable library.
- `package.json` with an ESM package setup and `npm test`.
- v2 module entry in `lib/ver-02/day-boundary.js` with explicit IANA time-zone-aware boundary resolution.
- `V2-USAGE.md` covering Node and browser usage, including import-map setup for the Temporal polyfill.
- Companion shift helper layer in `lib/day-boundary-shifts-v2.js` with DST-aware elapsed-duration and wall-clock shift-ending helpers.
- Browser examples for dataset-backed boundary resolution, global DST inspection, and shift-signoff comparison in `examples/`.
- Expanded test coverage for DST-sensitive windows, v2 helper behavior, and shift-duration semantics.
- MIT licensing metadata and a top-level `LICENSE` file.
- `IP-NOTICE.md` clarifying project copyright ownership and business association.

### Changed

- Promoted v2 to the main recommended API for new work.
- Kept the archived v1 API line available for existing `Date`-based usage.
- Renamed the package to `day-boundary`.
- Renamed the archived v1 API file to `lib/ver-01/day-boundary.js`.
- Reorganized browser demos into the `examples/` folder.
- Set the package root export `day-boundary` to the v2 API and kept compatibility exports for `day-boundary/v1`, `day-boundary/v2`, and `day-boundary/shifts`.
- Expanded the docs to distinguish the archived v1 API line from the main v2 path, document the polyfill/browser setup, and align install guidance with package dependencies.
- Updated package metadata with `bugs`, `homepage`, and a strict npm-style repository URL (`git+https://... .git`).
- Refined README opening copy for faster npm-page comprehension, including a direct problem statement and use-case bullets.
- Reduced repeated wording in the early README sections and separated project/legal wording into a dedicated `Legal` section.
- Updated `IP-NOTICE.md` heading text to `Business association permission` for wording consistency.

## [1.0.0] - 2026-04-19 (internal only, not published)

### Added

- Initial JavaScript library for resolving operational day windows that do not start at midnight.
- Strategy-based boundary model with `BoundaryStrategy`, `FixedTimeBoundaryStrategy`, and `DailyBoundaryStrategy`.
- Helper functions for resolving windows, tracking window progress, grouping items by window, comparing timestamps, and generating stable window IDs.
- Browser-based toy app demonstrating a fixed `09:00` operational-day boundary with live window progress and grouped sample events.
- Project documentation in `README.md`.
