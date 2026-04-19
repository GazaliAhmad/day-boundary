# Examples

This folder contains browser examples for `day-boundary`.

Serve the repo root locally:

```bash
python -m http.server 8000
```

Then open:

- `http://localhost:8000/examples/day-boundary-toy-app/`
- `http://localhost:8000/examples/day-boundary-hijri-poc/`
- `http://localhost:8000/examples/day-boundary-dst-toy-app/`
- `http://localhost:8000/examples/day-boundary-shift-toy-app/`

Notes:

- the Hijri POC and DST toy app use the v2 path
- the shift toy app uses the companion `day-boundary/shifts` helpers
- the Hijri POC, DST toy app, and shift toy app use an import map for `@js-temporal/polyfill` and `jsbi`
- the Hijri POC reads CSV data from `../../data/`
