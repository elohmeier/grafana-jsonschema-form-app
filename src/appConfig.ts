import { DataQuery } from '@grafana/schema';

import { DocumentFormat } from './documentFormat';

export const DOCUMENT_ID_PARAM = 'documentId';
export const SCHEMA_ID_PARAM = 'schemaId';

export type QuerySourceKind = 'document' | 'schema';

export const DEFAULT_DOCUMENT_FORMAT: DocumentFormat = 'json';

export interface QueryBackedSourceConfig {
  enabled?: boolean;
  datasourceUid?: string;
  listQuery?: DataQuery;
  idField?: string;
  titleField?: string;
  jsonField?: string;
}

export interface JsonSchemaFormAppConfig {
  documentSource?: QueryBackedSourceConfig;
  schemaSource?: QueryBackedSourceConfig;
  defaultFormat?: DocumentFormat;
}

export interface NormalizedQueryBackedSourceConfig extends QueryBackedSourceConfig {
  enabled: boolean;
  idField: string;
  titleField: string;
  jsonField: string;
}

export interface NormalizedJsonSchemaFormAppConfig {
  documentSource: NormalizedQueryBackedSourceConfig;
  schemaSource: NormalizedQueryBackedSourceConfig;
  defaultFormat: DocumentFormat;
}

const sourceDefaults: Record<QuerySourceKind, Pick<NormalizedQueryBackedSourceConfig, 'idField' | 'titleField' | 'jsonField'>> = {
  document: {
    idField: 'id',
    titleField: 'title',
    jsonField: 'document',
  },
  schema: {
    idField: 'id',
    titleField: 'title',
    jsonField: 'schema',
  },
};

export function normalizeSourceConfig(
  kind: QuerySourceKind,
  source: QueryBackedSourceConfig | undefined
): NormalizedQueryBackedSourceConfig {
  const defaults = sourceDefaults[kind];

  return {
    ...source,
    enabled: Boolean(source?.enabled),
    idField: source?.idField?.trim() || defaults.idField,
    titleField: source?.titleField?.trim() || defaults.titleField,
    jsonField: source?.jsonField?.trim() || defaults.jsonField,
  };
}

export function normalizeAppConfig(config: JsonSchemaFormAppConfig | undefined): NormalizedJsonSchemaFormAppConfig {
  return {
    documentSource: normalizeSourceConfig('document', config?.documentSource),
    schemaSource: normalizeSourceConfig('schema', config?.schemaSource),
    defaultFormat:
      config?.defaultFormat === 'yaml' || config?.defaultFormat === 'json'
        ? config.defaultFormat
        : DEFAULT_DOCUMENT_FORMAT,
  };
}

export function compactSourceConfig(source: NormalizedQueryBackedSourceConfig): QueryBackedSourceConfig {
  return {
    enabled: source.enabled,
    datasourceUid: source.datasourceUid,
    listQuery: source.listQuery,
    idField: source.idField,
    titleField: source.titleField,
    jsonField: source.jsonField,
  };
}

export function compactAppConfig(config: NormalizedJsonSchemaFormAppConfig): JsonSchemaFormAppConfig {
  return {
    documentSource: compactSourceConfig(config.documentSource),
    schemaSource: compactSourceConfig(config.schemaSource),
    defaultFormat: config.defaultFormat,
  };
}
