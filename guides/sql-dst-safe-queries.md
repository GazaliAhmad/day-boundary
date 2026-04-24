# SQL DST-safe queries

This guide shows how to turn a resolved `day-boundary` window into a database-safe `[start, end)` query range.

It is an implementation guide.

It assumes the business has already decided what boundary rule applies, such as:

- "day starts at `00:00` local time"
- "day starts at `09:00` operational time"
- "reporting uses a specific timezone and cutoff"

Related guides:

- [Usage](./usage.md) for the main API examples
- [API](./api.md) for the boundary and window contract
- [Business Use Cases](./business-use-cases.md) for scenario framing

## The core idea

Once the boundary rule is defined, the implementation model is:

`boundary rule -> resolved [start, end) window -> SQL query`

The database layer should not re-implement boundary logic with date math or fixed 24-hour assumptions.

The thing SQL should consume is a boundary-defined window:

`[start, end)`

Where:

- `start` is the exact moment a boundary begins
- `end` is the next boundary
- duration may be 23, 24, or 25 hours

## What the library does

Once a boundary is defined, the library:

- resolves it in an explicit IANA timezone
- handles DST transitions correctly
- supports repeated and skipped local times
- produces an exact, unambiguous window

`[startInstant, endInstant)`

## Why this separation matters

Most DST-related bugs come from mixing:

`business definition -> implicit assumptions -> SQL implementation`

The library enforces a clean boundary:

`boundary definition -> resolved window -> query`

## Boundary definition

The system should not query by vague labels like "the date" alone.

It should query by a specific boundary definition:

`boundary = (timeZone + rule)`

Examples:

- `Asia/Singapore + 00:00`
- `Europe/London + 00:00`
- `Europe/London + 09:00`

Different boundaries can exist within the same region or system.

## The correct SQL model

### Step 1. Resolve the window

```js
import { getWindowForInstant } from 'day-boundary';

const window = getWindowForInstant(instant, strategy);
```

This returns:

```js
window.start; // ZonedDateTime
window.end;   // ZonedDateTime
```

### Step 2. Convert to exact time

```js
const start = window.start.toInstant();
const end = window.end.toInstant();
```

This produces:

- exact, unambiguous timestamps
- values safe across DST transitions
- no dependence on wall-clock interpretation

### Step 3. Query using a half-open range

Use this pattern:

```sql
WHERE event_ts >= :start
  AND event_ts <  :end
```

This pattern is portable across databases.

## Why this works

On DST transition days:

- spring forward -> window is 23 hours
- fall back -> window is 25 hours

The library resolves these correctly.

SQL simply filters exact timestamps.

## Database examples

### PostgreSQL

```sql
SELECT *
FROM events
WHERE event_ts >= $1
  AND event_ts <  $2;
```

```js
await pg.query(query, [
  window.start.toInstant().toString(),
  window.end.toInstant().toString()
]);
```

### MySQL

```sql
SELECT *
FROM events
WHERE event_ts >= ?
  AND event_ts <  ?;
```

```js
await mysql.execute(query, [
  window.start.toInstant().toString(),
  window.end.toInstant().toString()
]);
```

Recommended:

```sql
SET time_zone = '+00:00';
```

### SQLite

If storing ISO UTC strings:

```sql
SELECT *
FROM events
WHERE event_ts >= ?
  AND event_ts <  ?;
```

If storing epoch milliseconds:

```sql
SELECT *
FROM events
WHERE event_ts_ms >= ?
  AND event_ts_ms <  ?;
```

## Multi-region note

Different boundaries produce different windows.

That means the same calendar date does not map to the same exact range across zones.

Incorrect:

`Show 2026-10-25 for all regions`

Correct:

- `Show data using boundary A`
- `Show data using boundary B`

Each boundary resolves to its own `[start, end)` window.

## Common mistakes

### Assuming 24 hours

```sql
WHERE event_ts >= :start
  AND event_ts < :start + interval '24 hours'
```

This fails on DST transition days.

### Grouping by date

```sql
GROUP BY DATE(event_ts)
```

This is incorrect when the boundary is not UTC midnight.

### Using fixed offsets

```sql
event_ts - interval '5 hours'
```

This is not timezone logic and breaks during DST.

### Treating `00:00` as a universal boundary

`day starts at 00:00`

This is a convention, not a rule.

## Correct mental model

Avoid:

`Get data for 2026-10-25`

Use:

`Get data for a specific boundary window`

The system operates as:

`(boundary definition) -> window -> data`

## Optional helper pattern

```js
function toSqlRange(window) {
  return {
    start: window.start.toInstant().toString(),
    end: window.end.toInstant().toString(),
  };
}
```

Usage:

```js
const { start, end } = toSqlRange(window);
```

## Summary

- a day is not always 24 hours
- `00:00` is not a universal boundary
- DST invalidates fixed-duration assumptions
- boundary definition is a business decision
- the system operates on `(timeZone + rule)`
- the library ensures correct boundary resolution
- SQL should filter exact instants only

The contract:

`[startInstant, endInstant)`

Any logic that reintroduces "midnight + 24 hours" will produce incorrect results on DST transition days.
