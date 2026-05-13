import {
  CoreApp,
  DataFrame,
  DataQueryRequest,
  DataQueryResponse,
  DataQueryResponseData,
  dateTime,
} from '@grafana/data';
import { getDataSourceSrv } from '@grafana/runtime';
import { DataQuery } from '@grafana/schema';
import { isObservable, lastValueFrom } from 'rxjs';

import { NormalizedQueryBackedSourceConfig, QuerySourceKind } from './appConfig';
import { parseDocument } from './documentFormat';

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
  return extractRows(response, source);
}

export async function resolveSourceJson(
  source: NormalizedQueryBackedSourceConfig,
  kind: QuerySourceKind,
  row: QuerySourceRow
): Promise<unknown> {
  if (typeof row.jsonValue === 'undefined') {
    throw new Error(`The selected ${kind} row does not include field "${source.jsonField}".`);
  }

  return parseDocumentValue(row.jsonValue, kind);
}

export function extractRows(
  response: DataQueryResponse,
  source: Pick<NormalizedQueryBackedSourceConfig, 'idField' | 'titleField' | 'jsonField'>
): QuerySourceRow[] {
  const rows = response.data.flatMap((frame) => extractRowsFromFrame(frame, source));
  const seenIds = new Set<string>();

  for (const row of rows) {
    if (seenIds.has(row.id)) {
      throw new Error(`The configured query returned duplicate id "${row.id}".`);
    }

    seenIds.add(row.id);
  }

  return rows;
}

async function runConfiguredQuery(
  datasourceUid: string,
  query: DataQuery,
  kind: QuerySourceKind
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
    scopedVars: {},
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

function extractRowsFromFrame(
  frame: DataQueryResponseData,
  source: Pick<NormalizedQueryBackedSourceConfig, 'idField' | 'titleField' | 'jsonField'>
): QuerySourceRow[] {
  if (isDataFrameLike(frame)) {
    return extractRowsFromDataFrame(frame, source);
  }

  if (isTableData(frame)) {
    return extractRowsFromTableData(frame, source);
  }

  return [];
}

function extractRowsFromDataFrame(
  frame: Pick<DataFrame, 'fields' | 'length'>,
  source: Pick<NormalizedQueryBackedSourceConfig, 'idField' | 'titleField' | 'jsonField'>
): QuerySourceRow[] {
  const idField = findField(frame.fields, source.idField);
  const titleField = findField(frame.fields, source.titleField) ?? findField(frame.fields, 'title') ?? findField(frame.fields, 'name');
  const jsonField = findField(frame.fields, source.jsonField);

  if (!idField) {
    throw new Error(`The configured query did not return field "${source.idField}".`);
  }

  if (!jsonField) {
    throw new Error(`The configured query did not return field "${source.jsonField}".`);
  }

  return Array.from({ length: frame.length }, (_, rowIndex) => {
    const id = stringifyId(idField.values[rowIndex]);
    const title = stringifyTitle(titleField?.values[rowIndex], id);
    const values = Object.fromEntries(frame.fields.map((field) => [field.name, field.values[rowIndex]]));

    return {
      id,
      title,
      jsonValue: jsonField.values[rowIndex],
      values,
    };
  });
}

function extractRowsFromTableData(
  table: LegacyTableData,
  source: Pick<NormalizedQueryBackedSourceConfig, 'idField' | 'titleField' | 'jsonField'>
): QuerySourceRow[] {
  const idIndex = findColumnIndex(table, source.idField);
  const titleIndex = findColumnIndex(table, source.titleField) ?? findColumnIndex(table, 'title') ?? findColumnIndex(table, 'name');
  const jsonIndex = findColumnIndex(table, source.jsonField);

  if (idIndex === undefined) {
    throw new Error(`The configured query did not return field "${source.idField}".`);
  }

  if (jsonIndex === undefined) {
    throw new Error(`The configured query did not return field "${source.jsonField}".`);
  }

  return table.rows.map((row) => {
    const id = stringifyId(row[idIndex]);
    const title = stringifyTitle(titleIndex === undefined ? undefined : row[titleIndex], id);
    const values = Object.fromEntries(table.columns.map((column, index) => [column.text, row[index]]));

    return {
      id,
      title,
      jsonValue: row[jsonIndex],
      values,
    };
  });
}

function parseDocumentValue(value: unknown, kind: QuerySourceKind): unknown {
  if (typeof value === 'string') {
    try {
      return parseDocument(value, 'auto');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid JSON/YAML';
      throw new Error(`The selected ${kind} contains invalid JSON/YAML: ${message}`);
    }
  }

  if (value && typeof value === 'object') {
    return value;
  }

  throw new Error(`The selected ${kind} must be JSON/YAML text or an object.`);
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
