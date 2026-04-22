# Day Boundary Library

Assign timestamps to operational windows when midnight breaks your logic.

For most applications, start with `FixedTimeBoundaryStrategy` and `getWindowForInstant`.
That is the default entry point if you need to answer:

> Which operational window does this exact timestamp belong to?

Golden path:

* define a boundary strategy
* resolve a `[start, end)` operational window
* query exact instants using that window range

In plain terms:

If your business day starts at `09:00` in London, this library helps you turn any exact timestamp into the correct operational window, then use `window.start` and `window.end` to query records, group reports, or assign work consistently.

---

## Quick Start (2 minutes)

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

If you only use one function, use `getWindowForInstant`.

Start with:

* `FixedTimeBoundaryStrategy` if your day always starts at the same local time
* `getWindowForInstant` if you want the safest default for real timestamps

Move to other entry points only when:

* you already have a `Temporal.ZonedDateTime`
* the user is entering a local clock time
* the boundary changes by date and must come from a timetable or dataset

---

## What this solves

Most systems assume a day starts at midnight.

That breaks when:

* shifts cross midnight
* operations run overnight
* reporting depends on continuity

This library lets you define an **operational window** instead.

A day becomes a window:

```
[boundary_n, boundary_n+1)
```

Everything else is derived from that.

---

## Core idea

Instead of asking:

> What calendar date is this?

You ask:

> Which operational window does this belong to?

---

## Critical DST behavior (read this)

The core window APIs resolve boundaries correctly across DST transitions.

Window duration may be 23, 24, or 25 hours depending on DST.

For shift-duration calculations, the companion `day-boundary/shifts` helpers distinguish between:

* **elapsed time** (real duration)
* **wall-clock time** (local schedule)
* **start tolerance windows** (business-defined early/late clock-in handling)
* **end-of-shift classification** (late log-off, missing log-off, and time beyond scheduled end)

These diverge during DST transitions.

Example (London, clocks go back):

* Start: `00:00 BST`
* `8 actual hours` → `07:00 GMT`
* `00:00 → 08:00 local` → `08:00 GMT`

Same “8-hour shift”, different results.

This is intentional.

---

## When to use this

Use it when:

* midnight breaks your logic
* events span across calendar days
* you need grouping based on operational cycles
* DST correctness matters (payroll, shifts, reporting)

Avoid it when:

* your system is strictly calendar-based
* midnight is already correct

---

## Why not just use Temporal?

Temporal tells you *what time it is*.

This library tells you *which operational window that time belongs to*.

---

## Installation

```bash
npm install day-boundary
```

The package includes `@js-temporal/polyfill` as a dependency.

TypeScript consumers get strict declaration files for both:

* `day-boundary`
* `day-boundary/shifts`

The typed API is Temporal-only:

* `Temporal.Instant`
* `Temporal.ZonedDateTime`
* `Temporal.PlainDateTime`
* `Temporal.PlainTime`
* `Temporal.Duration`

Legacy `Date`, string timestamps, and numeric timestamps are not part of the typed contract.

---

## Choosing the right entry point

Start with `getWindowForInstant` unless you have a specific reason not to.

Use:

* `getWindowForInstant` → when you care about exact time (recommended default)
* `getWindowForZonedDateTime` → when you already have a zoned value
* `getWindowForPlainDateTime` → when the user provides local clock input

---

## Local Clock Input Example

```js
import { Temporal } from '@js-temporal/polyfill';
import {
  FixedTimeBoundaryStrategy,
  getWindowForPlainDateTime,
} from 'day-boundary';

const strategy = new FixedTimeBoundaryStrategy({
  timeZone: 'Europe/London',
  boundaryTime: '09:00',
});

const window = getWindowForPlainDateTime(
  Temporal.PlainDateTime.from('2026-10-25T08:30:00'),
  strategy
);

console.log(window.start.toString());
console.log(window.end.toString());
```

---

## API Overview

Main exports:

* `BoundaryStrategy`
* `FixedTimeBoundaryStrategy`
* `DailyBoundaryStrategy`
* `getWindowForInstant`
* `getWindowForZonedDateTime`
* `getWindowForPlainDateTime`
* `getWindowProgress`
* `isSameWindow`
* `groupByWindow`
* `getWindowId`

Window IDs are stable across DST transitions and safe for grouping and persistence.

See:

* [Documentation index](./guides/README.md) for the full documentation map
* [V2 usage](./guides/v2-usage.md) for examples
* [V2 API](./guides/v2-api.md) for the full specification
* [Functions reference](./guides/functions-reference.md) for the compact reference sheet
* [SQL DST-safe queries](./guides/sql-dst-safe-queries.md) for the implementation query pattern
* [Business use cases](./guides/business-use-cases.md) for business framing
* [Use cases](./guides/use-cases.md) for positioning and fit

