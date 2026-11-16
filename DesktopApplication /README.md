# Startup-AYUSH Desktop

A standalone Electron + React demonstration application for the Startup-AYUSH AYUSH ecosystem portal.

## Requirements

- macOS, Windows or Linux
- Node.js 18 or newer
- npm

## Install and run

```bash
cd /Users/pratyushgupta/Desktop/majorProject/mobileApplication
npm install
npm run dev
```

## Demo accounts

| Account       | Email                     | Password   |
| ------------- | ------------------------- | ---------- |
| Administrator | `admin@startupayush.demo` | `Demo@123` |
| Stakeholder   | `user@startupayush.demo`  | `Demo@123` |

New accounts can also be registered locally. Demo authentication is deliberately simple and is not production authentication.

## Useful scripts

- `npm run dev` - start Vite and Electron
- `npm run build` - compile the React renderer
- `npm test` - execute focused business-logic tests
- `npm run dist` - create a macOS application and DMG

## Project structure

- `electron/main.js` - desktop window and app lifecycle
- `electron/preload.js` - controlled preload API
- `src/App.jsx` - application shell and navigation
- `src/context/AppContext.jsx` - shared React state and local persistence
- `src/services/businessLogic.js` - event and validation rules
- `src/pages/` - feature screens
- `src/components/UI.jsx` - reusable dialogs, notifications and empty states
- `src/data/demoData.js` - initial realistic demo data
- `src/utils/storage.js` - localStorage read/write utility
- `src/styles/app.css` - application-wide macOS-style styling

## Persistence and scope

This application stores its own demo records in `localStorage`. It does not modify or synchronize with the parent project's PostgreSQL database, Prisma schema or backend. Use Settings > Reset demo data only after confirmation.

For viva evidence, see `APPLICATION_VIVA_PROJECT_STATUS.md`, `APPLICATION_VIVA_FINAL_SCRIPT.md`, and `APPLICATION_VIVA_RECORDING_CHECKLIST.md`.
