# Examples

This folder contains browser examples for `day-boundary`.

Serve the repo root locally:

```bash
python -m http.server 8000
```

Then open:

- `http://localhost:8000/examples/day-boundary-api-snippets/`
- `http://localhost:8000/examples/day-boundary-toy-app/`
- `http://localhost:8000/examples/day-boundary-hijri-poc/`
- `http://localhost:8000/examples/day-boundary-dst-toy-app/`
- `http://localhost:8000/examples/day-boundary-duration-toy-app/`

Notes:

- The API snippets page covers smaller public helpers that do not need a full scenario app.
- The toy app, Hijri POC, and DST toy app use the main library API.
- The duration toy app uses core boundary-window duration helpers.
- All current examples use an import map for `@js-temporal/polyfill` and `jsbi`.
- The Hijri POC reads CSV data from `../../data/`.
