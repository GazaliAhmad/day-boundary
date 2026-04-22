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
- `http://localhost:8000/examples/day-boundary-shift-attendance-toy-app/`
- `http://localhost:8000/examples/day-boundary-delivery-shift-toy-app/`

Notes:

- The Hijri POC and DST toy app use the v2 path.
- The shift toy app uses the companion `day-boundary/shifts` helpers.
- The shift attendance toy app demonstrates `resolveShiftStart(...)` and `resolveShiftEnd(...)`.
- The delivery shift toy app applies the same shift helpers to rider online/offline windows and route-end interpretation.
- The Hijri POC, DST toy app, and shift toy app use an import map for `@js-temporal/polyfill` and `jsbi`.
- The shift attendance toy app also uses an import map for `@js-temporal/polyfill` and `jsbi`.
- The delivery shift toy app also uses an import map for `@js-temporal/polyfill` and `jsbi`.
- The Hijri POC reads CSV data from `../../data/`.
