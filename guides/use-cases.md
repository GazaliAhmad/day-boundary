# Use cases

This document describes where the library is strongest, where it is situational, and where it is unnecessary.

Related guides:

- [V2 Usage](./v2-usage.md) for the main implementation path
- [Business Use Cases](./business-use-cases.md) for a business-oriented explanation of the strongest scenarios
- [SQL DST-Safe Queries](./sql-dst-safe-queries.md) for the concrete querying pattern

The library is most valuable when all three are true:

1. the boundary is not midnight
2. the boundary rule is reused across the system
3. mistakes have operational, financial, or audit consequences

If any one of those is missing, the library may be more abstraction than value.

## Strong use cases

These are the best fits for the library because they combine non-midnight boundaries with repeated business logic and meaningful downside if the rule is wrong.

### 1. Shift-based operations

Examples:

- factories
- logistics
- security
- maintenance

Why the library fits:

- a day may begin at `07:00`, `19:00`, or another operational cutoff
- overnight work often belongs to the previous operational day, not the calendar day
- reports, dashboards, and downstream analytics need a consistent boundary model

What the library provides:

- clean grouping of activity into operational windows
- removal of scattered "previous day" logic
- stable reporting aligned to actual shift cycles

### 2. Healthcare and hospital shifts

Examples:

- nurse shifts
- doctor rotations
- overnight wards
- handover tracking

Why the library fits:

- patient care activity often crosses midnight
- operational ownership is usually defined by shift, not calendar date
- auditability and continuity matter more than civil-day alignment

Why this is high-stakes:

- handover mistakes are operationally serious
- audit trails must reflect the intended shift window
- staffing and accountability rules need consistent grouping

Important DST note:

- on transition days, `8 actual elapsed hours` and `00:00 -> 08:00 local schedule` are not always the same
- the library's v2 path plus companion shift helpers make that distinction explicit

### 3. Transport and ride-hailing payout windows

Examples:

- driver incentive windows
- payout periods
- weekly earnings rules
- surge or operational cycles

Why the library fits:

- payout windows often do not follow civil-day or civil-week boundaries
- boundary rules affect incentives, earnings summaries, and reconciliation
- the same rule usually appears across reporting, calculations, and support tooling

What the library provides:

- a reusable boundary model instead of ad hoc date slicing
- consistent grouping for earnings and incentive logic
- clearer alignment between operational rules and stored data

### 4. Continuous production and manufacturing

Examples:

- 24/7 production lines
- batch manufacturing
- downtime reporting
- throughput monitoring

Why the library fits:

- production cycles often run continuously across midnight
- reporting windows are usually based on operational cycles, not civil dates
- downtime and throughput analysis become distorted when midnight splits a working cycle

What the library provides:

- cycle-aligned reporting windows
- cleaner batch continuity
- less custom boundary logic in reporting layers

## Medium-strength use cases

These can benefit from the library, but in some systems a simpler implementation may still be enough.

### 5. Energy usage and utilities

Examples:

- billing cutoffs
- peak and off-peak windows
- operational demand windows

Why it can fit:

- boundaries may not align to midnight
- the same window logic may need to appear in billing, reporting, and monitoring

Why it is only medium-strength:

- some systems can solve this with tariff-specific logic or query-layer rules
- the library becomes more valuable only when the boundary model is reused broadly

### 6. Financial reporting cutoffs

Examples:

- settlement cutoffs
- end-of-day processing
- reporting windows

Why it can fit:

- financial "day end" often does not mean midnight
- cutoffs may need to be applied consistently across ingestion, reporting, and reconciliation

Why it is only medium-strength:

- many financial systems already treat these rules as domain-specific platform logic
- some teams may prefer to keep the logic in database or pipeline layers rather than a reusable boundary library

### 7. Event and batch-processing systems

Examples:

- deployment-day windows
- trigger-based cycles
- recurring processing windows

Why it can fit:

- some systems define "day" by processing boundary rather than civil date
- event grouping may depend on a reusable operational window

Why it is only medium-strength:

- in many implementations this remains internal platform logic
- not every team needs a general-purpose reusable abstraction

## Weak use cases

These are usually poor fits for the library.

### 8. Personal productivity and habit tracking

Why it is weak:

- technically possible, but usually unnecessary
- most cases do not justify a dedicated boundary abstraction

### 9. Calendar apps and scheduling tools

Why it is weak:

- users generally expect midnight-based days
- redefining the day boundary often creates confusion instead of clarity

### 10. General web apps

Why it is weak:

- many apps do not have operational day semantics at all
- adding a boundary abstraction would increase complexity without clear payoff

## Best case for the library

The best case for the library is not "general time handling."

The best case is:

> a reusable boundary engine for systems where the operational day is not midnight

That framing is narrower, but stronger:

- it matches real operational systems
- it explains why the abstraction exists
- it separates the library from generic date utilities

## Positioning summary

The library is strongest when it is used as:

- a boundary resolver
- a windowing engine
- a consistent source of grouping logic for non-midnight days

It is not intended to be:

- a general calendar library
- a generic date utility
- a replacement for application-specific business rules

## Bottom line

The library addresses a recurring boundary problem that becomes expensive when repeated across reporting, auditing, staffing, payouts, or operational dashboards.

That is a credible place for a small library:

- narrow enough to stay clear
- broad enough to be reused
- concrete enough to solve real pain

For implementation details after deciding the library is a fit, continue with [V2 Usage](./v2-usage.md).
