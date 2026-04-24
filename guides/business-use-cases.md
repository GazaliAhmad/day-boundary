# Business use cases

The library is designed for systems where time is defined by local,
human-defined boundary events and the windows between them, not just fixed
24-hour assumptions.

These are the most common and high-impact scenarios.

Related guides:

- [Use Cases](./use-cases.md) for overall fit and positioning
- [Usage](./usage.md) for implementation examples
- [SQL DST-Safe Queries](./sql-dst-safe-queries.md) for the database-query pattern

## 1. Daily reporting and analytics

### Problem

Most reporting systems assume:

`day = midnight -> midnight (24 hours)`

This breaks when:

- daylight saving time shifts occur
- reporting is tied to local time zones
- multiple regions are involved

Results:

- incorrect daily totals
- missing or duplicated records
- inconsistent dashboards

### Example

A report for a given day is often implemented as:

```sql
WHERE event_ts >= :start
  AND event_ts <  :start + interval '24 hours'
```

This fails on DST transition days.

### Solution

Use a boundary-defined window:

`(timeZone + boundary rule) -> [start, end)`

The library resolves the correct window, including:

- 23-hour days (spring forward)
- 25-hour days (fall back)

SQL then becomes:

```sql
WHERE event_ts >= :start
  AND event_ts <  :end
```

## 2. Worker schedules and operating windows

### Problem

Many operational systems depend on wall-clock schedules:

- "Shift starts at 00:00"
- "Shift ends at 08:00"

During DST transitions:

- elapsed time and wall-clock time diverge
- a shift may be 7, 8, or 9 actual hours

This affects:

- payroll accuracy
- compliance
- staffing calculations

### Example

A schedule window defined as:

`00:00 -> 08:00 local time`

On a DST change, it:

- may result in different actual durations
- cannot be modeled as a fixed 8-hour interval

### Solution

Resolve these as boundary windows:

`(timeZone + boundary rule) -> [start, end)`

The library ensures:

- correct handling of repeated or skipped times
- accurate distinction between wall-clock schedule and elapsed duration
- a neutral primitive that can also represent delivery waves, lesson blocks, and factory process windows

## 3. Operational cutoffs

Examples include logistics, delivery, and workflow systems.

### Problem

Many systems do not operate on calendar days.

Instead, they use operational cutoffs such as:

- "day starts at 06:00 local time"
- "orders after 18:00 belong to next day"
- "processing window resets at shift change"

These rules:

- are defined in local wall-clock time
- vary by region
- break under DST if implemented using fixed offsets

### Example

A delivery system defines:

`operational day = 06:00 -> next 06:00`

Naive implementation:

`start + 24 hours`

This fails during DST transitions.

### Solution

Define the cutoff as a boundary:

`(timeZone + boundary rule) -> [start, end)`

The library resolves the correct window for each operational period.

## What these use cases have in common

All of these scenarios share the same structure:

- human-defined boundary
- local wall-clock time
- need for exact interpretation under timezone rules

If these conditions exist, the library applies.

## What is not covered

The library is not intended for systems based purely on elapsed time with no
meaningful boundary events:

`start instant + duration`

Examples:

- fixed 6-hour machine cycles
- continuous automated processes
- systems that do not depend on local wall-clock boundaries

In these cases, timezone and DST handling are not relevant.

## Summary

The library applies when:

- time is defined by local boundary rules
- correctness depends on real-world timezone behavior
- DST and offset changes must be handled precisely

The core model:

`(timeZone + boundary rule) -> [startInstant, endInstant)`

This removes ambiguity and ensures consistent behavior across reporting, operations, and scheduling systems.

This guide is about fit and positioning, not implementation details.

If your system matches these patterns, continue with [SQL DST-safe queries](./sql-dst-safe-queries.md) for the implementation model and query pattern.
