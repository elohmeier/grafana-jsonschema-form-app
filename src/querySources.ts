import {
  CoreApp,
  DataFrame,
  DataQueryRequest,
  DataQueryResponse,
  DataQueryResponseData,
  ScopedVars,
  dateTime,
} from '@grafana/data';
import { getDataSourceSrv } from '@grafana/runtime';
import { DataQuery } from '@grafana/schema';
import { isObservable, lastValueFrom } from 'rxjs';

import { NormalizedQueryBackedSourceConfig, QuerySourceKind } from './appConfig';

export interface QuerySourceRow {
  id: string;
  title: string;
  jsonValue?: unknown;
  values: Record<string, unknown>;
}

type LegacyTableData = {
  columns: Array<{ text: string }>;
  rows: unknown[][];
};

export async function loadSourceRows(
  source: NormalizedQueryBackedSourceConfig,
  kind: QuerySourceKind
): Promise<QuerySourceRow[]> {
  if (!source.enabled) {
    return [];
  }

  if (!source.datasourceUid) {
    throw new Error('Select a data source in the plugin configuration.');
  }

  if (!source.listQuery) {
    throw new Error('Configure a list query in the plugin configuration.');
  }

  const response = await runConfiguredQuery(source.datasourceUid, source.listQuery, kind);
  return extractRows(response, source, !source.detailQuery);
}

export async function resolveSourceJson(
  source: NormalizedQueryBackedSourceConfig,
  kind: QuerySourceKind,
  row: QuerySourceRow
): Promise<unknown> {
  if (!source.detailQuery) {
    if (typeof row.jsonValue === 'undefined') {
      throw new Error(`The selected ${kind} row does not include field "${source.jsonField}".`);
    }

    return parseJsonValue(row.jsonValue, kind);
  }

  if (!source.datasourceUid) {
    throw new Error('Select a data source in the plugin configuration.');
  }

  const response = await runConfiguredQuery(source.datasourceUid, source.detailQuery, kind, getSelectionScopedVars(kind, row));
  const value = extractFirstJsonValue(response, source);

  return parseJsonValue(value, kind);
}

export function extractRows(
  response: DataQueryResponse,
  source: Pick<NormalizedQueryBackedSourceConfig, 'idField' | 'titleField' | 'jsonField'>,
  requireJsonField: boolean
): QuerySourceRow[] {
  const rows = response.data.flatMap((frame) => extractRowsFromFrame(frame, source, requireJsonField));
  const seenIds = new Set<string>();

  for (const row of rows) {
    if (seenIds.has(row.id)) {
      throw new Error(`The configured query returned duplicate id "${row.id}".`);
    }

    seenIds.add(row.id);
  }

  return rows;
}

function extractFirstJsonValue(
  response: DataQueryResponse,
  source: Pick<NormalizedQueryBackedSourceConfig, 'jsonField'>
): unknown {
  for (const frame of response.data) {
    const value = extractJsonValueFromFrame(frame, source.jsonField);

    if (typeof value !== 'undefined') {
      return value;
    }
  }

  throw new Error(`The detail query did not return field "${source.jsonField}".`);
}

async function runConfiguredQuery(
  datasourceUid: string,
  query: DataQuery,
  kind: QuerySourceKind,
  scopedVars: ScopedVars = {}
): Promise<DataQueryResponse> {
  const datasource = await getDataSourceSrv().get({ uid: datasourceUid });
  const now = dateTime();
  const request: DataQueryRequest<DataQuery> = {
    app: CoreApp.Unknown,
    interval: '',
    intervalMs: 1000,
    maxDataPoints: 1000,
    range: {
      from: dateTime(now).subtract(1, 'hour'),
      to: now,
      raw: {
        from: 'now-1h',
        to: 'now',
      },
    },
    requestId: `jsonschema-form-${kind}-${Date.now()}`,
    scopedVars,
    startTime: Date.now(),
    targets: [
      {
        ...query,
        datasource: datasource.getRef(),
        refId: query.refId || 'A',
      },
    ],
    timezone: 'browser',
  };
  const response = datasource.query(request);

  return isObservable(response) ? lastValueFrom(response) : response;
}

function getSelectionScopedVars(kind: QuerySourceKind, row: QuerySourceRow): ScopedVars {
  const idVariable = kind === 'document' ? 'documentId' : 'schemaId';
  const scopedVars: ScopedVars = {
    [idVariable]: {
      text: row.id,
      value: row.id,
    },
    id: {
      text: row.id,
      value: row.id,
    },
  };

  for (const [name, value] of Object.entries(row.values)) {
    if (value === null || typeof value === 'undefined') {
      continue;
    }

    scopedVars[name] = {
      text: String(value),
      value,
    };
  }

  return scopedVars;
}

