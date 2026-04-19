# Roadmap

This project is aimed at being a reusable library for custom operational day boundaries.

The scope is intentionally narrow:

- resolve which operational day window a timestamp belongs to
- compare timestamps by operational day membership
- group records by operational day window
- compute progress through the current operational day

For v1, the library should stay focused on custom day boundaries. It should not expand into a general scheduling engine or arbitrary business-period framework unless multiple real examples prove that broader abstraction is necessary.

## Product Frame

The working product statement is:

> Day Boundary Library resolves custom operational day windows when the day does not start at midnight.
Use [use-cases.md](./use-cases.md) as the filter for future additions. A feature should belong in the core library only when it supports repeated operational-boundary logic with meaningful consequences if wrong.

## Public API Stabilization

Current exports in [lib/day-boundary-library.js](./lib/day-boundary-library.js):

- `BoundaryStrategy`
- `FixedTimeBoundaryStrategy`
- `DailyBoundaryStrategy`
- `getActiveWindow`
- `getWindowForTimestamp`
- `getWindowProgress`
- `isSameWindow`
- `groupByWindow`
- `getWindowId`

Recommended API direction:

- Keep `BoundaryStrategy`
- Keep `FixedTimeBoundaryStrategy`
- Keep `DailyBoundaryStrategy`
- Keep `getWindowForTimestamp` as the canonical resolver
- Keep `getActiveWindow` as a documented convenience alias for now
- Keep `getWindowProgress`
- Keep `isSameWindow`
- Keep `groupByWindow`
- Keep `getWindowId`

## Error Behavior

The library should remain strict, but its failure modes should become more predictable and easier for consumers to understand.

Recommended behavior:

- invalid timestamp input: `TypeError`
- invalid strategy object: `TypeError`
- invalid `getBoundaryForDate` option: `TypeError`
- missing or invalid resolved boundary: clear `RangeError` or documented error code
- resolved window with `end <= start`: `RangeError`

The goal is not to make the library permissive. The goal is to make strict behavior intentional and well documented.

## Example Strategy

Examples should validate the abstraction without forcing domain-specific logic into the core library too early.

Planned examples:

- `examples/shift-scheduling-dashboard`
- `examples/hospital-shift-grouping`
- `examples/ride-hailing-earnings`

How to use them:

- shift scheduling dashboard validates direct operational-day reporting
- hospital shift grouping validates audit and handover workflows across midnight
- ride-hailing earnings validates whether a future broader “operational period” abstraction is needed

Promotion rule for new core features:

- if only one example needs a feature, keep it in the example
- if two or more examples need it, consider moving it into the library

## Packaging Work

Once tests and API behavior are stable, the repo should include:

- `package.json`
- ESM metadata
- exports entry
- test script
- repository metadata
- license
- files list for publishing

## Documentation Work

After the API is stabilized, update [README.md](./README.md) so it clearly answers:

- what problem the library solves
- when to use it
- fixed boundary usage
- shifting boundary usage
- error behavior
- scope limits
- links to examples

## Concrete File Plan

Core and packaging:

- update [lib/day-boundary-library.js](./lib/day-boundary-library.js)
- add `package.json`
- add `test/fixed-time-boundary.test.js`
- add `test/daily-boundary.test.js`
- add `test/grouping.test.js`

Examples:

- add `examples/shift-scheduling-dashboard/index.html`
- add `examples/hospital-shift-grouping/index.html`
- add `examples/ride-hailing-earnings/index.html`
- add `examples/README.md`

Project docs:

- update [README.md](./README.md)
- update [CHANGELOG.md](./CHANGELOG.md)

## Recommended Implementation Order

1. Add `package.json` and a zero-dependency test scaffold.
2. Add tests that lock intended behavior for the current API.
3. Refine the library implementation until the tests pass consistently.
4. Freeze and document the final public API names.
5. Tighten error messages and stable error behavior.
6. Add the shift scheduling example.
7. Add the hospital shift example.
8. Add the ride-hailing example as a scope probe.
9. Update the README around the stabilized API.
10. Prepare the next release entry in the changelog.

## Milestones

- `0.2.0`: tests, API review, error behavior cleanup
- `0.3.0`: example apps validating the abstraction
- `1.0.0`: publishable reusable library with stable docs and packaging
