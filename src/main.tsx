import { createRoot } from 'react-dom/client'
import React from 'react';
import { createRoot as createReactRoot } from 'react-dom/client';
import './utils/patchResizeObserver';
import './utils/suppressResizeObserverError';
import './integrations/sentry';
import App from './App.tsx';
import './index.css';

const rootEl = document.getElementById('root');
if (rootEl) {
  createReactRoot(rootEl).render(<App />);
}
