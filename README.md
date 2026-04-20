# Day Boundary Library

Assign timestamps to operational windows when midnight breaks your logic.

For most applications, start with `FixedTimeBoundaryStrategy` and `getWindowForInstant`.
That is the default entry point if you need to answer:

> Which operational window does this exact timestamp belong to?

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

* `V2-USAGE.md` for examples
* `V2-API.md` for full specification

---

## Shift semantics (DST-sensitive)

Separate layer:

```js
import {
  getShiftEndByElapsedDuration,
  getShiftEndByWallClockDuration,
  compareShiftEndings,
} from 'day-boundary/shifts';
```

Use:

* elapsed duration → payroll, fatigue, actual hours
* wall-clock duration → schedules, schedule sign-off

These can differ on DST transition days.

---

## Examples

Included browser examples:

* **Toy App** → basic boundary behavior
* **DST Toy App** → DST transitions and day length
* **Shift Toy App** → elapsed vs wall-clock differences
* **Hijri POC** → real-world shifting boundaries using calendar and prayer-time data

Run locally:

```bash
python -m http.server 8000
```

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
