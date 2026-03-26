import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apexgolf-logo.svg', 'apex-admin-icon.svg', 'apex-admin-maskable.svg'],
      manifest: {
        id: '/admin',
        name: 'ApexGolf Admin',
        short_name: 'ApexAdmin',
        description: 'Installable admin app for ApexGolf admins and super admins.',
        start_url: '/admin',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0F1F17',
        theme_color: '#0F1F17',
        shortcuts: [
          {
            name: 'Admin Console',
            short_name: 'Admin',
            description: 'Open ApexGolf Admin console',
            url: '/admin',
          },
          {
            name: 'Super Admin Console',
            short_name: 'Super Admin',
            description: 'Open ApexGolf Super Admin console',
            url: '/super-admin',
          },
        ],
        icons: [
          {
            src: '/apex-admin-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: '/apex-admin-maskable.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
});
