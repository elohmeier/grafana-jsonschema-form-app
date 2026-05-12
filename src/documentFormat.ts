import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

export type DocumentFormat = 'json' | 'yaml';
export type DocumentInputFormat = DocumentFormat | 'auto';

export function parseDocument(value: string, format: DocumentInputFormat = 'auto'): unknown {
  if (!value.trim()) {
    throw new Error('Document is empty.');
  }

  if (format === 'json') {
    return JSON.parse(value);
  }

  if (format === 'yaml') {
    return parseYaml(value);
  }

  try {
    return JSON.parse(value);
  } catch {
    return parseYaml(value);
  }
}

export function stringifyDocument(value: unknown, format: DocumentFormat): string {
  return format === 'yaml' ? stringifyYaml(value) : JSON.stringify(value, null, 2);
}

export function getDocumentFormatLabel(format: DocumentFormat): string {
  return format === 'yaml' ? 'YAML' : 'JSON';
}
