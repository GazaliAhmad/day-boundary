# V2 API

This document defines the v2 API for `day-boundary`.

The goal of v2 is to make the library truly global by moving from `Date`-based local assumptions to `Temporal`-based, time-zone-aware window resolution.

Related guides:

- [V2 Usage](./v2-usage.md) for practical usage examples
- [Functions Reference](./functions-reference.md) for the symbol inventory
- [Use Cases](./use-cases.md) for positioning and fit

## Design goals

- Use `Temporal` as the core time model.
- Require explicit IANA time zones.
- Represent windows as exact time in a named zone.
- Handle DST and non-24-hour days correctly.
- Keep calendar labeling out of the core library.
- Preserve the current library's main mental model: resolve a boundary-defined day as a window.
- Keep the API idiomatic to Temporal instead of recreating parallel date/time concepts.

## Non-goals

- Calculating religious calendars.
- Calculating lunar calendar labels.
- Embedding any domain-specific boundary meaning into the API.
- Hiding time zone handling behind host-local defaults.

## Core concepts

### Boundary window

A boundary window is the interval:

`[boundary_n, boundary_n+1)`

In v2, boundaries are resolved in an explicit IANA time zone and returned as `Temporal.ZonedDateTime`.

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
- This is a deliberate API choice: v2 returns `Temporal.ZonedDateTime` for developer readability and zone-aware debugging, while internal comparisons should use `toInstant()`.

### Time model

v2 distinguishes between:

- exact time: `Temporal.Instant`
- wall-clock local date/time: `Temporal.PlainDateTime`
- zone-aware exact/local value: `Temporal.ZonedDateTime`

The library does its core comparison, grouping, and progress calculations using exact time semantics.

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

v2 explicitly supports:

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

## Shift semantics

For shift-based domains such as hospitals, nursing care, transport, and factory work, v2 must keep two distinct meanings separate:

- `elapsed duration`
- `wall-clock schedule`
- `start tolerance windows`
- `end-of-shift classification`

These diverge on DST transition days.

Example in `Europe/London` when clocks go back on Sunday, October 25, 2026:

- a shift that starts at `00:00 BST`
- ends at `07:00 GMT` if the rule is `8 actual elapsed hours`
- ends at `08:00 GMT` if the rule is `00:00 -> 08:00 local wall-clock time`

Implication for library consumers:

- `Temporal.Instant` is the right primitive for elapsed-duration rules
- `Temporal.ZonedDateTime` is the right primitive for wall-clock schedule rules

This distinction should remain explicit in examples, docs, and any future higher-level scheduling helpers built on top of the boundary library.

### Companion shift helpers

The companion `day-boundary/shifts` entry point now includes:

- `getShiftEndByElapsedDuration(start, duration)`
- `getShiftEndByWallClockDuration(start, duration)`
- `compareShiftEndings(start, duration)`
- `resolveShiftStart(eventTime, strategy, options)`
- `resolveShiftEnd(logOffTime, scheduledShiftEnd, options)`

Rules:

- shift helper inputs should use Temporal objects only in the typed API
- start tolerance values use `Temporal.Duration` and compare exact instants around the boundary start
- end-of-shift rules use `Temporal.Duration` and compare exact instants from scheduled shift end
- the `overtime` field represents time beyond scheduled end, starting from scheduled shift end or from `scheduledShiftEnd + overtime.startsAfter` when a threshold is configured
- inferred missing log-off handling should stay separate from confirmed post-end time

## Error behavior

v2 throws when:

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

## Migration guidance from v1

### Conceptual changes

v1:

- uses `Date`
- assumes local host behavior
- treats daily transitions with implicit local semantics

v2:

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

## Design decisions

The following design decisions define the current v2 line:

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
- core APIs prefer Temporal objects in the typed public surface, with strict declaration files for `day-boundary` and `day-boundary/shifts`
