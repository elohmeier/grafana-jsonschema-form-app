# JSON Schema Form

Grafana app plugin for editing JSON Schema, UI schema, and form data as JSON or YAML, then previewing the generated form with Grafana UI controls.

The form renderer is based on `@rjsf/core`, `@rjsf/validator-ajv8`, and a local Grafana UI theme.

Plugin configuration can enable datasource-backed document and schema selectors using datasource-native query editors. Datasource fields may return objects or JSON/YAML text.
URL state supports `documentId` and `schemaId`; arbitrary URL loading is intentionally not supported.
