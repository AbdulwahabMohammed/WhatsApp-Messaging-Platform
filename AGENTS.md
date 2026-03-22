# AI Agent Guide: WhatsApp Messaging Platform

## Overview
This project is a web-based WhatsApp messaging platform MVP. It allows users to initialize WhatsApp sessions, sync groups and channels, and send text, media, and attachments to individuals, groups, and channels.

## Architecture
- **Frontend**: React (Vite), Tailwind CSS, React Router, i18next (Arabic default, English fallback).
- **Backend**: Node.js, Express, Better-SQLite3, Multer (for file uploads), Axios (for external API calls).
- **Database**: SQLite (local file `whatsapp.db`).

## External API Mapping
The backend acts as a proxy/wrapper for the external WhatsApp API to hide credentials and normalize data.

| Internal Endpoint | External Endpoint | Purpose |
| :--- | :--- | :--- |
| `POST /api/sessions/init` | `POST /sessions/init` | Initialize a new session |
| `GET /api/sessions/:id/status` | `GET /wa/status` | Check connection status |
| `GET /api/sessions/:id/scan` | `GET /wa/scan` | Get QR code URL |
| `POST /api/targets/groups/sync` | `GET /wa/groups` | Fetch and store groups |
| `POST /api/targets/channels/sync` | `GET /v3/channels` | Fetch and store channels |
| `POST /api/messages/send` | `POST /wa/send-text` (v1) <br> `POST /wa/send-media` <br> `POST /v3/channels/*` | Send text/media to person, group, or channel |

## Development Workflow
1. **Start the server**: Run `npm run dev` (uses `tsx server.ts`).
2. **Database**: The SQLite database is automatically created at `whatsapp.db` on startup.
3. **Environment Variables**:
   - `WHATSAPP_API_KEY`: The API key for the external service.
   - `WHATSAPP_API_URL`: The base URL for the external service.
   - `APP_URL`: The URL of this application (used for webhooks).

## Important Rules
- **i18n**: All UI text must be localized using `react-i18next`. Do not hardcode text in components.
- **RTL Support**: The UI must support RTL layout for Arabic.
- **Security**: Never expose the `WHATSAPP_API_KEY` to the frontend. All external API calls must go through the backend.
- **Idempotency**: Use UUIDs for `x-idempotency-key` when sending messages to prevent duplicates.

## Future Phases
- Implement robust retry logic for failed messages.
- Add support for advanced analytics and campaign management.
- Migrate from SQLite to PostgreSQL for scalability.
- Implement proper file storage (e.g., S3) instead of local disk.