---

## Shift semantics (DST-sensitive)

Separate layer:

```js
import {
  getShiftEndByElapsedDuration,
  getShiftEndByWallClockDuration,
  compareShiftEndings,
  resolveShiftStart,
  resolveShiftEnd,
} from 'day-boundary/shifts';
```

Use:

* elapsed duration → payroll, fatigue, actual hours
* wall-clock duration → schedules, schedule sign-off
* start tolerance windows → early/late arrivals around shift start
* end-of-shift classification → late log-off, missing log-off, and time beyond scheduled end from the configured shift-end rule

These can differ on DST transition days.

Example:

```js
import { Temporal } from '@js-temporal/polyfill';
import { FixedTimeBoundaryStrategy } from 'day-boundary';
import { resolveShiftStart } from 'day-boundary/shifts';

const strategy = new FixedTimeBoundaryStrategy({
  timeZone: 'Asia/Singapore',
  boundaryTime: '08:00',
});

const result = resolveShiftStart(
  Temporal.ZonedDateTime.from('2026-04-19T07:50:00+08:00[Asia/Singapore]'),
  strategy,
  {
    startTolerance: {
      before: Temporal.Duration.from({ minutes: 15 }),
      after: Temporal.Duration.from({ minutes: 15 }),
    },
  }
);

console.log(result.classification);     // early-within-tolerance
console.log(result.assignmentAdjusted); // true
console.log(result.window.start.toString());
```

`before` and `after` are business-defined. The helper compares exact instants so tolerance handling stays DST-safe.

```js
import { Temporal } from '@js-temporal/polyfill';
import { resolveShiftEnd } from 'day-boundary/shifts';

const result = resolveShiftEnd(
  Temporal.ZonedDateTime.from('2026-04-19T18:30:00+08:00[Asia/Singapore]'),
  Temporal.ZonedDateTime.from('2026-04-19T17:00:00+08:00[Asia/Singapore]'),
  {
    lateLogOffTolerance: {
      after: Temporal.Duration.from({ minutes: 15 }),
    },
    overtime: {
      startsAfter: Temporal.Duration.from({ minutes: 0 }),
    },
  }
);

console.log(result.completionStatus);      // late-log-off
console.log(result.overtime.hasOvertime);  // true
console.log(result.overtime.duration.toString());
```

`resolveShiftEnd(...)` keeps attendance completion status separate from any payroll interpretation. The `overtime` field here is a neutral measure of time beyond scheduled end. Inferred missing log-off handling does not create that extra time by default.

The field name remains `overtime` for API stability. In this library it is a neutral post-end measurement, not a payroll or legal classification by itself.

---

## Examples

Browser examples are available in the GitHub repository and are not included in the published npm package.

Available examples:

* [Toy app](https://github.com/GazaliAhmad/day-boundary/tree/main/examples/day-boundary-toy-app) → basic boundary behavior
* [DST toy app](https://github.com/GazaliAhmad/day-boundary/tree/main/examples/day-boundary-dst-toy-app) → DST transitions and day length
* [Shift toy app](https://github.com/GazaliAhmad/day-boundary/tree/main/examples/day-boundary-shift-toy-app) → elapsed vs wall-clock differences
* [Shift attendance toy app](https://github.com/GazaliAhmad/day-boundary/tree/main/examples/day-boundary-shift-attendance-toy-app) → start tolerance, late log-off, missing log-off inference, and time beyond scheduled end
* [Delivery shift toy app](https://github.com/GazaliAhmad/day-boundary/tree/main/examples/day-boundary-delivery-shift-toy-app) → rider online/offline windows, inferred route closure, and time beyond the scheduled service window
* [Hijri POC](https://github.com/GazaliAhmad/day-boundary/tree/main/examples/day-boundary-hijri-poc) → real-world shifting boundaries using calendar and prayer-time data

To run them locally from the repository root:

```bash
python -m http.server 8000
```

More guides:

* [Examples README](https://github.com/GazaliAhmad/day-boundary/blob/main/examples/README.md) for local example URLs
* [Documentation index](./guides/README.md) for the full documentation map
* [SQL DST-safe queries](./guides/sql-dst-safe-queries.md) for implementation guidance
* [Business use cases](./guides/business-use-cases.md) for business use-case framing

---

## Design constraints

* Uses `Temporal`
* Requires explicit IANA time zones
* Does not assume 24-hour days
* Pure computation (no hidden state)

---

## Limitations

* Boundary must be resolvable for a given date
* Shifting boundaries must provide adjacent dates
* Requires Temporal polyfill in browsers

---

## Summary

This is not a date utility.

It is a way to define what a day means, so your system stays consistent.
