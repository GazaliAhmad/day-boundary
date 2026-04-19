# Day Boundary Library

A small JavaScript library for working with non-midnight day boundaries.

This project is copyright-owned by Gazali Ahmad and may be used, distributed, or marketed by The Right Business Pte Ltd. See [IP-NOTICE.md](./IP-NOTICE.md).

Most systems assume a day starts at 00:00. This library lets you redefine that boundary, whether fixed (for example 09:00) or shifting based on a daily function.

## Why this exists

Civil time is designed for coordination, not accuracy.

In many real-world systems, the operational day does not start at midnight:

* shift-based work such as factories and logistics
* overnight operations like healthcare or transport
* systems where continuity matters more than calendar alignment

If you keep midnight as your boundary, you end up with split records, broken aggregation, and scattered “previous day” logic.

This library moves that concern into a single place: the time model.

## Core idea

Instead of asking what calendar date something belongs to, you define which window it belongs to.

A day is treated as a window:

[boundary_n, boundary_n+1)

Everything else is derived from that.

## Status

The repo currently contains two API tracks:

- v2: the main recommended API for new work, exported from `day-boundary`
- v1: the legacy `Date`-based compatibility API in `./lib/day-boundary-v1.js` and `day-boundary/v1`

Use v2 if your system is global, needs explicit IANA time zones, or must handle DST correctly.

Keep using v1 only if you need the older simple `Date`-based path or are migrating existing usage gradually.

## Installation

Install the package:

```bash
npm install day-boundary
```

The package already depends on `@js-temporal/polyfill`, so npm installs it automatically.

If application code also imports `Temporal` directly, the import is still:

```js
import { Temporal } from '@js-temporal/polyfill';
```

### Main import for new work

In Node, import the library from `day-boundary`.

If application code also uses `Temporal` directly:

```js
import { Temporal } from '@js-temporal/polyfill';
import { FixedTimeBoundaryStrategy } from 'day-boundary';
```

In browsers without a bundler, add an import map for the polyfill and its `jsbi` dependency before importing `./lib/day-boundary-v2.js`.

See [V2-USAGE.md](./V2-USAGE.md) for the full copy-paste setup.

### Legacy v1 import

No build step required. Use as a native ES module.

```html
<script type="module">
  import { ... } from './lib/day-boundary-v1.js';
</script>
```

For package consumers, the legacy path is available at:

```js
import { ... } from 'day-boundary/v1';
```

## Concepts

A BoundaryStrategy defines how a day boundary is resolved.

Two implementations are provided:

* FixedTimeBoundaryStrategy for fixed daily boundaries
* DailyBoundaryStrategy for boundaries that change per date

For the explicit time-zone-aware v2 direction, see [V2-API.md](./V2-API.md) and [V2-USAGE.md](./V2-USAGE.md).

## Main Example: Fixed boundary with v2

```js
import { Temporal } from '@js-temporal/polyfill';
import {
  FixedTimeBoundaryStrategy,
  getWindowForInstant,
} from 'day-boundary';

const strategy = new FixedTimeBoundaryStrategy({
  timeZone: 'Europe/London',
  boundaryTime: '09:00',
});

const window = getWindowForInstant(Temporal.Now.instant(), strategy);

console.log(window.start.toString());
console.log(window.end.toString());
```

## Legacy Example: Fixed boundary (09:00 day start)

```js
import {
  FixedTimeBoundaryStrategy,
  getActiveWindow,
} from './lib/day-boundary-v1.js';

const strategy = new FixedTimeBoundaryStrategy({
  startHour: 9,
  startMinute: 0,
});

const now = new Date();
const window = getActiveWindow(now, strategy);

console.log(window);
// { start: 2026-04-18T09:00, end: 2026-04-19T09:00 }
```

## Example: Shifting boundary (per-day lookup)

```js
import {
  DailyBoundaryStrategy,
  getActiveWindow,
} from './lib/day-boundary-v1.js';

const mockBoundaries = {
  "2026-04-17": "18:58",
  "2026-04-18": "18:59",
  "2026-04-19": "19:00",
};

function getBoundaryForDate(date) {
  const key = date.toISOString().slice(0, 10);
  const [h, m] = mockBoundaries[key].split(':').map(Number);

  const result = new Date(date);
  result.setHours(h, m, 0, 0);
  return result;
}

const strategy = new DailyBoundaryStrategy({
  getBoundaryForDate,
});
```

## API

getActiveWindow(date, strategy)
Returns the current window for a timestamp.

getWindowForTimestamp(date, strategy)
Resolves which window a timestamp belongs to.

getWindowProgress(date, window)
Returns a number between 0 and 1 representing progress through the window.

groupByWindow(items, getTimestamp, strategy)
Groups items into their corresponding windows.

isSameWindow(a, b, strategy)
Checks whether two timestamps resolve to the same window.

getWindowId(window)
Returns a stable identifier for a window.

## V2 API

The main v2 surface is:

