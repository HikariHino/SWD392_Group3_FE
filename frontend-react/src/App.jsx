import React from 'react';
import AppRoutes from './routes';
import { AuthProvider } from './context/AuthContext';
import { ExamProvider } from './context/ExamContext';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <ExamProvider>
        <AppRoutes />
      </ExamProvider>
    </AuthProvider>
  );
}

export default App;
