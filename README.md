# Temporal Boundary Library

A small JavaScript library for working with non-midnight day boundaries.

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

## Installation

No build step required. Use as a native ES module.

```html
<script type="module">
  import { ... } from './lib/temporal-boundary-library.js';
</script>
```

## Concepts

A BoundaryStrategy defines how a day boundary is resolved.

Two implementations are provided:

* FixedTimeBoundaryStrategy for fixed daily boundaries
* DailyBoundaryStrategy for boundaries that change per date

## Example: Fixed boundary (09:00 day start)

```js
import {
  FixedTimeBoundaryStrategy,
  getActiveWindow,
} from './lib/temporal-boundary-library.js';

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
} from './lib/temporal-boundary-library.js';

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

## Toy App

A simple example is included in:

Temporal-boundary-toy-app.html

It demonstrates:

* a fixed daily boundary at 09:00
* live window calculation
* grouping events across boundaries

Run locally:

```bash
python -m http.server 8000
```

Open:

[http://localhost:8000/Temporal-boundary-toy-app.html](http://localhost:8000/Temporal-boundary-toy-app.html)

## Design constraints

* No external dependencies
* Uses native Date
* Strategy-driven
* Pure computation functions

## Limitations

You must be able to resolve a boundary for any given date.

For shifting boundaries, this usually means providing:

* the previous day
* the current day
* the next day

If a boundary is missing, resolution fails by design.

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
