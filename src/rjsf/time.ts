import { DateTime } from '@grafana/data';

export function formatJsonSchemaTime(value: DateTime, showSeconds: boolean) {
  return value.format('HH:mm:ss');
}
