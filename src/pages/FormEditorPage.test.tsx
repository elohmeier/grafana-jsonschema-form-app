import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { JsonSchemaFormAppConfig } from '../appConfig';
import { testIds } from '../components/testIds';
import { loadSourceRows, resolveSourceJson, type QuerySourceRow } from '../querySources';
import FormEditorPage from './FormEditorPage';

jest.mock('@rjsf/validator-ajv8', () => ({
  customizeValidator: jest.fn(() => ({})),
}));

jest.mock('@grafana/runtime', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const actual = jest.requireActual<typeof import('@grafana/runtime')>('@grafana/runtime');

  function MockPluginPage({ children }: { children: import('react').ReactNode }) {
    return React.createElement('div', null, children);
  }

  return {
    ...actual,
    getAppEvents: () => ({ publish: jest.fn() }),
    PluginPage: MockPluginPage,
  };
});

jest.mock('@grafana/ui', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const actual = jest.requireActual<typeof import('@grafana/ui')>('@grafana/ui');

  type MockCodeEditorProps = {
    language: string;
    onChange?: (value: string) => void;
    value: string;
  };

  type MockComboboxOption = {
    label: string;
    value?: string;
  };

  type MockComboboxProps = {
    disabled?: boolean;
    onChange: (item: MockComboboxOption) => void;
    options: MockComboboxOption[];
    placeholder?: string;
    value?: MockComboboxOption | null;
  };

  function MockCodeEditor({ language, onChange, value }: MockCodeEditorProps) {
    return React.createElement('textarea', {
      'data-language': language,
      'data-testid': 'mock-code-editor',
      onChange: (event: { currentTarget: { value: string } }) => onChange?.(event.currentTarget.value),
      value,
    });
  }

  function MockCombobox({ disabled, onChange, options, placeholder, value }: MockComboboxProps) {
    return React.createElement(
      'select',
      {
        'aria-label': placeholder,
        disabled,
        onChange: (event: { currentTarget: { value: string } }) => {
          const selected = options.find((option) => option.value === event.currentTarget.value);

          if (selected) {
            onChange(selected);
          }
        },
        value: value?.value ?? '',
      },
      [
        React.createElement('option', { key: '', value: '' }, placeholder ?? 'Select'),
        ...options.map((option) => React.createElement('option', { key: option.value, value: option.value }, option.label)),
      ]
    );
  }

  return {
    ...actual,
    CodeEditor: MockCodeEditor,
    Combobox: MockCombobox,
  };
});

jest.mock('../querySources', () => ({
  loadSourceRows: jest.fn(),
  resolveSourceJson: jest.fn(),
}));

jest.mock('../rjsf/GrafanaTheme', () => {
  const React = jest.requireActual<typeof import('react')>('react');

  function MockGrafanaJsonSchemaForm() {
    return React.createElement('div', { 'data-testid': 'mock-form-preview' });
  }

  return MockGrafanaJsonSchemaForm;
});

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, reject, resolve };
}

function editorValue() {
  return (screen.getByTestId('mock-code-editor') as HTMLTextAreaElement).value;
}

const config: JsonSchemaFormAppConfig = {
  defaultFormat: 'json',
  documentSource: {
    datasourceUid: 'test-datasource',
    enabled: true,
    listQuery: { refId: 'A' },
  },
};

const rows: QuerySourceRow[] = [
  {
    id: 'first',
    jsonValue: '{"name":"first"}',
    title: 'First document',
    values: {},
  },
  {
    id: 'second',
    jsonValue: '{"name":"second"}',
    title: 'Second document',
    values: {},
  },
];

describe('FormEditorPage', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.mocked(loadSourceRows).mockResolvedValue(rows);
  });

  it('clears the previous document data while a new document is selected', async () => {
    const secondDocument = createDeferred<unknown>();

    jest.mocked(resolveSourceJson).mockImplementation((_source, _kind, row) => {
      if (row.id === 'first') {
        return Promise.resolve({ name: 'first' });
      }

      if (row.id === 'second') {
        return secondDocument.promise;
      }

      return Promise.reject(new Error(`Unexpected row ${row.id}`));
    });

    render(
      <MemoryRouter initialEntries={['/editor?tab=data']} future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <FormEditorPage config={config} />
      </MemoryRouter>
    );

    const documentSelect = await screen.findByRole('combobox', { name: 'Select document' });

    fireEvent.change(documentSelect, { target: { value: 'first' } });

    await waitFor(() => expect(editorValue()).toContain('"first"'));

    fireEvent.change(documentSelect, { target: { value: 'second' } });

    await waitFor(() => expect(screen.queryByTestId('mock-code-editor')).not.toBeInTheDocument());
    expect(screen.getByText('Loading selection...')).toBeInTheDocument();

    await act(async () => {
      secondDocument.reject(new Error('Selected document failed'));
      await secondDocument.promise.catch(() => undefined);
    });

    await screen.findByText('Selected document failed');
    await waitFor(() => expect(editorValue()).toBe('{}'));
    expect(editorValue()).not.toContain('"first"');
    expect(screen.getByTestId(testIds.editor.formDataEditor)).toBeInTheDocument();
  });
});
