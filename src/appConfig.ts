import { DataQuery } from '@grafana/schema';

export const DOCUMENT_ID_PARAM = 'documentId';
export const SCHEMA_ID_PARAM = 'schemaId';

export type QuerySourceKind = 'document' | 'schema';

export interface QueryBackedSourceConfig {
  enabled?: boolean;
  datasourceUid?: string;
  listQuery?: DataQuery;
  detailQuery?: DataQuery;
  idField?: string;
  titleField?: string;
  jsonField?: string;
}

export interface JsonSchemaFormAppConfig {
  documentSource?: QueryBackedSourceConfig;
  schemaSource?: QueryBackedSourceConfig;
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
  };
}

export function compactSourceConfig(source: NormalizedQueryBackedSourceConfig): QueryBackedSourceConfig {
  return {
    enabled: source.enabled,
    datasourceUid: source.datasourceUid,
    listQuery: source.listQuery,
    detailQuery: source.detailQuery,
    idField: source.idField,
    titleField: source.titleField,
    jsonField: source.jsonField,
  };
}

export function compactAppConfig(config: NormalizedJsonSchemaFormAppConfig): JsonSchemaFormAppConfig {
  return {
    documentSource: compactSourceConfig(config.documentSource),
    schemaSource: compactSourceConfig(config.schemaSource),
  };
}
