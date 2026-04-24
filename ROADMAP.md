# Roadmap

This roadmap reflects the current state of `day-boundary` after the `3.0.0` release.

The library is now positioned as:

> a reusable boundary engine for systems where meaningful time windows are defined by business boundaries rather than midnight

The current direction is:

- boundary events and boundary windows are the core primitive
- duration helpers are part of that primitive, not a separate domain layer
- business labels stay outside the core library

## Current State

The repo currently includes:

- a stable main API entry in [lib/day-boundary.js](./lib/day-boundary.js)
- neutral boundary-window duration helpers in [lib/window-durations.js](./lib/window-durations.js)
- a test suite covering boundary windows, DST-sensitive behavior, and duration semantics
- browser examples in [examples/](./examples/)
- npm packaging metadata for the current `day-boundary` `3.x` line

The published package surface is currently:

- `day-boundary` -> main API
- `ver-01` and `ver-02` -> repository archives only, not published npm exports
- users who need the old v2 package line should stay on `day-boundary@2.x`

## Product Frame

The core library should stay narrow.

The library is responsible for:

- resolving boundary-defined windows
- comparing timestamps by window membership
- grouping records into boundary windows
- computing progress through a boundary window
- resolving end boundaries from elapsed or wall-clock duration rules
- handling explicit time zones and DST correctly

The library is not responsible for:

- calculating calendar labels
- becoming a general scheduling engine
- embedding payroll, staffing, attendance, SLA, or other business labels into the core API
- replacing downstream application logic

Use [guides/use-cases.md](./guides/use-cases.md) as the filter for future additions.

## Core Direction

### Main path

The main path is the current root API.

That means future product and documentation decisions should assume:

- `Temporal`-based primitives
- explicit IANA time zones
- correct DST and non-24-hour window behavior
- `Temporal.ZonedDateTime` boundaries and windows in the public API
- neutral names that describe time structure rather than one business domain

### Legacy path

Legacy v1 artifacts may remain in the repository for historical context and migration references, but they are repository-only and not part of the published package surface.

## Current Examples

The current example suite is:

- [examples/day-boundary-toy-app/index.html](./examples/day-boundary-toy-app/index.html)
- [examples/day-boundary-hijri-poc/index.html](./examples/day-boundary-hijri-poc/index.html)
- [examples/day-boundary-dst-toy-app/index.html](./examples/day-boundary-dst-toy-app/index.html)
- [examples/day-boundary-duration-toy-app/index.html](./examples/day-boundary-duration-toy-app/index.html)

These examples currently validate:

- fixed daily boundaries
- shifting per-date boundaries
- dataset-backed window resolution
- DST-aware window duration behavior
- global time-zone behavior
- elapsed-duration versus wall-clock boundary-window semantics

## Next Priorities

The next phase should focus on hardening and conceptual clarity rather than growing the API too quickly.

### 1. Event-centered documentation

The docs should make the primitive unmistakable:

- a boundary event opens or closes a window
- a window is the span between two boundary events
- duration helpers are one way to derive an end boundary
- business labels are downstream policy

Focus areas:

- make the event/window model more explicit in the guides
- keep examples consistent with the neutral vocabulary
- reduce lingering day-specific phrasing where it obscures the broader primitive

### 2. Real-world example coverage

The existing examples are strong, but more domain validation may still be useful.

Good candidates:

- ride-hailing or earnings-window reporting
- factory process windows that overrun their planned end boundary
- school or timetable windows with nested sub-windows
- another dataset-backed example in a DST-sensitive region

Promotion rule:

- if only one example needs a behavior, keep it in the example layer
- if multiple examples need the same behavior, consider promoting it into a neutral helper

### 3. Packaging and publishing hygiene

Before broader adoption, keep tightening the publishing story.

Focus areas:

- keep package metadata aligned with docs
- periodically verify `npm pack` contents
- keep the public import story simple and stable
- make browser/polyfill guidance easy to follow

### 4. API stability review

`3.0.0` establishes the current primitive, but the public names are still worth reviewing carefully.

Focus areas:

- keep the core surface small
- resist convenience overloads that blur the primitive
- prefer a few clear helpers over broad domain APIs

## Policy Boundary

The current design depends on a clean separation:

- boundary resolution belongs in the core library
- business interpretation belongs in application policy

That means labels such as:

- late
- absent
- overtime
- overrun
- SLA breach
- handover complete

should remain outside the core primitive unless repeated evidence shows a neutral helper is possible.

Potential future companion directions:

- label-mapping helpers
- reporting adapters
- policy adapters with explicitly non-core positioning

These should only be added when repeated real use cases justify them.

## Deferred Work

The following items are intentionally deferred unless stronger evidence appears:

- general calendar-period abstractions such as quarter/half-year/decade boundaries
- nested boundary timelines in the public API
- calendar-label calculation inside core
- a full scheduling or roster engine
- heavy domain logic in the main package

## Documentation Direction

The documentation should continue to reinforce:

- `day-boundary` is the main entry point
- duration helpers are part of the boundary-window primitive
- the library is a boundary engine, not a general date library
- business policy belongs above the primitive

The documentation structure should stay organized under [guides/](./guides/), with a clear split between:

- usage guides such as [guides/usage.md](./guides/usage.md)
- API and reference documents such as [guides/api.md](./guides/api.md) and [guides/functions-reference.md](./guides/functions-reference.md)
- implementation guidance such as [guides/sql-dst-safe-queries.md](./guides/sql-dst-safe-queries.md)
- positioning and fit documents such as [guides/use-cases.md](./guides/use-cases.md) and [guides/business-use-cases.md](./guides/business-use-cases.md)

## Milestones

### `3.x`

Focus on:

- documentation clarity
- package consistency
- example refinement
- careful API stability review

### `4.0.0` candidate threshold

A major version should only be considered if one of these becomes necessary:

- a breaking change to the current public API
- a change to the public window shape
- a major revision to the package entry structure
- a deliberate expansion from boundary windows into richer event/timeline primitives

## Bottom Line

The early roadmap was about proving the abstraction.

That phase is complete.

The current roadmap is about:

- stabilizing the current package story
- clarifying the boundary-event and boundary-window primitive
- validating the abstraction across real examples
- resisting unnecessary domain expansion
- keeping the core library small, clear, and credible
