# Current API

This document defines the current `3.x` API for `day-boundary`.

The goal is to make boundary-defined windows explicit: a boundary event opens or
closes a meaningful span of time, and the library resolves those windows with
Temporal and explicit IANA time zones.

Related guides:

- [Usage](./usage.md) for practical usage examples
- [Functions Reference](./functions-reference.md) for the symbol inventory
- [Use Cases](./use-cases.md) for positioning and fit

## Design goals

- Use `Temporal` as the core time model.
- Require explicit IANA time zones.
- Represent windows as exact time in a named zone.
- Handle DST and non-24-hour days correctly.
- Keep calendar labeling out of the core library.
- Preserve the main mental model: boundary events define windows.
- Keep the API idiomatic to Temporal instead of recreating parallel date/time concepts.

## Non-goals

- Calculating religious calendars.
- Calculating lunar calendar labels.
- Embedding any domain-specific boundary meaning into the API.
- Hiding time zone handling behind host-local defaults.

## Core concepts

### Boundary window

A boundary event is a resolved point in time with domain meaning, such as a
cutoff, changeover, opening, closing, start, or end.

A boundary window is the interval between two boundary events:

`[boundary_n, boundary_n+1)`

Boundaries are resolved in an explicit IANA time zone and returned as `Temporal.ZonedDateTime`.

Shape:

```ts
type BoundaryWindow = {
  start: Temporal.ZonedDateTime;
  end: Temporal.ZonedDateTime;
  label: string;
  metadata: Record<string, unknown>;
};
```

Notes:

- `start` and `end` are exact instants with zone context.
- `start` and `end` should use the strategy's configured time zone.
- Core outputs should use the ISO 8601 calendar unless a future version intentionally adds calendar-aware core behavior.
- `label` is a library-level descriptive label for the window strategy, not a calendar label.
- `metadata` is strategy-defined structured context.
- This is a deliberate API choice: the library returns `Temporal.ZonedDateTime` for developer readability and zone-aware debugging, while internal comparisons should use `toInstant()`.

### Time model

The API distinguishes between:

- exact time: `Temporal.Instant`
- wall-clock local date/time: `Temporal.PlainDateTime`
- zone-aware exact/local value: `Temporal.ZonedDateTime`

The library does its core comparison, grouping, and progress calculations using exact time semantics.

### Boundary timelines

A strategy is a boundary resolver: given an exact instant, it returns the
boundary window that contains that instant. The current built-in strategies
resolve daily boundary timelines, but the core shape is broader than calendar
days.

Duration helpers are a convenience for deriving an end boundary from a start
boundary. They are not the whole primitive; windows can also be closed by the
next boundary event from a rule, dataset, or application resolver.

## Package entry

```js
import { ... } from 'day-boundary';
```

## Strategy API

### `BoundaryStrategy`

Base strategy interface.

```ts
interface BoundaryStrategy {
  timeZone: string;
  getWindowForInstant(instant: Temporal.Instant): BoundaryWindow;
}
```

Rules:

- Every strategy must have an explicit `timeZone`.
- The primary resolution entry point is `getWindowForInstant`.
- Strategies may internally resolve local dates, but public window resolution should be exact-time based.

## Built-in strategies

### `FixedTimeBoundaryStrategy`

Use when the boundary is the same wall-clock time every day in a given zone.

```ts
new FixedTimeBoundaryStrategy({
  timeZone: string,
  boundaryTime: Temporal.PlainTime,
  label?: string,
  disambiguation?: 'compatible' | 'earlier' | 'later' | 'reject',
})
```

Example:

```js
const strategy = new FixedTimeBoundaryStrategy({
  timeZone: 'Europe/London',
  boundaryTime: Temporal.PlainTime.from('09:00'),
  label: 'operational-day',
});
```

Behavior:

- Boundary time is interpreted as local wall-clock time in the configured zone.
- DST ambiguity must be resolved using the configured `disambiguation` option.
- The duration between one boundary and the next is not assumed to be 24 hours.
- If the boundary lands on a skipped spring-forward local time, resolution follows the configured `disambiguation` policy instead of assuming the wall-clock time exists.

Example:

- `timeZone: 'America/New_York'`
- `boundaryTime: '02:30'`
- on Sunday, March 8, 2026, local `02:30` does not exist
- with `disambiguation: 'compatible'`, Temporal resolves that boundary to `03:30 EDT`
- with `disambiguation: 'reject'`, the library throws instead of silently choosing a boundary

### `DailyBoundaryStrategy`

Use when the boundary changes by date.