- `BoundaryStrategy`
- `FixedTimeBoundaryStrategy`
- `DailyBoundaryStrategy`
- `getWindowForInstant`
- `getWindowForZonedDateTime`
- `getWindowForPlainDateTime`
- `getWindowProgress`
- `isSameWindow`
- `groupByWindow`
- `getWindowId`

Use it via the package root:

```js
import {
  DailyBoundaryStrategy,
  FixedTimeBoundaryStrategy,
  getWindowForInstant,
} from 'day-boundary';
```

See:

- [USAGE.md](./USAGE.md) for legacy v1 examples
- [V2-USAGE.md](./V2-USAGE.md) for v2 examples
- [V2-API.md](./V2-API.md) for the detailed v2 design spec

## Companion Shift Layer

A small companion layer now exists for shift-specific DST questions:

```js
import {
  getShiftEndByElapsedDuration,
  getShiftEndByWallClockDuration,
  compareShiftEndings,
} from 'day-boundary/shifts';
```

This layer is intentionally outside the core boundary engine.

It is for business rules such as:

- "sign off after 8 actual hours"
- "sign off at 08:00 local rota time"

Those can diverge on DST transition days.

## Shift Work And DST

For shift workers, healthcare, and hospital care, DST days introduce an important distinction:

- `elapsed-duration shift`: the worker signs off after a fixed amount of real elapsed time
- `wall-clock scheduled shift`: the worker signs off at the scheduled local clock time

These are not the same on DST transition days.

Example in London when clocks go back on Sunday, October 25, 2026:

- shift start: `00:00 BST`
- if the rule is `8 actual hours`, sign-off is `07:00 GMT`
- if the rule is `00:00 -> 08:00 local`, sign-off is `08:00 GMT`

So a nominal "8-hour shift" can mean:

- `8` real elapsed hours
- or `8` labeled local clock hours on the rota

The library's v2 direction is built so both interpretations can be modeled clearly:

- `Temporal.Instant` for exact elapsed-time rules
- `Temporal.ZonedDateTime` for local schedule rules

This matters in domains like:

- nurse and doctor shifts
- hospital handovers
- overnight care staffing
- security and transport shifts
- factory and logistics rosters

## Toy App

A simple example is included in:

`examples/day-boundary-toy-app/index.html`

It demonstrates:

* a fixed daily boundary at 09:00
* live window calculation
* grouping events across boundaries

Run locally:

```bash
python -m http.server 8000
```

Open:

[http://localhost:8000/examples/day-boundary-toy-app/](http://localhost:8000/examples/day-boundary-toy-app/)

## Dataset-backed Example

A browser example backed by real CSV data is included in:

`examples/day-boundary-hijri-poc/index.html`

It demonstrates:

- a shifting boundary loaded from a dataset
- navigation across resolved day windows
- date and timestamp lookup
- one real use case running on the v2 `Temporal`-based path

Run locally:

```bash
python -m http.server 8000
```

Open:

[http://localhost:8000/examples/day-boundary-hijri-poc/](http://localhost:8000/examples/day-boundary-hijri-poc/)

## DST Toy App

A browser example focused on region, DST, and day duration is included in:

`examples/day-boundary-dst-toy-app/index.html`

It demonstrates:

- explicit global location selection
- DST transitions in temperate zones
- near-polar and equatorial comparison points
- fixed boundary window duration inspection
- nearby day-duration comparison around zone changes

Open:

[http://localhost:8000/examples/day-boundary-dst-toy-app/](http://localhost:8000/examples/day-boundary-dst-toy-app/)

## Shift Toy App

A browser example focused on shift sign-off rules is included in:

`examples/day-boundary-shift-toy-app/index.html`

It demonstrates:

- exact elapsed-duration sign-off versus wall-clock scheduled sign-off
- fixed location selection across global regions
- preset DST-sensitive scenarios for London and New York
- a no-DST baseline for comparison
- why a shift can end at different local times depending on the rule

Open:

[http://localhost:8000/examples/day-boundary-shift-toy-app/](http://localhost:8000/examples/day-boundary-shift-toy-app/)

## Design constraints

* v2 is the main path and uses `Temporal` plus `@js-temporal/polyfill`
* v1 remains available as a legacy `Date`-based compatibility path
* Strategy-driven
* Pure computation functions

## Limitations

You must be able to resolve a boundary for any given date.

For shifting boundaries, this usually means providing:

* the previous day
* the current day
* the next day

If a boundary is missing, resolution fails by design.

For v2 specifically:

- you must provide explicit IANA time zones
- browser usage needs the Temporal polyfill setup until native support is broad enough
- calendar labeling still belongs outside the core library

## When to use this

Use it when:

* midnight breaks your logic
* events span across calendar days
* you need grouping based on operational cycles

Avoid it when:

* your system is strictly calendar-based
* midnight is already the correct boundary

## Summary

This is not a date utility.

It is a way to redefine what a day means, so the rest of your system does not have to.
