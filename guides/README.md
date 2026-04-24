# Guides

This folder contains the longer-form documentation for `day-boundary`.

Start here when you want examples of where the library fits, how to use the API, and how to apply it in real systems.

## Current API

- [Usage](./usage.md) is the main usage guide for the current API.
- [API](./api.md) is the detailed API specification.
- [Functions Reference](./functions-reference.md) is the compact public-and-internal function inventory for the current codebase.

Published package surface:

- `day-boundary` points to the current stable API entry.
- `ver-01` and `ver-02` remain repository archives and are not published as npm exports.
- if you need the old v2 package line, use `day-boundary@2.x`.

## Concepts and positioning

- [Business Use Cases](./business-use-cases.md) explains the kinds of operational systems where boundary-defined windows are the right model.
- [SQL DST-Safe Queries](./sql-dst-safe-queries.md) shows the recommended database querying pattern using resolved `[start, end)` windows.
- [Use Cases](./use-cases.md) explains where the library is strongest, where it is situational, and where it is unnecessary.

## Archive

- [Archived v1 Usage](./ver-01/usage.md) is kept only for older `Date`-based compatibility work and remains repository-only.
- [Archived v2 Usage](./ver-02/usage.md) keeps the old guide name as a historical pointer for the repository-retained v2 line.
- [Archived v2 API](./ver-02/api.md) keeps the old guide name as a historical pointer for the repository-retained v2 line.
