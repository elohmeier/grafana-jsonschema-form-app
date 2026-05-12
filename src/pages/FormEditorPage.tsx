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
  description:
    'A richer sample that exercises nested objects, arrays, enums, oneOf/anyOf/allOf branches, dependencies, formats, files, secrets, and metadata.',
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
    internalId: {
      type: 'string',
      title: 'Internal ID',
      default: 'policy-checkout-latency',
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
                format: 'time',
                pattern: '^([01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$',
              },
              end: {
                type: 'string',
                title: 'End time',
                format: 'time',
                pattern: '^([01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$',
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
    schedule: {
      type: 'object',
      title: 'Schedule',
      required: ['startsOn', 'reviewAt', 'quietHoursStart'],
      properties: {
        startsOn: {
          type: 'string',
          title: 'Starts on',
          format: 'date',
        },
        reviewAt: {
          type: 'string',
          title: 'Review at',
          format: 'date-time',
        },
        quietHoursStart: {
          type: 'string',
          title: 'Quiet hours start',
          format: 'time',
        },
        maintenanceContact: {
          title: 'Maintenance contact',
          anyOf: [
            {
              title: 'No contact',
              type: 'null',
            },
            {
              title: 'Email contact',
              type: 'string',
              format: 'email',
            },
          ],
        },
      },
    },
    incidentAutomation: {
      type: 'object',
      title: 'Incident automation',
      properties: {
        createIncident: {
          type: 'boolean',
          title: 'Create incident',
          default: true,
        },
      },
      dependencies: {
        createIncident: {
          oneOf: [
            {
              title: 'Do not create incidents',
              properties: {
                createIncident: {
                  enum: [false],
                },
              },
            },
            {
              title: 'Create incidents',
              required: ['priority', 'dedupeKey'],
              properties: {
                createIncident: {
                  enum: [true],
                },
                priority: {
                  type: 'string',
                  title: 'Priority',
                  enum: ['P1', 'P2', 'P3'],
                },
                dedupeKey: {
                  type: 'string',
                  title: 'Dedupe key',
                },
              },
            },
          ],
        },
      },
    },
    credentials: {
      type: 'object',
      title: 'Credentials',
      properties: {
        apiToken: {
          type: 'string',
          title: 'API token',
          minLength: 8,
        },
        sharedSecret: {
          type: 'string',
          title: 'Shared secret',
        },
      },
    },
    evidence: {
      type: 'object',
      title: 'Evidence',
      properties: {
        samplePayload: {
          type: 'string',
          title: 'Sample payload',
          format: 'data-url',
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
    labels: {
      title: 'Labels',
      allOf: [
        {
          type: 'object',
          title: 'Deployment labels',
          required: ['environment', 'region'],
          properties: {
            environment: {
              type: 'string',
              title: 'Environment',
              enum: ['dev', 'staging', 'prod'],
            },
            region: {
              type: 'string',
              title: 'Region',
              enum: ['us-east-1', 'us-west-2', 'eu-central-1'],
            },
          },
        },
        {
          type: 'object',
          title: 'Ownership labels',
          properties: {
            costCenter: {
              type: 'string',
              title: 'Cost center',
            },
            dataClassification: {
              type: 'string',
              title: 'Data classification',
              enum: ['public', 'internal', 'confidential', 'restricted'],
            },
          },
        },
      ],
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
  'ui:order': [
    'name',
    'internalId',
    'enabled',
    'severity',
    'owner',
    'routing',
    'escalation',
    'schedule',
    'incidentAutomation',
    'credentials',
    'evidence',
    'runbook',
    'labels',
    'annotations',
    '*',
  ],
  internalId: {
    'ui:widget': 'hidden',
  },
  enabled: {
    'ui:widget': 'switch',
  },
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
        start: {
          'ui:widget': 'time',
        },
        end: {
          'ui:widget': 'time',
        },
      },
    },
  },
  escalation: {
    repeatInterval: {
      'ui:widget': 'range',
    },
  },
  schedule: {
    startsOn: {
      'ui:widget': 'date',
    },
    reviewAt: {
      'ui:widget': 'date-time',
      'ui:options': {
        showSeconds: true,
      },
    },
    quietHoursStart: {
      'ui:widget': 'time',
    },
  },
  incidentAutomation: {
    createIncident: {
      'ui:widget': 'switch',
    },
  },
  credentials: {
    apiToken: {
      'ui:widget': 'password',
    },
    sharedSecret: {
      'ui:widget': 'secret',
    },
  },
  evidence: {
    samplePayload: {
      'ui:widget': 'file',
      'ui:options': {
        accept: 'application/json',
      },
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
  internalId: 'policy-checkout-latency',
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
        start: '01:00:00',
        end: '03:00:00',
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
  schedule: {
    startsOn: '2026-06-01',
    reviewAt: '2026-06-15T09:30:00Z',
    quietHoursStart: '22:00:00',
    maintenanceContact: 'maintenance@example.com',
  },
  incidentAutomation: {
    createIncident: true,
    priority: 'P1',
    dedupeKey: 'checkout-latency-prod',
  },
  credentials: {
    apiToken: 'example-token',
    sharedSecret: 'already-configured',
  },
  evidence: {
    samplePayload: 'data:application/json;base64,eyJzZXJ2aWNlIjoiY2hlY2tvdXQiLCJsYXRlbmN5TXMiOjEyMzR9',
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
  labels: {
    environment: 'prod',
    region: 'eu-central-1',
    costCenter: 'cc-payments-042',
    dataClassification: 'confidential',
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
