import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { AppRootProps } from '@grafana/data';
import { JsonSchemaFormAppConfig } from '../../appConfig';
import { ROUTES } from '../../constants';
const FormEditorPage = React.lazy(() => import('../../pages/FormEditorPage'));

function App(props: AppRootProps<JsonSchemaFormAppConfig>) {
  return (
    <Routes>
      <Route path={ROUTES.Editor} element={<FormEditorPage config={props.meta.jsonData} />} />
      <Route path="*" element={<FormEditorPage config={props.meta.jsonData} />} />
    </Routes>
  );
}

export default App;
