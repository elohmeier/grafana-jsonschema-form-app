import React from 'react';
import { render, screen } from '@testing-library/react';
import { PluginType } from '@grafana/data';
import AppConfig, { AppConfigProps } from './AppConfig';
import { testIds } from 'components/testIds';

describe('Components/AppConfig', () => {
  let props: AppConfigProps;

  beforeEach(() => {
    jest.resetAllMocks();

    props = {
      plugin: {
        meta: {
          id: 'g42-jsonschemaform-app',
          name: 'JSON Schema Form',
          type: PluginType.app,
          enabled: true,
          jsonData: {},
        },
      },
      query: {},
    } as unknown as AppConfigProps;
  });

  test('renders the empty settings state', () => {
    render(<AppConfig plugin={props.plugin} query={props.query} />);

    expect(screen.queryByTestId(testIds.appConfig.container)).toBeInTheDocument();
    expect(screen.queryByText(/has no required settings/i)).toBeInTheDocument();
  });
});
