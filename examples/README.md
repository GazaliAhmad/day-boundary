# Examples

This folder contains browser examples for `day-boundary`.

Before serving the examples, install the repository dependencies from the repo
root:

```bash
npm install
```

Serve the repo root locally:

```bash
python -m http.server 8000
```

Then open:

- Guided tour hub: `http://localhost:8000/examples/`
- Recommended first stop: `http://localhost:8000/examples/day-boundary-operational-day-demo/`
- DST safety page: `http://localhost:8000/examples/day-boundary-dst-critical-cases/`
- Shifting-day demo: `http://localhost:8000/examples/day-boundary-shifting-day-demo/`
- Duration scenarios: `http://localhost:8000/examples/day-boundary-duration-scenarios/`
- API snippets: `http://localhost:8000/examples/day-boundary-api-snippets/`
- Hijri Maghrib POC: `http://localhost:8000/examples/day-boundary-hijri-poc/`

Suggested tour order:

1. Operational day demo
2. DST critical cases
3. Shifting day demo
4. Duration scenarios
5. API snippets
6. Hijri Maghrib POC

Notes:

- The API snippets page covers smaller public helpers that do not need a full scenario app.
- The operational day demo shows a realistic 06:00 operational-day setup in Europe/London, grouped events, and DST duration semantics on one page.
- The shifting-day demo shows a changing daily boundary resolved with `DailyBoundaryStrategy`.
- The DST critical-cases page focuses on spring-forward gaps, fall-back ambiguity, and duration drift.
- The duration scenarios page uses core boundary-window duration helpers.
- The Hijri POC uses the main library API.
- All current examples use an import map for `@js-temporal/polyfill` and `jsbi`.
- The Hijri POC reads CSV data from `./data/` in the self-contained published site.
