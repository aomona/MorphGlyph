import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './style.css';

const root = createRoot(document.getElementById('root')!);
if (import.meta.env.DEV && new URLSearchParams(location.search).has('test')) {
  void import('./Harness').then(({ Harness }) =>
    root.render(
      <StrictMode>
        <Harness />
      </StrictMode>,
    ),
  );
} else
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