```ts
new DailyBoundaryStrategy({
  timeZone: string,
  label?: string,
  disambiguation?: 'compatible' | 'earlier' | 'later' | 'reject',
  getBoundaryForDate: (
    date: Temporal.PlainDate,
    context: {
      timeZone: string,
      disambiguation: 'compatible' | 'earlier' | 'later' | 'reject',
      calendar: 'iso8601',
    }
  ) => Temporal.ZonedDateTime,
})
```

Example:

```js
const strategy = new DailyBoundaryStrategy({
  timeZone: 'Asia/Singapore',
  label: 'shifting-day',
  getBoundaryForDate(date, context) {
    const key = date.toString();
    const boundaryTime = boundaryByDate[key];
    const time = Temporal.PlainTime.from(boundaryTime);

    return Temporal.ZonedDateTime.from({
      timeZone: context.timeZone,
      year: date.year,
      month: date.month,
      day: date.day,
      hour: time.hour,
      minute: time.minute,
    });
  },
});
```

Behavior:

- The resolver must support the dates needed to derive the surrounding window.
- The strategy resolves the previous, current, and next local dates around the target instant.
- The returned boundary should be in `context.timeZone`.
- If boundaries are missing or invalid, resolution throws.

## Top-level resolution helpers

### `getWindowForInstant(instant, strategy)`

Primary helper for exact-time resolution.

```ts
getWindowForInstant(
  instant: Temporal.Instant,
  strategy: BoundaryStrategy
): BoundaryWindow
```

Example:

```js
const window = getWindowForInstant(Temporal.Now.instant(), strategy);
```

### `getWindowForZonedDateTime(zonedDateTime, strategy)`

Convenience helper when the caller already has a `Temporal.ZonedDateTime`.

```ts
getWindowForZonedDateTime(
  zonedDateTime: Temporal.ZonedDateTime,
  strategy: BoundaryStrategy
): BoundaryWindow
```

Behavior:

- The helper resolves using the exact instant from the input.
- If the input zone differs from `strategy.timeZone`, the instant is preserved and the strategy zone is authoritative.

### `getWindowForPlainDateTime(plainDateTime, strategy, options)`

Convenience helper for wall-clock local input.

```ts
getWindowForPlainDateTime(
  plainDateTime: Temporal.PlainDateTime,
  strategy: BoundaryStrategy,
  options?: {
    timeZone?: string,
    disambiguation?: 'compatible' | 'earlier' | 'later' | 'reject',
  }
): BoundaryWindow
```

Behavior:

- Converts the wall-clock value into an exact instant using a time zone.
- Defaults `timeZone` to `strategy.timeZone`.
- Uses `disambiguation` when the local wall-clock time is repeated or skipped due to DST or other offset changes.

Fall-back example:

- `timeZone: 'America/New_York'`
- local input `2026-11-01T01:30`
- that wall-clock time happens twice on the DST fall-back night
- `disambiguation: 'earlier'` resolves the first `01:30`
- `disambiguation: 'later'` resolves the second `01:30`

This matters because the two local timestamps can belong to different exact
instants and, depending on the boundary rule, different resolved windows.

## Utility helpers

### `getWindowProgress(instant, window)`

Returns fractional progress through a window.

```ts
getWindowProgress(
  instant: Temporal.Instant,
  window: BoundaryWindow
): number
```

Rules:

- Returns a number from `0` to `1`.
- Uses exact time differences.
- Must work for 23-hour, 24-hour, 25-hour, or other non-standard window lengths.

### `isSameWindow(a, b, strategy)`

Checks whether two instants resolve to the same boundary window.

```ts
isSameWindow(
  a: Temporal.Instant,
  b: Temporal.Instant,
  strategy: BoundaryStrategy
): boolean
```

### `groupByWindow(items, getInstant, strategy)`

Groups arbitrary items into their resolved windows.

```ts
groupByWindow<T>(
  items: T[],
  getInstant: (item: T) => Temporal.Instant,
  strategy: BoundaryStrategy
): Array<{ window: BoundaryWindow, items: T[] }>
```

Rules:

- Group identity is based on exact `start` and `end`.
- Returned groups preserve encounter order unless a future option specifies sorting.

### `getWindowId(window)`

Builds a stable identifier for a boundary window.

```ts
getWindowId(window: BoundaryWindow): string
```

Suggested form:

```txt
{start.toString()}__{end.toString()}
```

Example:

```txt
2026-10-24T09:00:00+01:00[Europe/London]__2026-10-25T09:00:00+00:00[Europe/London]
```

## DST and time zone behavior

The current API explicitly supports:

- IANA time zones such as `Asia/Singapore`, `Europe/London`, `America/New_York`
- DST transitions
- repeated local times
- skipped local times
- future changes in zone offsets as provided by the runtime time zone data

Rules:

- No API should depend on the host machine's implicit local time zone.
- Zone handling must always be explicit.
- The library must never assume a day is 24 hours.
- Wall-clock inputs that are ambiguous or invalid must be resolved with Temporal-style disambiguation rules.
- Exact-time calculations should compare instants, not wall-clock fields.
- Public APIs should avoid offset math and rely on Temporal's zone resolution behavior.

Cross-zone implication:

- The same exact instant can belong to different local calendar dates in different time zones.
- This is especially visible across the International Date Line.
- Boundary windows and downstream labels must be resolved in the target business zone, not inferred from UTC alone.

Example:

- exact instant: `2026-05-01T10:30:00Z`
- with `timeZone: 'Pacific/Kiritimati'` and boundary `06:00`, the resolved bucket date is `2026-05-01`
- with `timeZone: 'Pacific/Honolulu'` and boundary `06:00`, the resolved bucket date is `2026-04-30`

## Boundary duration semantics

For domains such as worker schedules, schools, delivery operations, and factory
processes, the API must keep two distinct meanings separate:

- `elapsed duration`
- `wall-clock schedule`

These diverge on DST transition days.

Example in `Europe/London` when clocks go back on Sunday, October 25, 2026:

- a boundary event at `00:00 BST`
- ends at `07:00 GMT` if the rule is `8 actual elapsed hours`
- ends at `08:00 GMT` if the rule is `00:00 -> 08:00 local wall-clock time`

Implication for library consumers:

- `Temporal.Instant` is the right primitive for elapsed-duration rules
- `Temporal.ZonedDateTime` is the right primitive for wall-clock schedule rules

This distinction should remain explicit in examples, docs, and any future higher-level scheduling helpers built on top of the boundary library.

### Boundary duration helpers

The root `day-boundary` entry point includes:

- `getWindowEndByElapsedDuration(start, duration)`
- `getWindowEndByWallClockDuration(start, duration)`
- `compareWindowEndings(start, duration)`

Rules:

- duration helper inputs should use Temporal objects only in the typed API
- elapsed-duration rules add duration to the exact start instant
- wall-clock-duration rules add duration to the local `PlainDateTime`, then resolve it back into the configured time zone
- `compareWindowEndings` reports whether both interpretations resolve to the same instant and the difference in minutes
- business labels such as late, absent, overtime, overrun, or SLA breach are outside the core library

## Error behavior

The API throws when:

- a strategy is invalid
- a required time zone is missing or invalid
- a boundary cannot be resolved
- resolved boundaries do not form a valid window
- a local date/time cannot be resolved and `disambiguation: 'reject'` is used

## Calendar labeling policy

Calendar labeling is intentionally outside the scope of the core library.

Examples of external label sources:

- Hijri calendar dataset
- Chinese lunar calendar dataset
- business reporting day labels
- custom user-defined day names

The library resolves windows. Applications or companion modules map those windows to labels.

For overnight windows, a common downstream rule is to derive the bucket date
from the local date of `window.start`.

Example:

- boundary at `22:00`
- resolved window `2026-05-01T22:00 -> 2026-05-02T22:00`
- default reporting label or `Logical_Date`: `2026-05-01`

This keeps window identity anchored to the opening boundary while leaving room
for applications to apply a different display label if their domain requires it.

## Migration guidance from v1

### Conceptual changes

v1:

- uses `Date`
- assumes local host behavior
- treats daily transitions with implicit local semantics

current API:

- uses `Temporal`
- requires explicit IANA time zones
- resolves windows using exact-time semantics
- uses Temporal-native types instead of string-heavy convenience APIs in core

### Mapping

- `getActiveWindow(now, strategy)` -> `getWindowForInstant(Temporal.Now.instant(), strategy)`
- `getWindowForTimestamp(timestamp, strategy)` -> `getWindowForInstant(instant, strategy)` or `getWindowForPlainDateTime(...)`
- `FixedTimeBoundaryStrategy` remains conceptually the same but now requires `timeZone`
- `DailyBoundaryStrategy` remains conceptually the same but now resolves boundaries with `Temporal`
- `groupByWindow`, `isSameWindow`, `getWindowProgress`, and `getWindowId` keep similar roles

### Common legacy inputs and explicit failures

The current runtime guards the most common legacy inputs with targeted migration
errors. The goal is to make upgrade failures explicit on first run.

#### `FixedTimeBoundaryStrategy`

Legacy shapes that now fail explicitly:

