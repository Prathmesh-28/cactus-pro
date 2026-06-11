import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { initNative } from './lib/nativeBridge';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Initialise the native shell (status bar, splash hide, back button). No-op on web.
initNative();
