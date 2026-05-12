import React, { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { css } from '@emotion/css';
import {
  AppPluginMeta,
  CoreApp,
  DataSourceApi,
  DataSourceInstanceSettings,
  GrafanaTheme2,
  PluginConfigPageProps,
  TimeRange,
  dateTime,
} from '@grafana/data';
import { DataQuery } from '@grafana/schema';
import { DataSourcePicker, getBackendSrv, getDataSourceSrv } from '@grafana/runtime';
import { Alert, Button, Field, Input, LoadingPlaceholder, Stack, Switch, TextArea, useStyles2 } from '@grafana/ui';
import { lastValueFrom } from 'rxjs';

import {
  JsonSchemaFormAppConfig,
  NormalizedJsonSchemaFormAppConfig,
  NormalizedQueryBackedSourceConfig,
  QuerySourceKind,
  compactAppConfig,
  normalizeAppConfig,
} from '../../appConfig';
import { testIds } from '../testIds';

export interface AppConfigProps extends PluginConfigPageProps<AppPluginMeta<JsonSchemaFormAppConfig>> {}

type QueryJsonEditorProps = {
  description: string;
  label: string;
  onChange: (query: DataQuery | undefined) => void;
  placeholder: string;
  value: DataQuery | undefined;
};

type DataSourceQueryEditorProps = QueryJsonEditorProps & {
  datasourceUid?: string;
  defaultRefId: string;
};

type SourceConfigEditorProps = {
  description: string;
  kind: QuerySourceKind;
  onChange: (source: NormalizedQueryBackedSourceConfig) => void;
  title: string;
  value: NormalizedQueryBackedSourceConfig;
};

type QueryEditorDataSource = DataSourceApi<DataQuery>;

function toQueryJson(query: DataQuery | undefined) {
  return query ? JSON.stringify(query, null, 2) : '';
}

function QueryJsonEditor({ description, label, onChange, placeholder, value }: QueryJsonEditorProps) {
  const serializedValue = useMemo(() => toQueryJson(value), [value]);
  const [draftState, setDraftState] = useState({
    source: serializedValue,
    draft: serializedValue,
    error: null as string | null,
  });
  const draft = draftState.source === serializedValue ? draftState.draft : serializedValue;
  const error = draftState.source === serializedValue ? draftState.error : null;

  const onDraftChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      const nextValue = event.currentTarget.value;
      let error: string | null = null;

      if (!nextValue.trim()) {
        onChange(undefined);
      } else {
        try {
          const parsed = JSON.parse(nextValue);

          if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            throw new Error('Query must be a JSON object.');
          }

          onChange(parsed as DataQuery);
        } catch (err) {
          error = err instanceof Error ? err.message : 'Invalid JSON';
        }
      }

      setDraftState({ source: serializedValue, draft: nextValue, error });
    },
    [onChange, serializedValue]
  );

  return (
    <Field label={label} description={description} invalid={Boolean(error)} error={error}>
      <TextArea value={draft} rows={8} placeholder={placeholder} onChange={onDraftChange} />
    </Field>
  );
}

function getDefaultQuery(datasource: QueryEditorDataSource, defaultRefId: string): DataQuery {
  return {
    ...datasource.getDefaultQuery?.(CoreApp.Unknown),
    refId: defaultRefId,
  };
}

function getEditorTimeRange(): TimeRange {
  const now = dateTime();

  return {
    from: dateTime(now).subtract(1, 'hour'),
    to: now,
    raw: {
      from: 'now-1h',
      to: 'now',
    },
  };
}

