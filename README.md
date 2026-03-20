# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

## AI Assistant Setup

This project includes an AI-backed client support assistant:

- Frontend widget: `src/components/ClientHelpWidget.tsx`
- Backend endpoint: `api/ai/chat.ts`

### Required environment variables

Set these in your local `.env` and Vercel project settings:

- `OPENAI_API_KEY` (optional)
- `OPENAI_MODEL` (optional, default: `gpt-4o-mini`)
- `SERPER_API_KEY` (optional, enables web search enrichment)

If `OPENAI_API_KEY` is missing, the endpoint automatically uses a free no-key provider fallback.
If `SERPER_API_KEY` is set, the assistant can enrich some answers with live web search results.

The endpoint path is:

- `POST /api/ai/chat`

If the AI endpoint fails, the widget automatically falls back to built-in quick support responses.

## Booking Receipt Email (Auto-Send)

After successful booking confirmation, the app now triggers a receipt email to the client.

- Frontend trigger: [src/services/receipt.ts](src/services/receipt.ts)
- Booking hook point: [src/components/BookingForm.tsx](src/components/BookingForm.tsx)
- Supabase Edge Function: [supabase/functions/send-booking-receipt/index.ts](supabase/functions/send-booking-receipt/index.ts)

### Deploy and configure

1. Deploy the function:

```bash
supabase functions deploy send-booking-receipt
```

2. Set required Supabase secrets:

```bash
supabase secrets set RESEND_API_KEY=your_resend_api_key
supabase secrets set RECEIPT_FROM_EMAIL="ApexGolf Africa <bookings@apexgolf.africa>"
```

3. Ensure your sender domain/email is verified in Resend.

Notes:
- The receipt sender is non-blocking. Booking success is not interrupted if email delivery fails.
- Keep API keys only in Supabase secrets, never in frontend environment variables.