- `new FixedTimeBoundaryStrategy({ startHour: 9, startMinute: 0 })`
- `new FixedTimeBoundaryStrategy({ hour: 6, minute: 0, second: 0 })`

Use instead:

```js
new FixedTimeBoundaryStrategy({
  timeZone: 'Asia/Singapore',
  boundaryTime: '06:00',
});
```

Runtime behavior:

- legacy fixed-time keys such as `startHour`, `startMinute`, `hour`, `minute`, and `second` now throw a targeted migration error
- `timeZone` remains required even when the old shape is detected

#### `DailyBoundaryStrategy`

Legacy shapes that now fail explicitly:

- `new DailyBoundaryStrategy({ getBoundaryForDate(...) { ... } })`
- `getBoundaryForDate(...)` returning `Date`
- `getBoundaryForDate(...)` returning a string timestamp
- `getBoundaryForDate(...)` returning a numeric timestamp

Use instead:

```js
new DailyBoundaryStrategy({
  timeZone: 'Asia/Singapore',
  getBoundaryForDate(date, context) {
    return Temporal.ZonedDateTime.from({
      timeZone: context.timeZone,
      year: date.year,
      month: date.month,
      day: date.day,
      hour: 19,
      minute: 0,
    });
  },
});
```

Runtime behavior:

- missing `timeZone` on a `DailyBoundaryStrategy` constructor now throws an explicit v3 migration error when a resolver is present
- legacy resolver return values such as `Date`, string, and number now throw an explicit "return `Temporal.ZonedDateTime` instead" error

#### Exact-time inputs

Legacy inputs that now fail explicitly:

- `getWindowForInstant(new Date(), strategy)`
- `getWindowForInstant('2026-04-19T01:00:00Z', strategy)`
- `getWindowForInstant(1713498000000, strategy)`

Use instead:

```js
const instant = Temporal.Instant.from('2026-04-19T01:00:00Z');
const window = getWindowForInstant(instant, strategy);
```

Runtime behavior:

- legacy `Date`, string, and numeric timestamp inputs now throw a targeted migration error telling the caller to convert to `Temporal.Instant` or `Temporal.ZonedDateTime` first
- `null` and `undefined` exact-time inputs throw a typed runtime error expecting `Temporal.Instant` or `Temporal.ZonedDateTime`

#### Wall-clock local inputs

Legacy inputs that now fail explicitly:

- `getWindowForPlainDateTime('2026-10-25T01:30:00', strategy)`
- `getWindowForPlainDateTime(new Date(), strategy)`

Use instead:

```js
const localInput = Temporal.PlainDateTime.from('2026-10-25T01:30:00');
const window = getWindowForPlainDateTime(localInput, strategy);
```

Runtime behavior:

- legacy `Date`, string, and numeric inputs now throw a targeted migration error telling the caller to use `Temporal.PlainDateTime.from(...)` for wall-clock input, or `getWindowForInstant(...)` for exact timestamps
- `null` and `undefined` wall-clock inputs throw a typed runtime error expecting `Temporal.PlainDateTime`
- `boundaryTime: ''` now throws a library-owned validation error; use a non-empty string such as `'09:00'` or a `Temporal.PlainTime`
- in TypeScript, `boundaryTime` is typed as `string | Temporal.PlainTime`, so empty strings are still representable in the type system and are rejected at runtime instead

#### Removed or renamed entry points

Legacy entry points:

- `getActiveWindow(now, strategy)`
- `getWindowForTimestamp(timestamp, strategy)`
- `day-boundary/shifts`
- `compareShiftEndings(...)`
- `getShiftEndByElapsedDuration(...)`
- `getShiftEndByWallClockDuration(...)`

Use instead:

- `getWindowForInstant(Temporal.Now.instant(), strategy)`
- `getWindowForInstant(...)` or `getWindowForPlainDateTime(...)`
- root `day-boundary` entry
- `compareWindowEndings(...)`
- `getWindowEndByElapsedDuration(...)`
- `getWindowEndByWallClockDuration(...)`

## Design decisions

The following design decisions define the current line:

1. `BoundaryWindow.start` and `BoundaryWindow.end` use `Temporal.ZonedDateTime`.
2. Exact comparisons and duration math use `toInstant()` semantics internally.
3. The public API prefers readability and explicit zone context over a lower-level `Instant + timeZone` window shape.

## Current recommendation

The current implementation is:

- core window values use `Temporal.ZonedDateTime`
- exact comparisons use `toInstant()`
- input helpers accept Temporal objects only
- zone and DST handling are explicit
- calendar labeling remains outside core
- core APIs prefer Temporal objects in the typed public surface, with a strict declaration file for `day-boundary`