function DataSourceQueryEditor({
  datasourceUid,
  defaultRefId,
  description,
  label,
  onChange,
  placeholder,
  value,
}: DataSourceQueryEditorProps) {
  const styles = useStyles2(getStyles);
  const [loadState, setLoadState] = useState<{
    datasource: QueryEditorDataSource | null;
    error: string | null;
    loading: boolean;
  }>({
    datasource: null,
    error: null,
    loading: false,
  });
  const range = useMemo(() => getEditorTimeRange(), []);

  useEffect(() => {
    let active = true;

    if (!datasourceUid) {
      Promise.resolve().then(() => {
        if (active) {
          setLoadState({ datasource: null, error: null, loading: false });
        }
      });

      return () => {
        active = false;
      };
    }

    Promise.resolve()
      .then(() => {
        if (active) {
          setLoadState((current) => ({ ...current, error: null, loading: true }));
        }

        return getDataSourceSrv().get({ uid: datasourceUid });
      })
      .then((datasource) => {
        if (!active) {
          return;
        }

        const typedDatasource = datasource as QueryEditorDataSource;
        setLoadState({ datasource: typedDatasource, error: null, loading: false });

        if (!value) {
          onChange(getDefaultQuery(typedDatasource, defaultRefId));
        }
      })
      .catch((err) => {
        if (active) {
          const message = err instanceof Error ? err.message : 'Unable to load data source.';
          setLoadState({ datasource: null, error: message, loading: false });
        }
      });

    return () => {
      active = false;
    };
  }, [datasourceUid, defaultRefId, onChange, value]);

  if (!datasourceUid) {
    return (
      <Field label={label} description={description}>
        <Alert title="Select a data source first" severity="info" />
      </Field>
    );
  }

  if (loadState.loading) {
    return (
      <Field label={label} description={description}>
        <LoadingPlaceholder text="Loading query editor" />
      </Field>
    );
  }

  if (loadState.error) {
    return (
      <Stack direction="column" gap={1}>
        <Alert title="Unable to load query editor" severity="error">
          {loadState.error}
        </Alert>
        <QueryJsonEditor description={description} label={label} onChange={onChange} placeholder={placeholder} value={value} />
      </Stack>
    );
  }

  const datasource = loadState.datasource;
  const QueryEditor = datasource?.components?.QueryEditor;

  if (!datasource || !QueryEditor) {
    return (
      <Stack direction="column" gap={1}>
        <Alert title="This data source does not expose a query editor" severity="warning" />
        <QueryJsonEditor description={description} label={label} onChange={onChange} placeholder={placeholder} value={value} />
      </Stack>
    );
  }

  const query = value ?? getDefaultQuery(datasource, defaultRefId);

  return (
    <section className={styles.queryEditorSection}>
      <div>
        <h3 className={styles.queryEditorTitle}>{label}</h3>
        <p className={styles.queryEditorDescription}>{description}</p>
      </div>
      <div className={styles.queryEditorFrame}>
        <QueryEditor
          app={CoreApp.Unknown}
          datasource={datasource}
          onChange={onChange}
          onRunQuery={() => {}}
          queries={[query]}
          query={query}
          range={range}
        />
      </div>
    </section>
  );
}

function SourceConfigEditor({ description, kind, onChange, title, value }: SourceConfigEditorProps) {
  const styles = useStyles2(getStyles);
  const scopedIdName = kind === 'document' ? 'documentId' : 'schemaId';
  const updateSource = useCallback(
    (patch: Partial<NormalizedQueryBackedSourceConfig>) => onChange({ ...value, ...patch }),
    [onChange, value]
  );
  const onDatasourceChange = useCallback(
    (datasource: DataSourceInstanceSettings) =>
      updateSource({ datasourceUid: datasource.uid, detailQuery: undefined, listQuery: undefined }),
    [updateSource]
  );
  const onFieldChange = useCallback(
    (field: 'idField' | 'titleField' | 'jsonField') => (event: ChangeEvent<HTMLInputElement>) => {
      updateSource({ [field]: event.currentTarget.value });
    },
    [updateSource]
  );

  return (
    <section className={styles.configSection}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>{title}</h2>
          <p className={styles.sectionDescription}>{description}</p>
        </div>
        <Switch
          aria-label={`Enable ${title}`}
          value={value.enabled}
          onChange={(event) => updateSource({ enabled: event.currentTarget.checked })}
        />
      </div>

      {value.enabled && (
        <Stack direction="column" gap={2}>
          <Field label="Data source" description="The configured datasource runs the list and optional detail queries.">
            <DataSourcePicker
              current={value.datasourceUid ?? null}
              noDefault
              onChange={onDatasourceChange}
              placeholder="Select data source"
              width={40}
            />
          </Field>

          <DataSourceQueryEditor
            datasourceUid={value.datasourceUid}
            defaultRefId="A"
            label="List query"
            description="Returns selectable rows. Required fields are id/title plus the content field when no detail query is configured."
            placeholder={'{\n  "refId": "A"\n}'}
            value={value.listQuery}
            onChange={(listQuery) => updateSource({ listQuery })}
          />

          <DataSourceQueryEditor
            datasourceUid={value.datasourceUid}
            defaultRefId="B"
            label="Detail query"
            description={`Optional. Runs after selection and receives $${scopedIdName} as a scoped variable. If empty, the list row content field is used.`}
            placeholder={`{\n  "refId": "B"\n}`}
            value={value.detailQuery}
            onChange={(detailQuery) => updateSource({ detailQuery })}
          />

          <div className={styles.fieldGrid}>
            <Field label="ID field">
              <Input value={value.idField} onChange={onFieldChange('idField')} />
            </Field>
            <Field label="Title field">
              <Input value={value.titleField} onChange={onFieldChange('titleField')} />
            </Field>
            <Field label="Content field">
              <Input value={value.jsonField} onChange={onFieldChange('jsonField')} />
            </Field>
          </div>
        </Stack>
      )}
    </section>
  );
}

