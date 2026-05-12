import { NormalizedQueryBackedSourceConfig } from './appConfig';
import { QuerySourceRow, resolveSourceJson } from './querySources';

const source: NormalizedQueryBackedSourceConfig = {
  enabled: true,
  idField: 'id',
  jsonField: 'document',
  titleField: 'title',
};

function makeRow(jsonValue: unknown): QuerySourceRow {
  return {
    id: 'checkout',
    jsonValue,
    title: 'Checkout',
    values: {},
  };
}

describe('querySources', () => {
  it('resolves JSON text from a row', async () => {
    await expect(resolveSourceJson(source, 'document', makeRow('{"name":"checkout"}'))).resolves.toEqual({
      name: 'checkout',
    });
  });

  it('resolves YAML text from a row', async () => {
    await expect(resolveSourceJson(source, 'document', makeRow('name: checkout\nenabled: true\n'))).resolves.toEqual({
      enabled: true,
      name: 'checkout',
    });
  });

  it('returns object values without reparsing', async () => {
    const value = { enabled: true, name: 'checkout' };

    await expect(resolveSourceJson(source, 'document', makeRow(value))).resolves.toBe(value);
  });

  it('reports invalid text as JSON/YAML', async () => {
    await expect(resolveSourceJson(source, 'document', makeRow('name: [unterminated'))).rejects.toThrow(
      /contains invalid JSON\/YAML/
    );
  });
});
