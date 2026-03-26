import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './tailwind.css';

registerSW({ immediate: true });

const PWA_LAUNCH_PATH_KEY = 'apexgolf_pwa_launch_path';

const isStandalone =
  window.matchMedia('(display-mode: standalone)').matches ||
  ((window.navigator as Navigator & { standalone?: boolean }).standalone ?? false);

if (isStandalone) {
  const preferredPath = localStorage.getItem(PWA_LAUNCH_PATH_KEY);
  if (preferredPath && preferredPath.startsWith('/') && window.location.pathname === '/admin' && preferredPath !== '/admin') {
    window.history.replaceState({}, document.title, preferredPath);
  }
}

const hideSplashScreen = () => {
  const splash = document.getElementById('app-splash');
  if (!splash) return;

  splash.classList.add('app-splash-hide');
  window.setTimeout(() => {
    splash.remove();
  }, 420);
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

window.setTimeout(hideSplashScreen, 850);