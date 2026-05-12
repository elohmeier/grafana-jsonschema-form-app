import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { AppRootProps } from '@grafana/data';
import { ROUTES } from '../../constants';
const FormEditorPage = React.lazy(() => import('../../pages/FormEditorPage'));

function App(props: AppRootProps) {
  void props;

  return (
    <Routes>
      <Route path={ROUTES.Editor} element={<FormEditorPage />} />
      <Route path="*" element={<FormEditorPage />} />
    </Routes>
  );
}

export default App;
