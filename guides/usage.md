# Current usage

This file shows how to use the current `3.x` API exported from `day-boundary`.

The current API is the explicit time-zone-aware path:

- uses `Temporal`
- requires explicit IANA time zones
- handles DST and non-24-hour windows correctly
- returns `Temporal.ZonedDateTime` windows

Related guides:

- [API](./api.md) for the full API contract
- [Functions Reference](./functions-reference.md) for the public and internal symbol inventory
- [SQL DST-Safe Queries](./sql-dst-safe-queries.md) for database-query patterns
- [Business Use Cases](./business-use-cases.md) for scenario framing

## Install

```bash
npm install day-boundary
```

`day-boundary` already includes `@js-temporal/polyfill` as a dependency.

The published package also includes a strict declaration file for `day-boundary`.

The typed surface is intentionally Temporal-only. TypeScript consumers should pass Temporal objects such as `Temporal.PlainTime` and `Temporal.Duration`, not legacy `Date` values or string/number timestamps.

If application code also imports `Temporal` directly, use:

```js
import { Temporal } from '@js-temporal/polyfill';
```

## Node usage

```js
import { Temporal } from '@js-temporal/polyfill';
import {
  FixedTimeBoundaryStrategy,
  getWindowForInstant,
  getWindowProgress,
} from 'day-boundary';

const strategy = new FixedTimeBoundaryStrategy({
  timeZone: 'Europe/London',
  boundaryTime: '09:00',
});

const now = Temporal.Now.instant();
const window = getWindowForInstant(now, strategy);
const progress = getWindowProgress(now, window);

console.log(window.start.toString());
console.log(window.end.toString());
console.log(progress);
```

## Browser usage

In a browser, native `Temporal` is not available everywhere yet, so use the polyfill.

If you are serving files directly without a bundler, add an import map:

```html
<script type="importmap">
{
  "imports": {
    "@js-temporal/polyfill": "./node_modules/@js-temporal/polyfill/dist/index.esm.js",
    "jsbi": "./node_modules/jsbi/dist/jsbi.mjs"
  }
}
</script>
```

Then import both the polyfill and the library:

```html
<script type="module">
  import { Temporal } from '@js-temporal/polyfill';
  import {
    FixedTimeBoundaryStrategy,
    getWindowForInstant,
  } from './lib/day-boundary.js';

  const strategy = new FixedTimeBoundaryStrategy({
    timeZone: 'Asia/Singapore',
    boundaryTime: '18:00',
  });

  const window = getWindowForInstant(Temporal.Now.instant(), strategy);
  console.log(window.start.toString(), window.end.toString());
</script>
```

## `FixedTimeBoundaryStrategy`

Use this when the boundary is the same wall-clock time every day in a zone.

```js
import { Temporal } from '@js-temporal/polyfill';
import {
  FixedTimeBoundaryStrategy,
  getWindowForInstant,
} from 'day-boundary';

const strategy = new FixedTimeBoundaryStrategy({
  timeZone: 'America/New_York',
  boundaryTime: Temporal.PlainTime.from('09:00'),
});

const instant = Temporal.Instant.from('2026-11-01T13:30:00Z');
const window = getWindowForInstant(instant, strategy);

console.log(window.start.toString());
console.log(window.end.toString());
```

### Spring-forward gap example

If a boundary falls on a local wall-clock time that does not exist, keep the
policy explicit with `disambiguation`.

Example in `America/New_York` on Sunday, March 8, 2026:

- clocks jump from `01:59:59` to `03:00:00`
- local `02:30` does not exist

```js
const strategy = new FixedTimeBoundaryStrategy({
  timeZone: 'America/New_York',
  boundaryTime: '02:30',
  disambiguation: 'compatible',
});

const window = getWindowForInstant(
  Temporal.Instant.from('2026-03-08T07:15:00Z'),
  strategy
);

console.log(window.end.toString());
// 2026-03-08T03:30:00-04:00[America/New_York]
```

Use `disambiguation: 'reject'` if your application should fail fast when a
configured local boundary does not exist on that date.

## `DailyBoundaryStrategy`

Use this when the boundary changes by date.

```js
import { Temporal } from '@js-temporal/polyfill';
import {
  DailyBoundaryStrategy,
  getWindowForInstant,
} from 'day-boundary';

const boundaryByDate = {
  '2026-04-18': '18:59',
  '2026-04-19': '19:00',
  '2026-04-20': '19:01',
};

const strategy = new DailyBoundaryStrategy({
  timeZone: 'Asia/Singapore',
  getBoundaryForDate(date, context) {
    const [hour, minute] = boundaryByDate[date.toString()].split(':').map(Number);

    return Temporal.ZonedDateTime.from({
      timeZone: context.timeZone,
      year: date.year,
      month: date.month,
      day: date.day,
      hour,
      minute,
    });
  },
});

const window = getWindowForInstant(
  Temporal.Instant.from('2026-04-19T10:30:00Z'),
  strategy
);

console.log(window.start.toString());
console.log(window.end.toString());
```

## Helper entry points

### `getWindowForInstant`

Best when you already have exact time.

```js
const window = getWindowForInstant(Temporal.Now.instant(), strategy);
```

### `getWindowForZonedDateTime`

Best when you already have a `Temporal.ZonedDateTime`.

