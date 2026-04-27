# Day Boundary Library

Assign timestamps to operational windows when midnight breaks your logic.

This README describes the current `day-boundary` `3.0.0` package line.
The root package export maps to the stable current API entry.

Core primitive:

* a boundary event opens a window
* the next boundary event closes it
* your application works with the resolved `[start, end)` window

For most applications, start with `FixedTimeBoundaryStrategy` and `getWindowForInstant`.
That is the default entry point if you need to answer:

> Which operational window does this exact timestamp belong to?

Golden path:

* define a boundary strategy
* resolve a `[start, end)` operational window
* query exact instants using that window range

In plain terms:

If your operation changes over at `09:00` in London, this library helps you turn any exact timestamp into the correct operational window, then use `window.start` and `window.end` to query records, group reports, or assign work consistently.

---

## v3.0.0 note

`day-boundary@3.0.0` removes the former `day-boundary/shifts` companion API. Boundary-window
duration behavior now lives in the root API with neutral names:

* `getWindowEndByElapsedDuration`
* `getWindowEndByWallClockDuration`
* `compareWindowEndings`

Shift, attendance, overtime, delivery, SLA, and overrun labels are business
policy decisions layered above the boundary-window primitive.

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

* `FixedTimeBoundaryStrategy` if your boundary always happens at the same local time
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

This library lets you define a **boundary event** and resolve the **operational window** between one boundary and the next.

The primary unit becomes:

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

That is the primitive.

You define a boundary rule, resolve the surrounding boundary events, and work from the resulting window.

---

## Critical DST behavior (read this)

The core window APIs resolve boundaries correctly across DST transitions.

Window duration may be 23, 24, or 25 hours depending on DST.

For duration calculations, the core helpers distinguish between:

* **elapsed time** (real duration)
* **wall-clock time** (local schedule)
* **boundary-window offsets** (neutral facts that business policy can interpret)

These diverge during DST transitions.

Example (London, clocks go back):

* Start: `00:00 BST`
* `8 actual hours` → `07:00 GMT`
* `00:00 → 08:00 local` → `08:00 GMT`

Same “8-hour window”, different results.

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

TypeScript consumers get a strict declaration file for `day-boundary`.

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
* `getWindowEndByElapsedDuration`
* `getWindowEndByWallClockDuration`
* `compareWindowEndings`
* `isSameWindow`
* `groupByWindow`
* `getWindowId`

Window IDs are stable across DST transitions and safe for grouping and persistence.

See:

* [Documentation index](./guides/README.md) for the full documentation map
* [Usage guide](./guides/usage.md) for examples
* [API guide](./guides/api.md) for the full specification
* [Functions reference](./guides/functions-reference.md) for the compact reference sheet
* [SQL DST-safe queries](./guides/sql-dst-safe-queries.md) for the implementation query pattern
* [Business use cases](./guides/business-use-cases.md) for business framing
* [Use cases](./guides/use-cases.md) for positioning and fit

Archive note:

* `day-boundary` → current `3.0.0` root API
* `ver-01` and `ver-02` → repository archives only, not part of the published npm package
* if you need the old v2 package behavior, use `day-boundary@2.x`

---

## Duration semantics (DST-sensitive)

Some domains call these shifts, routes, service windows, lessons, or process
phases. The primitive is the same: a boundary-window start plus a duration can
produce different ends depending on whether the rule means exact elapsed time or
local wall-clock time.

```js
import {
  getWindowEndByElapsedDuration,
  getWindowEndByWallClockDuration,
  compareWindowEndings,
} from 'day-boundary';
```

Use:

* elapsed duration → actual time passed
* wall-clock duration → local scheduled clock labels
* boundary-window offsets → business policy input for labels like late, absent, overrun, or overtime

These can differ on DST transition days.

Example:

```js
import { Temporal } from '@js-temporal/polyfill';
import { compareWindowEndings } from 'day-boundary';

const start = Temporal.ZonedDateTime.from(
  '2026-10-25T00:00:00+01:00[Europe/London]'
);

const result = compareWindowEndings(start, Temporal.Duration.from({ hours: 8 }));

console.log(result.elapsedEnd.toString());   // 2026-10-25T07:00:00+00:00[Europe/London]
console.log(result.wallClockEnd.toString()); // 2026-10-25T08:00:00+00:00[Europe/London]
```

That same primitive covers worker schedules, delivery service windows, school
lessons, and factory processes. The library provides the resolved boundaries and
neutral measurements. Business labels such as late, absent, overtime, overrun,
or SLA breach belong in the application policy layer.

---

## Examples

Browser examples are available in this repository and are not included in the published npm package.

Available examples:

* [API snippets](./examples/day-boundary-api-snippets/) → focused demos for smaller public helpers
* [Toy app](./examples/day-boundary-toy-app/) → basic boundary behavior
* [DST toy app](./examples/day-boundary-dst-toy-app/) → DST transitions and day length
* [Duration toy app](./examples/day-boundary-duration-toy-app/) → elapsed vs wall-clock differences
* [Hijri POC](./examples/day-boundary-hijri-poc/) → real-world shifting boundaries using calendar and prayer-time data

To run them locally from the repository root:

```bash
python -m http.server 8000
```

More guides:

* [Examples README](./examples/README.md) for local example URLs
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

It is a way to define boundary events and resolve the windows between them, so your system stays consistent.
