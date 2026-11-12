import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Prevent benign Vite dev WebSocket connection warnings from triggering unhandled rejection overlays
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const msg = String(event.reason?.message || event.reason || '');
    if (msg.includes('WebSocket closed without opened') || msg.includes('[vite]')) {
      event.preventDefault();
    }
  });
}

createRoot(document.getElementById('root')!).render(<App />);

