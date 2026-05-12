# Grafana JSON Schema Form App

Frontend-only Grafana app plugin that renders editable JSON Schema forms with Grafana UI components.

The app provides a form editor page at `/a/g42-jsonschemaform-app/editor` with three JSON editors:

- Schema
- UI schema
- Form data

The preview uses `@rjsf/core` with an AJV 8 validator and a custom RJSF theme backed by `@grafana/ui`.

## Query-backed documents and schemas

The app configuration page can optionally define query-backed sources for selectable JSON documents and JSON schemas.
Each source uses an existing Grafana datasource and renders that datasource's native query editor when available:

- List query: returns rows with an ID, title, and optionally JSON text.
- Detail query: optional query run after selection. It receives `$documentId` or `$schemaId` as a scoped variable and returns the configured JSON field.

If a datasource does not expose a native query editor, the configuration page falls back to editing the query target as JSON.

The editor accepts only IDs returned by the configured list queries. Shareable links use query parameters:

```text
/a/g42-jsonschemaform-app/editor?documentId=policy-checkout&schemaId=alert-policy-v1
```

Arbitrary document or schema URLs are not supported.

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
