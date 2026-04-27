# Functions reference

This file lists the functions and classes currently defined in the source.

It includes:

- public API exports
- internal helper functions used inside the main library

It does not cover the archived v1 API line.

Related guides:

- [Usage](./usage.md) for practical examples
- [API](./api.md) for the formal API contract
- [Archived v1 Usage](./ver-01/usage.md) for the older `Date`-based line

## Public API table

| Library | Name | Kind | Exported from | Notes |
| --- | --- | --- | --- | --- |
| Main | `BoundaryStrategy` | class | `day-boundary` | Base strategy interface |
| Main | `FixedTimeBoundaryStrategy` | class | `day-boundary` | Fixed daily wall-clock boundary |
| Main | `DailyBoundaryStrategy` | class | `day-boundary` | Date-dependent boundary resolver |
| Main | `getWindowForInstant` | function | `day-boundary` | Resolve a window from `Temporal.Instant` |
| Main | `getWindowForZonedDateTime` | function | `day-boundary` | Resolve a window from `Temporal.ZonedDateTime` |
| Main | `getWindowForPlainDateTime` | function | `day-boundary` | Resolve a window from `Temporal.PlainDateTime` |
| Main | `getWindowProgress` | function | `day-boundary` | Compute window progress from `0` to `1` |
| Main | `getWindowEndByElapsedDuration` | function | `day-boundary` | Resolve an end by exact elapsed duration |
| Main | `getWindowEndByWallClockDuration` | function | `day-boundary` | Resolve an end by local wall-clock duration |
| Main | `compareWindowEndings` | function | `day-boundary` | Compare elapsed and wall-clock end results |
| Main | `getWindowId` | function | `day-boundary` | Build a stable window identifier |
| Main | `isSameWindow` | function | `day-boundary` | Compare whether two values resolve to the same window |
| Main | `groupByWindow` | function | `day-boundary` | Group items by resolved window |

## Main library — internal source helpers and functions

These functions are exported through `lib/day-boundary.js` and implemented in `lib/day-boundary.js`.

Some are public exports, while others are internal helpers used by the exported API.

### Core utilities

`defaultWindowLabel(start, end)`

`toInstant(value)`

`toPlainDateTime(value)`

`toPlainTime(value)`

`validateTimeZone(timeZone)`

`validateDisambiguation(disambiguation)`

`plainDateTimeToZonedDateTime(plainDateTime, timeZone, disambiguation)`

`validateStrategy(strategy)`

### Window resolution

`getWindowForInstant(instant, strategy)`

`getWindowForZonedDateTime(zonedDateTime, strategy)`

`getWindowForPlainDateTime(plainDateTime, strategy, options)`

### Window utilities

`getWindowProgress(instant, window)`

`getWindowId(window)`

`isSameWindow(a, b, strategy)`

`groupByWindow(items, getInstant, strategy)`

## Main library — classes and methods

These classes are exported through `lib/day-boundary.js` and implemented in `lib/day-boundary.js`.

### `BoundaryStrategy`

`constructor(options)`

`getWindowForInstant(instant)` (abstract)

### `FixedTimeBoundaryStrategy`

`constructor(options)`

`getBoundaryForDate(date)`

`getWindowForInstant(instant)`

### `DailyBoundaryStrategy`

`constructor(options)`

`getBoundaryForDate(date)`

`getWindowForInstant(instant)`

## Boundary duration helpers

These functions are exported from `lib/day-boundary.js` and implemented in `lib/window-durations.js`.

`getWindowEndByElapsedDuration(start, durationLike)`

`getWindowEndByWallClockDuration(start, durationLike)`

`compareWindowEndings(start, durationLike)`

## Everything in one consolidated list

### Total functions: 18

`defaultWindowLabel`

`toInstant`

`toPlainDateTime`

`toPlainTime`

`validateTimeZone`

`validateDisambiguation`

`plainDateTimeToZonedDateTime`

`validateStrategy`

`getWindowForInstant`

`getWindowForZonedDateTime`

`getWindowForPlainDateTime`

`getWindowProgress`

`getWindowEndByElapsedDuration`

`getWindowEndByWallClockDuration`

`compareWindowEndings`

`getWindowId`

`isSameWindow`

`groupByWindow`

### Plus 3 strategy classes

`BoundaryStrategy`

`FixedTimeBoundaryStrategy`

`DailyBoundaryStrategy`

## Notes

- Public exports from the main library are the strategy classes plus `getWindowForInstant`, `getWindowForZonedDateTime`, `getWindowForPlainDateTime`, `getWindowProgress`, `getWindowEndByElapsedDuration`, `getWindowEndByWallClockDuration`, `compareWindowEndings`, `getWindowId`, `isSameWindow`, and `groupByWindow`.
- `defaultWindowLabel`, `toInstant`, `toPlainDateTime`, `toPlainTime`, `validateTimeZone`, `validateDisambiguation`, `plainDateTimeToZonedDateTime`, and `validateStrategy` are internal helpers, not part of the published root export list.