```js
const zdt = Temporal.ZonedDateTime.from('2026-10-24T12:00:00+01:00[Europe/London]');
const window = getWindowForZonedDateTime(zdt, strategy);
```

### International Date Line example

The same exact instant can resolve to different operational dates in different
business zones. Do not derive bucket dates from UTC alone.

```js
const instant = Temporal.Instant.from('2026-05-01T10:30:00Z');

const kiritimati = new FixedTimeBoundaryStrategy({
  timeZone: 'Pacific/Kiritimati',
  boundaryTime: '06:00',
});

const honolulu = new FixedTimeBoundaryStrategy({
  timeZone: 'Pacific/Honolulu',
  boundaryTime: '06:00',
});

const kiritimatiWindow = getWindowForInstant(instant, kiritimati);
const honoluluWindow = getWindowForInstant(instant, honolulu);

console.log(kiritimatiWindow.start.toPlainDate().toString());
// 2026-05-01

console.log(honoluluWindow.start.toPlainDate().toString());
// 2026-04-30
```

This is expected. Resolve the boundary window in the zone that actually owns
the business rule, then derive labels such as `Logical_Date` from that
resolved window.

### `getWindowForPlainDateTime`

Best when the user enters wall-clock local time.

```js
const localInput = Temporal.PlainDateTime.from('2026-10-25T01:30:00');
const window = getWindowForPlainDateTime(localInput, strategy, {
  disambiguation: 'earlier',
});
```

### Fall-back ambiguity example

On fall-back nights, the same local clock time can happen twice. Keep that
choice explicit so two visually identical timestamps do not collapse into one.

Example in `America/New_York` on Sunday, November 1, 2026:

- local `01:30` occurs twice
- `disambiguation: 'earlier'` means the first `01:30`
- `disambiguation: 'later'` means the second `01:30`

```js
const strategy = new FixedTimeBoundaryStrategy({
  timeZone: 'America/New_York',
  boundaryTime: '01:45',
  disambiguation: 'earlier',
});

const localInput = Temporal.PlainDateTime.from('2026-11-01T01:30:00');

const firstWindow = getWindowForPlainDateTime(localInput, strategy, {
  disambiguation: 'earlier',
});

const secondWindow = getWindowForPlainDateTime(localInput, strategy, {
  disambiguation: 'later',
});

console.log(firstWindow.start.toString());
// 2026-10-31T01:45:00-04:00[America/New_York]

console.log(secondWindow.start.toString());
// 2026-11-01T01:45:00-04:00[America/New_York]
```

This is how the library avoids silently treating repeated local times as one
timestamp when payroll, attendance, or duration math depends on the difference.

## `getWindowProgress`

Progress is based on exact elapsed time, not assumed 24-hour local days.

```js
const progress = getWindowProgress(Temporal.Now.instant(), window);
console.log(`${(progress * 100).toFixed(2)}%`);
```

## `isSameWindow`

```js
const same = isSameWindow(
  Temporal.Instant.from('2026-04-19T00:30:00Z'),
  Temporal.Instant.from('2026-04-19T00:45:00Z'),
  strategy
);
```

## `groupByWindow`

```js
const grouped = groupByWindow(records, (record) => record.instant, strategy);

for (const group of grouped) {
  console.log(group.window.start.toString(), group.window.end.toString());
  console.log(group.items.length);
}
```

If your reporting layer needs a business-facing bucket date, a common default is
to derive it from the local date of `group.window.start`.

Example:

- boundary at `22:00`
- event at `2026-05-02T01:00`
- resolved window `2026-05-01T22:00 -> 2026-05-02T22:00`
- default bucket date or `Logical_Date`: `2026-05-01`

## `getWindowId`

```js
const id = getWindowId(window);
console.log(id);
```

## Boundary duration note

If you are building worker schedules, school lessons, delivery windows, or
factory processes, treat these as two separate rules:

- `8 actual hours`
- `00:00 -> 08:00 local wall-clock schedule`

On DST days, they can produce different end times.

Example in London when clocks go back on Sunday, October 25, 2026:

- start at `00:00 BST`
- `8 actual hours` ends at `07:00 GMT`
- `00:00 -> 08:00 local` ends at `08:00 GMT`

The API is designed so you can represent both clearly:

- use `Temporal.Instant` when the rule is about exact elapsed duration
- use `Temporal.ZonedDateTime` when the rule is about local scheduled wall-clock time

## Public names

These are the current public names:

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

## Boundary duration helpers

The root module includes neutral duration helpers:

```js
import {
  getWindowEndByElapsedDuration,
  getWindowEndByWallClockDuration,
  compareWindowEndings,
} from 'day-boundary';
```

Example:

```js
import { Temporal } from '@js-temporal/polyfill';
import { compareWindowEndings } from 'day-boundary';

const start = Temporal.ZonedDateTime.from(
  '2026-10-25T00:00:00+01:00[Europe/London]'
);

const result = compareWindowEndings(start, { hours: 8 });

console.log(result.elapsedEnd.toString());   // 2026-10-25T07:00:00+00:00[Europe/London]
console.log(result.wallClockEnd.toString()); // 2026-10-25T08:00:00+00:00[Europe/London]
```

The same primitive covers worker schedules, delivery route windows, school
lesson overruns, and factory process overruns. The library resolves boundary
windows and neutral end points; labels such as late, absent, overtime, or SLA
breach are business decisions layered above the neutral result.
