import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './tailwind.css';

registerSW({ immediate: true });

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