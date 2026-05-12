import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { AppRootProps, PluginType } from '@grafana/data';
import { render, waitFor } from '@testing-library/react';
import App from './App';

jest.mock('../../pages/FormEditorPage', () => {
  const MockFormEditorPage = () => <div>JSON Schema Form</div>;
  MockFormEditorPage.displayName = 'MockFormEditorPage';

  return MockFormEditorPage;
});

describe('Components/App', () => {
  let props: AppRootProps;

  beforeEach(() => {
    jest.resetAllMocks();

    props = {
      basename: 'a/g42-jsonschemaform-app',
      meta: {
        id: 'g42-jsonschemaform-app',
        name: 'JSON Schema Form',
        type: PluginType.app,
        enabled: true,
        jsonData: {},
      },
      query: {},
      path: '',
      onNavChanged: jest.fn(),
    } as unknown as AppRootProps;
  });

  test('renders without an error"', async () => {
    const { queryByText } = render(
      <MemoryRouter>
        <App {...props} />
      </MemoryRouter>
    );

    await waitFor(() => expect(queryByText(/json schema form/i)).toBeInTheDocument(), { timeout: 2000 });
  });
});
