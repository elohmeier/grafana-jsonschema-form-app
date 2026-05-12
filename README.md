# Grafana JSON Schema Form App

Frontend-only Grafana app plugin that renders editable JSON Schema forms with Grafana UI components.

The app provides a form editor page at `/a/g42-jsonschemaform-app/editor` with three JSON editors:

- Schema
- UI schema
- Form data

The preview uses `@rjsf/core` with an AJV 8 validator and a custom RJSF theme backed by `@grafana/ui`.

## Development

Install dependencies:

```bash
npm install
```

Run the plugin frontend in watch mode:

```bash
npm run dev
```

Run Grafana with the plugin mounted:

```bash
npm run server
```

Then open `http://localhost:3000/a/g42-jsonschemaform-app/editor`.

## Checks

```bash
npm run typecheck
npm run lint
npm run test:ci
npm run build
```

The production build currently emits one vendor chunk size warning because the app bundles the JSON editor and RJSF dependencies.
