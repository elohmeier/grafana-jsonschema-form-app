import React from 'react';
import { PluginConfigPageProps, AppPluginMeta } from '@grafana/data';
import { Alert } from '@grafana/ui';

import { testIds } from '../testIds';

export interface AppConfigProps extends PluginConfigPageProps<AppPluginMeta> {}

const AppConfig = ({ plugin }: AppConfigProps) => {
  return (
    <div data-testid={testIds.appConfig.container}>
      <Alert title={`${plugin.meta.name} has no required settings`} severity="info" />
    </div>
  );
};

export default AppConfig;
