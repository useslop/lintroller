import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { startEngineWorker } from './run-import';
import './styles.css';

// Load the engine worker with the page, so reading a file later needs no request (and works offline).
startEngineWorker();

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
