import { getDocumentFormatLabel, parseDocument, stringifyDocument } from './documentFormat';

describe('documentFormat', () => {
  it('parses JSON documents', () => {
    expect(parseDocument('{"name":"checkout","enabled":true}', 'json')).toEqual({
      enabled: true,
      name: 'checkout',
    });
  });

  it('parses YAML documents', () => {
    expect(parseDocument('name: checkout\nenabled: true\nchannels:\n  - email\n', 'yaml')).toEqual({
      channels: ['email'],
      enabled: true,
      name: 'checkout',
    });
  });

  it('auto-detects JSON before YAML', () => {
    expect(parseDocument('{"threshold": 80}', 'auto')).toEqual({ threshold: 80 });
    expect(parseDocument('threshold: 80', 'auto')).toEqual({ threshold: 80 });
  });

  it('rejects an empty document', () => {
    expect(() => parseDocument('   ', 'yaml')).toThrow('Document is empty.');
  });

  it('stringifies documents in the selected format', () => {
    expect(stringifyDocument({ threshold: 80 }, 'json')).toBe('{\n  "threshold": 80\n}');
    expect(stringifyDocument({ threshold: 80 }, 'yaml')).toBe('threshold: 80\n');
  });

  it('returns display labels for formats', () => {
    expect(getDocumentFormatLabel('json')).toBe('JSON');
    expect(getDocumentFormatLabel('yaml')).toBe('YAML');
  });
});
