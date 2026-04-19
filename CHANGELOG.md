# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project aims to follow Semantic Versioning.

## [Unreleased]

## [2.0.0] - 2026-04-19

### Added

- `ROADMAP.md` capturing the product frame, API stabilization plan, packaging work, example strategy, and milestones for the reusable library.
- `package.json` with an ESM package setup and `npm test`.
- v2 module in `lib/day-boundary-v2.js` with explicit IANA time-zone-aware boundary resolution.
- `V2-USAGE.md` covering Node and browser usage, including import-map setup for the Temporal polyfill.
- Companion shift helper layer in `lib/day-boundary-shifts.js` with DST-aware elapsed-duration and wall-clock shift-ending helpers.
- Browser examples for dataset-backed boundary resolution, global DST inspection, and shift-signoff comparison in `examples/`.
- Expanded test coverage for DST-sensitive windows, v2 helper behavior, and shift-duration semantics.

### Changed

- Promoted v2 to the main recommended API for new work.
- Kept v1 as a legacy compatibility path for existing `Date`-based usage.
- Renamed the package and primary library file to `day-boundary`.
- Reorganized browser demos into the `examples/` folder.
- Added package subpath exports at `day-boundary/v2` and `day-boundary/shifts`.
- Expanded the docs to distinguish legacy v1 from the main v2 path and document the polyfill/browser setup.

## [1.0.0] - 2026-04-19

### Added

- Initial JavaScript library for resolving operational day windows that do not start at midnight.
- Strategy-based boundary model with `BoundaryStrategy`, `FixedTimeBoundaryStrategy`, and `DailyBoundaryStrategy`.
- Helper functions for resolving windows, tracking window progress, grouping items by window, comparing timestamps, and generating stable window IDs.
- Browser-based toy app demonstrating a fixed `09:00` operational-day boundary with live window progress and grouped sample events.
- Project documentation in `README.md`.
