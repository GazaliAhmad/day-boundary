# Roadmap

This roadmap reflects the current state of `day-boundary` after the `2.0.0` release.

The library is now positioned as:

> a reusable boundary engine for systems where the operational day is not midnight

The current direction is:

- v2 is the main API for new work
- v1 remains available as a legacy compatibility path
- shift-specific semantics stay in a companion layer, not in the core boundary engine

## Current State

The repo already includes:

- a legacy v1 API in [lib/day-boundary-v1.js](./lib/day-boundary-v1.js)
- a main v2 API in [lib/day-boundary-v2.js](./lib/day-boundary-v2.js)
- a companion shift layer in [lib/day-boundary-shifts-v2.js](./lib/day-boundary-shifts-v2.js)
- a test suite covering v1, v2, DST-sensitive windows, and shift semantics
- browser examples in [examples/](./examples/)
- npm packaging metadata for `day-boundary@2.0.0`

The package surface is currently:

- `day-boundary` -> main v2 API
- `day-boundary/v1` -> legacy v1 API
- `day-boundary/v2` -> explicit v2 subpath
- `day-boundary/shifts` -> companion shift helpers

## Product Frame

The core library should stay narrow.

The library is responsible for:

- resolving boundary-defined day windows
- comparing timestamps by window membership
- grouping records into boundary windows
- computing progress through a boundary window
- handling explicit time zones and DST correctly in v2

The library is not responsible for:

- calculating calendar labels
- becoming a general scheduling engine
- embedding domain-specific business meaning into the core API
- replacing downstream application logic

Use [use-cases.md](./use-cases.md) as the filter for future additions.

## Core Direction

### Main path

The main path is v2.

That means future product and documentation decisions should assume:

- `Temporal`-based primitives
- explicit IANA time zones
- correct DST and non-24-hour day behavior
- `Temporal.ZonedDateTime` windows in the public API

### Legacy path

v1 remains available for:

- existing integrations
- simpler local-only or single-zone usage
- migration support

v1 should be maintained conservatively.
It should receive bug fixes and clarity improvements, but not drive the main design direction.

## Current Examples

The current example suite is:

- [examples/day-boundary-toy-app/index.html](./examples/day-boundary-toy-app/index.html)
- [examples/day-boundary-hijri-poc/index.html](./examples/day-boundary-hijri-poc/index.html)
- [examples/day-boundary-dst-toy-app/index.html](./examples/day-boundary-dst-toy-app/index.html)
- [examples/day-boundary-shift-toy-app/index.html](./examples/day-boundary-shift-toy-app/index.html)

These examples currently validate:

- fixed daily boundaries
- shifting per-date boundaries
- dataset-backed window resolution
- DST-aware day duration behavior
- global time-zone behavior
- elapsed-duration versus wall-clock shift semantics

## Next Priorities

The next phase should focus on hardening and adoption rather than expanding the core API too quickly.

### 1. Error behavior and documentation polish

The code is already strict, but the remaining work is to make error behavior easier for consumers to understand and rely on.

Focus areas:

- document expected error types more explicitly
- standardize wording for invalid boundary resolution failures
- keep examples clear about what throws and why

### 2. Real-world example coverage

The existing examples are strong, but more domain-specific validation may still be useful.

Good candidates:

- hospital or care-shift grouping
- ride-hailing or earnings-window reporting
- another dataset-backed example in a DST-sensitive region

Promotion rule:

- if only one example needs a behavior, keep it in the example layer
- if multiple examples need the same behavior, consider promoting it into a helper or companion module

### 3. Packaging and publishing hygiene

Before broader adoption, keep tightening the publishing story.

Focus areas:

- keep package metadata aligned with docs
- periodically verify `npm pack` contents
- keep the public import story simple and stable
- make browser/polyfill guidance easy to follow

### 4. API stability review

v2 is now the main path, but it is still worth reviewing whether the current public names should remain final.

Focus areas:

- keep the core surface small
- resist adding convenience overloads too quickly
- prefer clear companion helpers over bloating the main boundary engine

## Companion Layer Strategy

The shift helpers validate an important design principle:

- boundary resolution belongs in the core library
- shift/payroll/staffing interpretation belongs in a companion layer

That separation should be preserved.

Potential future companion directions:

- label-mapping helpers
- reporting adapters
- higher-level shift or rota helpers

These should only be added when repeated real use cases justify them.

## Deferred Work

The following items are intentionally deferred unless stronger evidence appears:

- general business-period abstractions beyond boundary-defined days
- calendar-label calculation inside core
- a full scheduling or roster engine
- heavy domain logic in the main package

## Documentation Direction

The documentation should continue to reinforce:

- `day-boundary` is the main v2 entry point
- `day-boundary/v1` is the legacy path
- `day-boundary/shifts` is a companion layer
- the library is a boundary engine, not a general date library

## Milestones

### `2.x`

Focus on:

- documentation clarity
- package consistency
- example refinement
- careful API stability review

### `3.0.0` candidate threshold

A major version should only be considered if one of these becomes necessary:

- a breaking change to the v2 public API
- a change to the public window shape
- a major revision to the package entry structure
- a deliberate narrowing or widening of the library scope

## Bottom Line

The early roadmap was about proving the abstraction.

That phase is complete.

The current roadmap is about:

- stabilizing the v2-first package story
- validating the abstraction across real examples
- resisting unnecessary expansion
- keeping the core library small, clear, and credible
