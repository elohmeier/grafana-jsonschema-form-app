import { dateTime } from '@grafana/data';

import { formatJsonSchemaTime } from './time';

describe('formatJsonSchemaTime', () => {
  it('keeps seconds for JSON Schema time values even when the picker hides seconds', () => {
    expect(formatJsonSchemaTime(dateTime('1970-01-01T09:30:00Z'), false)).toBe('09:30:00');
  });
});