const AppConfig = ({ plugin }: AppConfigProps) => {
  const styles = useStyles2(getStyles);
  const [savedConfig, setSavedConfig] = useState<NormalizedJsonSchemaFormAppConfig>(() => normalizeAppConfig(plugin.meta.jsonData));
  const [draftConfig, setDraftConfig] = useState<NormalizedJsonSchemaFormAppConfig>(savedConfig);
  const [saveState, setSaveState] = useState<{ severity: 'success' | 'error'; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const updateDocumentSource = useCallback((documentSource: NormalizedQueryBackedSourceConfig) => {
    setDraftConfig((current) => ({ ...current, documentSource }));
    setSaveState(null);
  }, []);

  const updateSchemaSource = useCallback((schemaSource: NormalizedQueryBackedSourceConfig) => {
    setDraftConfig((current) => ({ ...current, schemaSource }));
    setSaveState(null);
  }, []);

  const reset = useCallback(() => {
    setDraftConfig(savedConfig);
    setSaveState(null);
  }, [savedConfig]);

  const save = useCallback(async () => {
    setIsSaving(true);
    setSaveState(null);

    try {
      const jsonData = compactAppConfig(draftConfig);

      await lastValueFrom(
        getBackendSrv().fetch({
          data: {
            enabled: true,
            jsonData,
          },
          method: 'POST',
          url: `/api/plugins/${plugin.meta.id}/settings`,
        })
      );

      setSavedConfig(normalizeAppConfig(jsonData));
      setSaveState({ severity: 'success', message: 'Configuration saved.' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to save configuration.';
      setSaveState({ severity: 'error', message });
    } finally {
      setIsSaving(false);
    }
  }, [draftConfig, plugin.meta]);

  return (
    <div className={styles.page} data-testid={testIds.appConfig.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>JSON Schema Form configuration</h1>
        <Stack gap={1}>
          <Button type="button" variant="secondary" fill="outline" onClick={reset} disabled={isSaving}>
            Reset
          </Button>
          <Button type="button" variant="primary" onClick={save} disabled={isSaving} icon={isSaving ? 'spinner' : 'save'}>
            Save
          </Button>
        </Stack>
      </div>

      {saveState && <Alert title={saveState.message} severity={saveState.severity} />}

      <SourceConfigEditor
        kind="document"
        title="Document source"
        description="Provides selectable JSON or YAML documents by ID. URL parameters can select only IDs returned by this query."
        value={draftConfig.documentSource}
        onChange={updateDocumentSource}
      />

      <SourceConfigEditor
        kind="schema"
        title="Schema source"
        description="Provides selectable JSON or YAML schemas by ID. Arbitrary schema URLs are not accepted."
        value={draftConfig.schemaSource}
        onChange={updateSchemaSource}
      />
    </div>
  );
};

export default AppConfig;

const getStyles = (theme: GrafanaTheme2) => ({
  page: css({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(2),
    padding: theme.spacing(2),
  }),
  header: css({
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'space-between',
  }),
  title: css({
    color: theme.colors.text.primary,
    fontSize: theme.typography.h2.fontSize,
    fontWeight: theme.typography.fontWeightMedium,
    lineHeight: 1.2,
    margin: 0,
  }),
  configSection: css({
    background: theme.colors.background.primary,
    border: `1px solid ${theme.colors.border.weak}`,
    borderRadius: theme.shape.radius.default,
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(2),
    padding: theme.spacing(2),
  }),
  sectionHeader: css({
    alignItems: 'flex-start',
    display: 'flex',
    gap: theme.spacing(2),
    justifyContent: 'space-between',
  }),
  sectionTitle: css({
    color: theme.colors.text.primary,
    fontSize: theme.typography.h4.fontSize,
    fontWeight: theme.typography.fontWeightMedium,
    lineHeight: 1.2,
    margin: 0,
  }),
  sectionDescription: css({
    color: theme.colors.text.secondary,
    margin: `${theme.spacing(0.5)} 0 0`,
  }),
  fieldGrid: css({
    display: 'grid',
    gap: theme.spacing(2),
    gridTemplateColumns: 'repeat(3, minmax(160px, 1fr))',

    [theme.breakpoints.down('md')]: {
      gridTemplateColumns: '1fr',
    },
  }),
  queryEditorSection: css({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1),
  }),
  queryEditorTitle: css({
    color: theme.colors.text.primary,
    fontSize: theme.typography.h5.fontSize,
    fontWeight: theme.typography.fontWeightMedium,
    margin: 0,
  }),
  queryEditorDescription: css({
    color: theme.colors.text.secondary,
    margin: `${theme.spacing(0.5)} 0 0`,
  }),
  queryEditorFrame: css({
    border: `1px solid ${theme.colors.border.weak}`,
    borderRadius: theme.shape.radius.default,
    padding: theme.spacing(1.5),
  }),
});
