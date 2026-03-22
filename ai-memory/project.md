# Project Memory

## Purpose
A web-based WhatsApp messaging platform MVP that allows users to send messages to individual contacts, groups, and channels.

## Architecture
- **Frontend**: React, Vite, Tailwind CSS, React Router, i18next (Arabic default, English fallback).
- **Backend**: Node.js, Express, Better-SQLite3, Multer, Axios.
- **Database**: SQLite (local file `whatsapp.db`).

## Development Workflow
- `npm run dev` starts the Express server which also serves the Vite frontend in development mode.
- The backend acts as a proxy to the external WhatsApp API, hiding credentials and normalizing data.

## File Structure
- `server.ts`: Express server entry point.
- `server/db.ts`: SQLite database initialization.
- `server/services/whatsapp.ts`: External API wrapper.
- `src/`: React frontend source code.
- `src/i18n.ts`: i18next configuration.
- `src/locales/`: Translation files (ar.json, en.json).
- `src/components/`: Reusable UI components.
- `src/pages/`: Application views (Sessions, Targets, Compose, Logs).

## Current Status
- MVP foundation is built.
- Session management (init, status, scan) is implemented.
- Target management (sync groups, sync channels, add contact) is implemented.
- Message composer (text, media, attachments) is implemented.
- Message logs (view history) is implemented.
- i18n (Arabic/English) is set up.
