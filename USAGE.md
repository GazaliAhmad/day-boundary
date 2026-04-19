# Usage

This file documents the legacy v1 API exported by `lib/day-boundary-v1.js`.

If you are starting new work, use v2 instead:

- [V2-USAGE.md](./V2-USAGE.md) for the main recommended API
- `day-boundary` for explicit time-zone-aware boundary resolution
- `day-boundary/shifts` for companion shift-duration helpers

Use this file when you need the older `Date`-based compatibility path.

## Legacy v1 Import

```js
import {
  BoundaryStrategy,
  FixedTimeBoundaryStrategy,
  DailyBoundaryStrategy,
  getActiveWindow,
  getWindowForTimestamp,
  getWindowProgress,
  isSameWindow,
  groupByWindow,
  getWindowId,
} from './lib/day-boundary-v1.js';
```

## Concepts

v1 works with **windows** instead of assuming a day starts at midnight.

Unlike v2, v1 is built on native `Date` and does not provide first-class explicit IANA time-zone or DST-safe semantics.

A resolved window looks like this:

```js
{
  start: Date,
  end: Date,
  label: string,
  metadata: object
}
```

## `BoundaryStrategy`

`BoundaryStrategy` is the base interface. You do not usually instantiate it directly.  
Create a strategy that implements:

```js
getWindow(dateLike)
```

That method must return a window with `start`, `end`, `label`, and `metadata`.

## `FixedTimeBoundaryStrategy`

Use this when the boundary is the same every day.

This v1 version is best for simple local or single-zone usage.

Example: the operational day starts at `09:00`.

```js
import {
  FixedTimeBoundaryStrategy,
  getActiveWindow,
} from './lib/day-boundary-v1.js';

const strategy = new FixedTimeBoundaryStrategy({
  startHour: 9,
  startMinute: 0,
  label: 'operational-day',
});

const now = new Date('2026-04-19T08:30:00');
const window = getActiveWindow(now, strategy);

console.log(window.start); // 2026-04-18 09:00 local time
console.log(window.end);   // 2026-04-19 09:00 local time
```

## `DailyBoundaryStrategy`

Use this when the boundary changes by date.

In v1, `getBoundaryForDate(date)` returns a native `Date`.

You provide a `getBoundaryForDate(date)` function.

```js
import {
  DailyBoundaryStrategy,
  getActiveWindow,
} from './lib/day-boundary-v1.js';

const boundaryByDate = {
  '2026-04-18': '18:59',
  '2026-04-19': '19:00',
  '2026-04-20': '19:01',
};

function formatKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getBoundaryForDate(date) {
  const key = formatKey(date);
  const time = boundaryByDate[key];

  if (!time) {
    throw new Error(`Missing boundary for ${key}`);
  }

  const [hours, minutes] = time.split(':').map(Number);
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

const strategy = new DailyBoundaryStrategy({
  getBoundaryForDate,
  label: 'shifting-day',
});

const timestamp = new Date('2026-04-19T18:30:00');
const window = getActiveWindow(timestamp, strategy);

console.log(window.start);
console.log(window.end);
```

## `getActiveWindow(now, strategy)`

Returns the active window for a timestamp.

```js
const window = getActiveWindow(new Date(), strategy);

console.log(window.start);
console.log(window.end);
console.log(window.label);
console.log(window.metadata);
```

## `getWindowForTimestamp(timestamp, strategy)`

This is an alias with a more explicit name when you are resolving historical data.

```js
const eventTime = '2026-04-19T03:15:00';
const window = getWindowForTimestamp(eventTime, strategy);

console.log(window);
```

## `getWindowProgress(now, window)`

Returns progress through the window as a number from `0` to `1`.

```js
const now = new Date();
const window = getActiveWindow(now, strategy);
const progress = getWindowProgress(now, window);

console.log(progress); // e.g. 0.42
console.log(`${(progress * 100).toFixed(2)}%`);
```

## `isSameWindow(a, b, strategy)`

Checks whether two timestamps belong to the same resolved window.

```js
const same = isSameWindow(
  '2026-04-19T08:00:00',
  '2026-04-19T08:30:00',
  strategy
);

console.log(same); // true or false
```

## `groupByWindow(items, getTimestamp, strategy)`

Groups records by their resolved window.

```js
const events = [
  { id: 'a', timestamp: '2026-04-19T08:30:00', label: 'Before boundary' },
  { id: 'b', timestamp: '2026-04-19T09:10:00', label: 'After boundary' },
  { id: 'c', timestamp: '2026-04-19T10:15:00', label: 'Same new window' },
];

const groups = groupByWindow(events, (item) => item.timestamp, strategy);

for (const group of groups) {
  console.log(group.window.start, group.window.end);
  console.log(group.items);
}
```

## `getWindowId(window)`

Builds a stable identifier from the window start and end timestamps.

```js
const window = getActiveWindow(new Date(), strategy);
const windowId = getWindowId(window);

console.log(windowId);
// Example:
// 2026-04-19T01:00:00.000Z__2026-04-20T01:00:00.000Z
```

## Common patterns

### Resolve the operational day for an event

```js
const eventTime = new Date('2026-04-19T06:45:00');
const window = getWindowForTimestamp(eventTime, strategy);

console.log('belongs to window', window.start, '->', window.end);
```

### Show progress through the current operational day

```js
const now = new Date();
const currentWindow = getActiveWindow(now, strategy);
const progress = getWindowProgress(now, currentWindow);

console.log(`Current window is ${(progress * 100).toFixed(1)}% complete.`);
```

### Bucket records for reporting

```js
const records = [
  { id: 1, createdAt: '2026-04-18T23:50:00' },
  { id: 2, createdAt: '2026-04-19T02:10:00' },
  { id: 3, createdAt: '2026-04-19T10:00:00' },
];

const grouped = groupByWindow(records, (record) => record.createdAt, strategy);

const reportRows = grouped.map(({ window, items }) => ({
  windowId: getWindowId(window),
  count: items.length,
}));

console.log(reportRows);
```

## Notes

- `dateLike` values can be `Date`, date strings, or timestamps accepted by `new Date(...)`.
- `DailyBoundaryStrategy` requires you to resolve the boundary for the previous day, current day, and next day around the timestamp being checked.
- If a boundary cannot be resolved, the library throws by design.
- For explicit time zones, DST-safe windows, and non-24-hour day handling, prefer v2 in [V2-USAGE.md](./V2-USAGE.md).
