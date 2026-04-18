# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project aims to follow Semantic Versioning.

## [0.1.0] - 2026-04-19

### Added

- Initial JavaScript library for resolving operational day windows that do not start at midnight.
- Strategy-based boundary model with `BoundaryStrategy`, `FixedTimeBoundaryStrategy`, and `DailyBoundaryStrategy`.
- Helper functions for resolving windows, tracking window progress, grouping items by window, comparing timestamps, and generating stable window IDs.
- Browser-based toy app demonstrating a fixed `09:00` operational-day boundary with live window progress and grouped sample events.
- Project documentation in `README.md`.
