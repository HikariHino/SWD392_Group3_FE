import React from 'react';
import { App as AntApp, ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';
import AppRoutes from './routes';
import { AuthProvider } from './context/AuthContext';
import { ExamProvider } from './context/ExamContext';
import './App.css';

function App() {
  return (
    <ConfigProvider locale={viVN}>
      <AntApp>
        <AuthProvider>
          <ExamProvider>
            <AppRoutes />
          </ExamProvider>
        </AuthProvider>
      </AntApp>
    </ConfigProvider>
  );
}

export default App;
