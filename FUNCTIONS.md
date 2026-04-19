# V2 Functions Reference

This file lists the functions and classes currently defined in the v2 source.

It includes:

- public API exports
- internal helper functions used inside the main v2 library
- the v2 shifts companion functions

It does not cover the archived v1 API.

## Public API Table

| Library | Name | Kind | Exported from | Notes |
| --- | --- | --- | --- | --- |
| Main v2 | `BoundaryStrategy` | class | `day-boundary` | Base strategy interface |
| Main v2 | `FixedTimeBoundaryStrategy` | class | `day-boundary` | Fixed daily wall-clock boundary |
| Main v2 | `DailyBoundaryStrategy` | class | `day-boundary` | Date-dependent boundary resolver |
| Main v2 | `getWindowForInstant` | function | `day-boundary` | Resolve a window from `Temporal.Instant` |
| Main v2 | `getWindowForZonedDateTime` | function | `day-boundary` | Resolve a window from `Temporal.ZonedDateTime` |
| Main v2 | `getWindowForPlainDateTime` | function | `day-boundary` | Resolve a window from `Temporal.PlainDateTime` |
| Main v2 | `getWindowProgress` | function | `day-boundary` | Compute window progress from `0` to `1` |
| Main v2 | `getWindowId` | function | `day-boundary` | Build a stable window identifier |
| Main v2 | `isSameWindow` | function | `day-boundary` | Compare whether two values resolve to the same window |
| Main v2 | `groupByWindow` | function | `day-boundary` | Group items by resolved window |
| Shifts v2 | `getShiftEndByElapsedDuration` | function | `day-boundary/shifts` | Exact elapsed-time shift ending |
| Shifts v2 | `getShiftEndByWallClockDuration` | function | `day-boundary/shifts` | Wall-clock scheduled shift ending |
| Shifts v2 | `compareShiftEndings` | function | `day-boundary/shifts` | Compare elapsed and wall-clock results |

## Main v2 Library — Internal Source Helpers and Functions

These functions are defined in `lib/day-boundary-v2.js`.

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

## Main v2 Library — Classes and Methods

These classes are defined in `lib/day-boundary-v2.js`.

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

## Shifts Companion Library — All Functions

These functions are defined in `lib/day-boundary-shifts-v2.js`.

### Shift duration helpers

`getShiftEndByElapsedDuration(start, durationLike)`

`getShiftEndByWallClockDuration(start, durationLike)`

`compareShiftEndings(start, durationLike)`

## Everything in One Consolidated List

### Total functions (main + shifts): 18

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

`getWindowId`

`isSameWindow`

`groupByWindow`

`getShiftEndByElapsedDuration`

`getShiftEndByWallClockDuration`

`compareShiftEndings`

### Plus 3 strategy classes

`BoundaryStrategy`

`FixedTimeBoundaryStrategy`

`DailyBoundaryStrategy`

## Notes

- Public exports from the main v2 library are the strategy classes plus `getWindowForInstant`, `getWindowForZonedDateTime`, `getWindowForPlainDateTime`, `getWindowProgress`, `getWindowId`, `isSameWindow`, and `groupByWindow`.
- `defaultWindowLabel`, `toInstant`, `toPlainDateTime`, `toPlainTime`, `validateTimeZone`, `validateDisambiguation`, `plainDateTimeToZonedDateTime`, and `validateStrategy` are internal helpers, not part of the published root export list.
- Public exports from the shifts companion library are `getShiftEndByElapsedDuration`, `getShiftEndByWallClockDuration`, and `compareShiftEndings`.
