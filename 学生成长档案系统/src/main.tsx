/* eslint-disable react-refresh/only-export-components */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router';
import { App } from './App';
import { AuthProvider } from './auth/AuthProvider';
import './styles.css';

const Router = window.archiveDesktop || import.meta.env.VITE_STATIC_PAGES === 'true' ? HashRouter : BrowserRouter;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
      <AuthProvider><App /></AuthProvider>
    </Router>
  </StrictMode>,
);
