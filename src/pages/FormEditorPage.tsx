import React, { useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/css';
import { GrafanaTheme2 } from '@grafana/data';
import { Alert, Button, CodeEditor, Stack, useStyles2 } from '@grafana/ui';
import { IChangeEvent } from '@rjsf/core';
import { RJSFSchema, UiSchema } from '@rjsf/utils';
import validator from '@rjsf/validator-ajv8';

import { testIds } from '../components/testIds';
import GrafanaJsonSchemaForm from '../rjsf/GrafanaTheme';

const sampleSchema: RJSFSchema = {
  title: 'Alert routing policy',
  description: 'A richer sample that exercises nested objects, arrays, enums, oneOf branches, formats, and metadata.',
  type: 'object',
  required: ['name', 'owner', 'severity', 'routing', 'escalation'],
  additionalProperties: {
    type: 'string',
    title: 'Metadata value',
  },
  properties: {
    name: {
      type: 'string',
      title: 'Policy name',
      minLength: 3,
    },
    severity: {
      type: 'string',
      title: 'Default severity',
      enum: ['info', 'warning', 'critical'],
      default: 'warning',
    },
    enabled: {
      type: 'boolean',
      title: 'Enabled',
      default: true,
    },
    owner: {
      type: 'object',
      title: 'Owner',
      required: ['team', 'email'],
      properties: {
        team: {
          type: 'string',
          title: 'Team',
          enum: ['platform', 'payments', 'observability', 'security'],
        },
        email: {
          type: 'string',
          title: 'Email',
          format: 'email',
        },
        serviceUrl: {
          type: 'string',
          title: 'Service URL',
          format: 'uri',
        },
      },
    },
    routing: {
      type: 'object',
      title: 'Routing',
      required: ['matcher', 'evaluationWindow', 'notificationChannels'],
      properties: {
        matcher: {
          type: 'object',
          title: 'Alert matcher',
          required: ['datasource', 'query', 'reducer', 'threshold'],
          properties: {
            datasource: {
              type: 'string',
              title: 'Datasource',
              enum: ['prometheus-prod', 'loki-prod', 'tempo-prod'],
            },
            query: {
              type: 'string',
              title: 'Query',
              minLength: 1,
            },
            reducer: {
              type: 'string',
              title: 'Reducer',
              enum: ['avg', 'max', 'last', 'sum'],
              default: 'avg',
            },
            threshold: {
              type: 'number',
              title: 'Threshold',
              minimum: 0,
              maximum: 100,
              default: 80,
            },
          },
        },
        evaluationWindow: {
          type: 'integer',
          title: 'Evaluation window',
          description: 'Window in minutes.',
          minimum: 1,
          maximum: 120,
          default: 15,
        },
        notificationChannels: {
          type: 'array',
          title: 'Notification channels',
          minItems: 1,
          uniqueItems: true,
          items: {
            type: 'string',
            enum: ['email', 'slack', 'pagerduty', 'webhook'],
          },
        },
        muteTimings: {
          type: 'array',
          title: 'Mute timings',
          items: {
            type: 'object',
            required: ['name', 'weekdays', 'start', 'end'],
            properties: {
              name: {
                type: 'string',
                title: 'Name',
              },
              weekdays: {
                type: 'array',
                title: 'Weekdays',
                uniqueItems: true,
                items: {
                  type: 'string',
                  enum: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
                },
              },
              start: {
                type: 'string',
                title: 'Start time',
                pattern: '^([01][0-9]|2[0-3]):[0-5][0-9]$',
              },
              end: {
                type: 'string',
                title: 'End time',
                pattern: '^([01][0-9]|2[0-3]):[0-5][0-9]$',
              },
            },
          },
        },
      },
    },
    escalation: {
      type: 'object',
      title: 'Escalation',
      required: ['repeatInterval', 'steps'],
      properties: {
        repeatInterval: {
          type: 'integer',
          title: 'Repeat interval',
          description: 'Minutes between repeat notifications.',
          minimum: 5,
          maximum: 1440,
          default: 240,
        },
        steps: {
          type: 'array',
          title: 'Escalation steps',
          minItems: 1,
          items: {
            type: 'object',
            required: ['afterMinutes', 'target'],
            properties: {
              afterMinutes: {
                type: 'integer',
                title: 'After minutes',
                minimum: 0,
                maximum: 1440,
              },
              target: {
                title: 'Target',
                oneOf: [
                  {
                    title: 'Slack channel',
                    type: 'object',
                    required: ['type', 'channel'],
                    properties: {
                      type: {
                        type: 'string',
                        title: 'Type',
                        enum: ['slack'],
                        default: 'slack',
                      },
                      channel: {
                        type: 'string',
                        title: 'Channel',
                        enum: ['#alerts-platform', '#alerts-payments', '#alerts-security'],
                      },
                    },
                  },
                  {
                    title: 'PagerDuty service',
                    type: 'object',
                    required: ['type', 'service'],
                    properties: {
                      type: {
                        type: 'string',
                        title: 'Type',
                        enum: ['pagerduty'],
                        default: 'pagerduty',
                      },
                      service: {
                        type: 'string',
                        title: 'Service',
                        enum: ['platform-primary', 'payments-critical', 'security-response'],
                      },
                      urgency: {
                        type: 'string',
                        title: 'Urgency',
                        enum: ['low', 'high'],
                        default: 'high',
                      },
                    },
                  },
                  {
                    title: 'Webhook',
                    type: 'object',
                    required: ['type', 'url'],
                    properties: {
                      type: {
                        type: 'string',
                        title: 'Type',
                        enum: ['webhook'],
                        default: 'webhook',
                      },
                      url: {
                        type: 'string',
                        title: 'URL',
                        format: 'uri',
                      },
                      headers: {
                        type: 'object',
                        title: 'Headers',
                        additionalProperties: {
                          type: 'string',
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      },
    },
    runbook: {
      type: 'object',
      title: 'Runbook',
      properties: {
        summary: {
          type: 'string',
          title: 'Summary',
        },
        remediation: {
          type: 'string',
          title: 'Remediation',
        },
        links: {
          type: 'array',
          title: 'Links',
          items: {
            type: 'object',
            required: ['title', 'url'],
            properties: {
              title: {
                type: 'string',
                title: 'Title',
              },
              url: {
                type: 'string',
                title: 'URL',
                format: 'uri',
              },
            },
          },
        },
      },
    },
    annotations: {
      type: 'object',
      title: 'Annotations',
      additionalProperties: {
        type: 'string',
      },
    },
  },
};

const sampleUiSchema: UiSchema = {
  'ui:order': ['name', 'enabled', 'severity', 'owner', 'routing', 'escalation', 'runbook', 'annotations', '*'],
  severity: {
    'ui:widget': 'radio',
  },
  owner: {
    serviceUrl: {
      'ui:placeholder': 'https://grafana.example.com/d/services',
    },
  },
  routing: {
    matcher: {
      query: {
        'ui:widget': 'textarea',
        'ui:options': {
          rows: 4,
        },
      },
      threshold: {
        'ui:widget': 'range',
      },
    },
    notificationChannels: {
      'ui:placeholder': 'Select channels',
    },
    muteTimings: {
      items: {
        weekdays: {
          'ui:placeholder': 'Select weekdays',
        },
      },
    },
  },
  escalation: {
    repeatInterval: {
      'ui:widget': 'range',
    },
  },
  runbook: {
    remediation: {
      'ui:widget': 'textarea',
      'ui:options': {
        rows: 6,
      },
    },
  },
  'ui:submitButtonOptions': {
    submitText: 'Validate policy',
  },
};

const sampleFormData = {
  name: 'Checkout latency policy',
  severity: 'critical',
  enabled: true,
  owner: {
    team: 'payments',
    email: 'payments-oncall@example.com',
    serviceUrl: 'https://grafana.example.com/d/checkout/checkout-overview',
  },
  routing: {
    matcher: {
      datasource: 'prometheus-prod',
      query: 'histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{service="checkout"}[5m])) by (le))',
      reducer: 'last',
      threshold: 85,
    },
    evaluationWindow: 15,
    notificationChannels: ['slack', 'pagerduty'],
    muteTimings: [
      {
        name: 'Weekend maintenance',
        weekdays: ['sat', 'sun'],
        start: '01:00',
        end: '03:00',
      },
    ],
  },
  escalation: {
    repeatInterval: 240,
    steps: [
      {
        afterMinutes: 0,
        target: {
          type: 'slack',
          channel: '#alerts-payments',
        },
      },
      {
        afterMinutes: 15,
        target: {
          type: 'pagerduty',
          service: 'payments-critical',
          urgency: 'high',
        },
      },
    ],
  },
  runbook: {
    summary: 'Checkout latency is above the customer-impacting threshold.',
    remediation: 'Check upstream payment provider latency, recent deploys, queue depth, and checkout database saturation.',
    links: [
      {
        title: 'Checkout service dashboard',
        url: 'https://grafana.example.com/d/checkout/checkout-overview',
      },
    ],
  },
  annotations: {
    environment: 'prod',
    tier: 'customer-facing',
  },
};

function toJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

type JsonEditorPanelProps = {
  'data-testid': string;
  title: string;
  value: unknown;
  onValidChange: (value: any) => void;
};

function JsonEditorPanel({ 'data-testid': dataTestId, title, value, onValidChange }: JsonEditorPanelProps) {
  const styles = useStyles2(getStyles);
  const serializedValue = useMemo(() => toJson(value), [value]);
  const [draftState, setDraftState] = useState({
    source: serializedValue,
    draft: serializedValue,
    error: null as string | null,
  });
  const draft = draftState.source === serializedValue ? draftState.draft : serializedValue;
  const error = draftState.source === serializedValue ? draftState.error : null;

  const onChange = useCallback(
    (nextValue: string) => {
      let error: string | null = null;

      try {
        onValidChange(JSON.parse(nextValue));
      } catch (err) {
        error = err instanceof Error ? err.message : 'Invalid JSON';
      }

      setDraftState({ source: serializedValue, draft: nextValue, error });
    },
    [onValidChange, serializedValue]
  );

  return (
    <section className={styles.editorPanel} data-testid={dataTestId}>
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>{title}</h2>
        {error && <span className={styles.errorText}>{error}</span>}
      </div>
      <CodeEditor
        value={draft}
        language="json"
        height="260px"
        width="100%"
        showLineNumbers
        showMiniMap={false}
        onChange={onChange}
        monacoOptions={{
          scrollBeyondLastLine: false,
          alwaysConsumeMouseWheel: false,
        }}
      />
    </section>
  );
}

export default function FormEditorPage() {
  const styles = useStyles2(getStyles);
  const [schema, setSchema] = useState<RJSFSchema>(sampleSchema);
  const [uiSchema, setUiSchema] = useState<UiSchema>(sampleUiSchema);
  const [formData, setFormData] = useState<any>(sampleFormData);
  const [lastSubmit, setLastSubmit] = useState<string | null>(null);

  const onFormChange = useCallback(({ formData }: IChangeEvent) => {
    setFormData(formData);
    setLastSubmit(null);
  }, []);

  const reset = useCallback(() => {
    setSchema(sampleSchema);
    setUiSchema(sampleUiSchema);
    setFormData(sampleFormData);
    setLastSubmit(null);
  }, []);

  return (
    <div className={styles.page} data-testid={testIds.editor.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>JSON Schema Form</h1>
        <Button type="button" variant="secondary" fill="outline" icon="history" onClick={reset}>
          Reset
        </Button>
      </div>

      <div className={styles.workspace}>
        <div className={styles.editors}>
          <JsonEditorPanel
            title="Schema"
            value={schema}
            onValidChange={setSchema}
            data-testid={testIds.editor.schemaEditor}
          />
          <JsonEditorPanel
            title="UI schema"
            value={uiSchema}
            onValidChange={setUiSchema}
            data-testid={testIds.editor.uiSchemaEditor}
          />
          <JsonEditorPanel
            title="Form data"
            value={formData}
            onValidChange={setFormData}
            data-testid={testIds.editor.formDataEditor}
          />
        </div>

        <section className={styles.preview} data-testid={testIds.editor.preview}>
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>Preview</h2>
          </div>
          <Stack direction="column" gap={2}>
            {lastSubmit && <Alert title="Submitted" severity="success">{lastSubmit}</Alert>}
            <GrafanaJsonSchemaForm
              schema={schema}
              uiSchema={uiSchema}
              formData={formData}
              validator={validator}
              liveValidate
              showErrorList="top"
              onChange={onFormChange}
              onSubmit={(event) => setLastSubmit(toJson(event.formData))}
            />
          </Stack>
        </section>
      </div>
    </div>
  );
}

const getStyles = (theme: GrafanaTheme2) => ({
  page: css({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(2),
    minHeight: '100%',
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
  workspace: css({
    display: 'grid',
    gap: theme.spacing(2),
    gridTemplateColumns: 'minmax(360px, 0.95fr) minmax(380px, 1.05fr)',
    minHeight: 0,

    [theme.breakpoints.down('lg')]: {
      gridTemplateColumns: '1fr',
    },
  }),
  editors: css({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(2),
    minWidth: 0,
  }),
  editorPanel: css({
    background: theme.colors.background.primary,
    border: `1px solid ${theme.colors.border.weak}`,
    borderRadius: theme.shape.radius.default,
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1),
    minWidth: 0,
    padding: theme.spacing(1.5),
  }),
  preview: css({
    alignSelf: 'start',
    background: theme.colors.background.primary,
    border: `1px solid ${theme.colors.border.weak}`,
    borderRadius: theme.shape.radius.default,
    minWidth: 0,
    padding: theme.spacing(2),
  }),
  panelHeader: css({
    alignItems: 'center',
    display: 'flex',
    gap: theme.spacing(1),
    justifyContent: 'space-between',
    minHeight: theme.spacing(3),
  }),
  panelTitle: css({
    color: theme.colors.text.primary,
    fontSize: theme.typography.h5.fontSize,
    fontWeight: theme.typography.fontWeightMedium,
    margin: 0,
  }),
  errorText: css({
    color: theme.colors.error.text,
    fontSize: theme.typography.bodySmall.fontSize,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  }),
});
