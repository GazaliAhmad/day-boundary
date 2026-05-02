# Day Boundary Library

Assign timestamps to operational windows when midnight breaks your logic.

`day-boundary` resolves DST-safe `[start, end)` windows from explicit local
boundary rules such as "09:00 in Europe/London". Use it when your reporting day,
service window, shift cycle, or operational cutoff does not align with midnight.

This README covers the current `3.x` package line.

## Start here

If you are installing this package from npm:

1. Install Node `18+`.
2. Use an ESM project. This package is ESM-only.
3. Run `npm install day-boundary`.
4. Use Temporal inputs, not legacy `Date`, string timestamps, or numeric timestamps.
5. Copy the quick-start example below.

## Golden path

For most applications, do this:

1. Define a boundary strategy.
2. Resolve the `[start, end)` operational window for an exact timestamp.
3. Use `window.start` and `window.end` for querying, grouping, and reporting.

If you only use one function, start with `getWindowForInstant(...)`.

## Quick start

```js
import { Temporal } from '@js-temporal/polyfill';
import { FixedTimeBoundaryStrategy, getWindowForInstant } from 'day-boundary';

const strategy = new FixedTimeBoundaryStrategy({
  timeZone: 'Europe/London',
  boundaryTime: '09:00',
});

const window = getWindowForInstant(Temporal.Now.instant(), strategy);

console.log(window.start.toString());
console.log(window.end.toString());
```

Start with `FixedTimeBoundaryStrategy` and `getWindowForInstant` unless you
already have a more specific input shape.

This package is ESM-only. Use `import ... from 'day-boundary'`, not `require(...)`.
The typed API is Temporal-only. Do not pass legacy `Date`, string timestamps, or numeric timestamps.

## Critical DST note

This library is designed for systems where DST correctness matters.

The boundary resolution APIs handle DST transitions correctly, which means a
window is not always `24` hours long. Depending on the transition, a resolved
window may be `23`, `24`, or `25` hours.

Also keep these two rules separate:

- `elapsed duration`: actual time passed
- `wall-clock duration`: local scheduled clock time

On DST transition days, those can produce different answers.

For the full explanation and examples, see [DST and duration semantics](https://github.com/GazaliAhmad/day-boundary/blob/main/guides/dst-and-duration.md).

## What it solves

Use this library when:

- your operational day starts at a non-midnight boundary
- events cross midnight and still belong to one business window
- reporting or grouping must follow operational windows, not calendar dates
- DST and non-24-hour days must be handled correctly

Avoid it when your system is strictly calendar-day based and midnight is already
the correct boundary.

## Installation

Requires Node `18` or newer and is ESM-only.

```bash
npm install day-boundary
```

The package includes `@js-temporal/polyfill` as a dependency.

TypeScript consumers get a strict declaration file, and the typed API is
Temporal-only.

## Choose the right entry point

- `getWindowForInstant` for exact timestamps and most server-side use
- `getWindowForZonedDateTime` when you already have a zoned Temporal value
- `getWindowForPlainDateTime` when the user enters local clock time

## Try the demo locally

Published examples site:

`https://dayboundary.gazali.one/`

If you want to run this repository locally:

```bash
npm install
npm test
python -m http.server 8000
```

Open this first:

`http://localhost:8000/examples/day-boundary-operational-day-demo/`

That is the best first browser example for understanding the library. The full
examples tour lives at:

`http://localhost:8000/examples/`

## Reference CLI

[`time-window-classifier` (`twc`)](https://github.com/GazaliAhmad/time-window-classifier)
is a reference CLI that uses `day-boundary` to process JSONL event data and
compare calendar-day grouping with operational-window grouping.

## Main exports

- `BoundaryStrategy`
- `FixedTimeBoundaryStrategy`
- `DailyBoundaryStrategy`
- `getWindowForInstant`
- `getWindowForZonedDateTime`
- `getWindowForPlainDateTime`
- `getWindowProgress`
- `getWindowEndByElapsedDuration`
- `getWindowEndByWallClockDuration`
- `compareWindowEndings`
- `isSameWindow`
- `groupByWindow`
- `getWindowId`

Window IDs are stable across DST transitions and safe for grouping and
persistence.

## Read more

- [Usage guide](https://github.com/GazaliAhmad/day-boundary/blob/main/guides/usage.md)
- [API guide](https://github.com/GazaliAhmad/day-boundary/blob/main/guides/api.md)
- [Functions reference](https://github.com/GazaliAhmad/day-boundary/blob/main/guides/functions-reference.md)
- [DST and duration semantics](https://github.com/GazaliAhmad/day-boundary/blob/main/guides/dst-and-duration.md)
- [v3 migration guide](https://github.com/GazaliAhmad/day-boundary/blob/main/guides/migration.md)
- [SQL DST-safe queries](https://github.com/GazaliAhmad/day-boundary/blob/main/guides/sql-dst-safe-queries.md)
- [Business use cases](https://github.com/GazaliAhmad/day-boundary/blob/main/guides/business-use-cases.md)
- [Examples README](https://github.com/GazaliAhmad/day-boundary/blob/main/examples/README.md)
- [Project wiki](https://github.com/GazaliAhmad/day-boundary/wiki)

## Version note

- `day-boundary` is the current `3.x` root API
- `ver-01`, `ver-02`, and `ver-03` in this repository are archive folders only
- if you need older published behavior, use `day-boundary@2.x`

## Summary

This is not a general date utility. It is a boundary-window library for systems
where a meaningful day starts somewhere other than midnight.