function extractRowsFromFrame(
  frame: DataQueryResponseData,
  source: Pick<NormalizedQueryBackedSourceConfig, 'idField' | 'titleField' | 'jsonField'>,
  requireJsonField: boolean
): QuerySourceRow[] {
  if (isDataFrameLike(frame)) {
    return extractRowsFromDataFrame(frame, source, requireJsonField);
  }

  if (isTableData(frame)) {
    return extractRowsFromTableData(frame, source, requireJsonField);
  }

  return [];
}

function extractRowsFromDataFrame(
  frame: Pick<DataFrame, 'fields' | 'length'>,
  source: Pick<NormalizedQueryBackedSourceConfig, 'idField' | 'titleField' | 'jsonField'>,
  requireJsonField: boolean
): QuerySourceRow[] {
  const idField = findField(frame.fields, source.idField);
  const titleField = findField(frame.fields, source.titleField) ?? findField(frame.fields, 'title') ?? findField(frame.fields, 'name');
  const jsonField = findField(frame.fields, source.jsonField);

  if (!idField) {
    throw new Error(`The configured query did not return field "${source.idField}".`);
  }

  if (requireJsonField && !jsonField) {
    throw new Error(`The configured query did not return field "${source.jsonField}".`);
  }

  return Array.from({ length: frame.length }, (_, rowIndex) => {
    const id = stringifyId(idField.values[rowIndex]);
    const title = stringifyTitle(titleField?.values[rowIndex], id);
    const values = Object.fromEntries(frame.fields.map((field) => [field.name, field.values[rowIndex]]));

    return {
      id,
      title,
      jsonValue: jsonField?.values[rowIndex],
      values,
    };
  });
}

function extractRowsFromTableData(
  table: LegacyTableData,
  source: Pick<NormalizedQueryBackedSourceConfig, 'idField' | 'titleField' | 'jsonField'>,
  requireJsonField: boolean
): QuerySourceRow[] {
  const idIndex = findColumnIndex(table, source.idField);
  const titleIndex = findColumnIndex(table, source.titleField) ?? findColumnIndex(table, 'title') ?? findColumnIndex(table, 'name');
  const jsonIndex = findColumnIndex(table, source.jsonField);

  if (idIndex === undefined) {
    throw new Error(`The configured query did not return field "${source.idField}".`);
  }

  if (requireJsonField && jsonIndex === undefined) {
    throw new Error(`The configured query did not return field "${source.jsonField}".`);
  }

  return table.rows.map((row) => {
    const id = stringifyId(row[idIndex]);
    const title = stringifyTitle(titleIndex === undefined ? undefined : row[titleIndex], id);
    const values = Object.fromEntries(table.columns.map((column, index) => [column.text, row[index]]));

    return {
      id,
      title,
      jsonValue: jsonIndex === undefined ? undefined : row[jsonIndex],
      values,
    };
  });
}

function extractJsonValueFromFrame(frame: DataQueryResponseData, jsonFieldName: string): unknown {
  if (isDataFrameLike(frame)) {
    const field = findField(frame.fields, jsonFieldName);

    return field?.values[0];
  }

  if (isTableData(frame)) {
    const index = findColumnIndex(frame, jsonFieldName);

    return index === undefined ? undefined : frame.rows[0]?.[index];
  }

  return undefined;
}

function parseJsonValue(value: unknown, kind: QuerySourceKind): unknown {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid JSON';
      throw new Error(`The selected ${kind} contains invalid JSON: ${message}`);
    }
  }

  if (value && typeof value === 'object') {
    return value;
  }

  throw new Error(`The selected ${kind} must be JSON text or a JSON object.`);
}

function isDataFrameLike(frame: DataQueryResponseData): frame is DataFrame {
  return typeof frame === 'object' && frame !== null && Array.isArray((frame as DataFrame).fields);
}

function isTableData(frame: DataQueryResponseData): frame is LegacyTableData {
  return (
    typeof frame === 'object' &&
    frame !== null &&
    Array.isArray((frame as LegacyTableData).columns) &&
    Array.isArray((frame as LegacyTableData).rows)
  );
}

function findField(fields: DataFrame['fields'], name: string) {
  return fields.find((field) => field.name === name) ?? fields.find((field) => field.name.toLowerCase() === name.toLowerCase());
}

function findColumnIndex(table: LegacyTableData, name: string): number | undefined {
  const index = table.columns.findIndex((column) => column.text === name);

  if (index >= 0) {
    return index;
  }

  const caseInsensitiveIndex = table.columns.findIndex((column) => column.text.toLowerCase() === name.toLowerCase());

  return caseInsensitiveIndex >= 0 ? caseInsensitiveIndex : undefined;
}

function stringifyId(value: unknown): string {
  if (value === null || typeof value === 'undefined' || value === '') {
    throw new Error('The configured query returned a row without an id.');
  }

  return String(value);
}

function stringifyTitle(value: unknown, fallback: string): string {
  if (value === null || typeof value === 'undefined' || value === '') {
    return fallback;
  }

  return String(value);
}
