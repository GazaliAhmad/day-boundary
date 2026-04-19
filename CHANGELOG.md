# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project aims to follow Semantic Versioning.

## [Unreleased]

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
- v2 module in `lib/day-boundary-v2.js` with explicit IANA time-zone-aware boundary resolution.
- `V2-USAGE.md` covering Node and browser usage, including import-map setup for the Temporal polyfill.
- Companion shift helper layer in `lib/day-boundary-shifts-v2.js` with DST-aware elapsed-duration and wall-clock shift-ending helpers.
- Browser examples for dataset-backed boundary resolution, global DST inspection, and shift-signoff comparison in `examples/`.
- Expanded test coverage for DST-sensitive windows, v2 helper behavior, and shift-duration semantics.
- MIT licensing metadata and a top-level `LICENSE` file.
- `IP-NOTICE.md` clarifying project copyright ownership and business association.

### Changed

- Promoted v2 to the main recommended API for new work.
- Kept v1 as a legacy compatibility path for existing `Date`-based usage.
- Renamed the package to `day-boundary`.
- Renamed the legacy v1 file to `lib/day-boundary-v1.js`.
- Reorganized browser demos into the `examples/` folder.
- Set the package root export `day-boundary` to the v2 API and kept compatibility exports for `day-boundary/v1`, `day-boundary/v2`, and `day-boundary/shifts`.
- Expanded the docs to distinguish legacy v1 from the main v2 path, document the polyfill/browser setup, and align install guidance with package dependencies.
- Updated package metadata with `bugs`, `homepage`, and a strict npm-style repository URL (`git+https://... .git`).
- Refined README opening copy for faster npm-page comprehension, including a direct problem statement and use-case bullets.
- Reduced repeated wording in the early README sections and separated project/legal wording into a dedicated `Legal` section.
- Updated `IP-NOTICE.md` heading text to `Business association permission` for wording consistency.

## [1.0.0] - 2026-04-19

### Added

- Initial JavaScript library for resolving operational day windows that do not start at midnight.
- Strategy-based boundary model with `BoundaryStrategy`, `FixedTimeBoundaryStrategy`, and `DailyBoundaryStrategy`.
- Helper functions for resolving windows, tracking window progress, grouping items by window, comparing timestamps, and generating stable window IDs.
- Browser-based toy app demonstrating a fixed `09:00` operational-day boundary with live window progress and grouped sample events.
- Project documentation in `README.md`.
