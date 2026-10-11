# mini-postman

A full-stack, Postman-inspired API workspace for composing, organizing, sending, and analyzing HTTP requests. It is a React + Express (MERN) application that persists everything in MongoDB.

## Built With

- [React 19](https://react.dev/) and [Vite 8](https://vite.dev/) for the frontend
- [Bun](https://bun.sh/) for workspace installation and JavaScript execution
- [Express 5](https://expressjs.com/) for the HTTP API
- [MongoDB](https://www.mongodb.com/) and [Mongoose](https://mongoosejs.com/) for persistence
- [Zod](https://zod.dev/) for request validation
- [JSON Web Tokens](https://jwt.io/) and [bcrypt](https://github.com/dcodeIO/bcrypt.js) for authentication

## Features

- **Workspaces** — create, rename, set default, and delete isolated workspaces; data is grouped per workspace.
- **Collections and folders** — nested collection/folder tree with create, rename, delete, duplicate, drag-and-drop reorder, and a non-empty delete guard.
- **Request builder** — request editor with method, URL, query params, headers, body (none/JSON/text/form data/URL-encoded), and auth (none/bearer/basic/API key).
- **Send and analyze** — real HTTP calls resolved against the active environment, with status, timing, size, headers, a collapsible JSON body, and in-body search.
- **Environments** — named variable sets with secrets; one active environment per workspace resolved at send time.
- **History** — every send is recorded; re-open, replay, save into a collection, delete, or clear.
- **Code snippets** — curl, fetch, node, and python for any request (also available from history).
- **Import / export** — export a collection as a Postman Collection v2.1 file and import one back.
- **Authentication** — JWT sign-in required for all product routes.
- **Full-text search** — search collections and requests within the active workspace.

## Project Structure

```text
.
├── backend/                     # Express API, business logic, and MongoDB persistence
│   ├── public/                  # Landing page and favicon served at /
│   └── src/
│       ├── app.js               # Express app, middleware, route mounting
│       ├── index.js             # Server bootstrap (config, database, listen)
│       ├── features/            # Product domains (auth, workspaces, collections,
│       │                        #   requests, environments, history, snippets, import-export)
│       ├── scripts/             # Deterministic seed data
│       └── shared/              # Config, middleware, schemas, errors, utilities
├── frontend/                    # React app (Vite)
│   ├── index.html               # Vite entry with pre-paint theme bootstrap
│   ├── public/                  # Local static media (favicon)
│   └── src/
│       ├── App.jsx              # Auth gate and session restore
│       ├── features/            # Product views (auth, workspaces, collections,
│       │                        #   requests, environments, history, snippets, import-export)
│       ├── shared/              # API client, reusable components, utilities
│       └── styles.css           # Design system and component styles
├── .vscode/launch.json          # Backend debugger configuration
└── setup.sh                     # MongoDB readiness, environment files, and seed reset
```

## Prerequisites

- Bun 1.3 or later
- MongoDB 8.0 or later on `127.0.0.1:27017`

## MongoDB Behavior

- The API connects to the database named in `MONGODB_URI` (`postman_db` by default).
- `setup.sh` (run automatically by `bun start`) creates missing `.env` files from the committed `.env.example` files, verifies MongoDB is reachable (starting it when possible), and runs the deterministic seed.
- Outgoing requests are refused when they resolve to loopback, private, or link-local addresses, including after redirects. Set `ALLOW_PRIVATE_DESTINATIONS=true` in `backend/.env` to allow loopback and private ranges for local development; it is ignored when `NODE_ENV=production`, and link-local and metadata addresses are always refused.
- The seed clears the application collections (`Workspace`, `Environment`, `Collection`, `Request`, `HistoryEntry`, `WorkspaceAccount`) and inserts a fixed baseline, so every restart restores the same known state.
- Health at `GET /api/v1/health` reports both the API and the live database connection.

## Getting Started

### Development Setup

1. Clone the repository and open the project directory.

   ```bash
   git clone https://github.com/thorOdinson16/mini-postman.git
   cd mini-postman
   ```

2. Install the pinned workspaces.

   ```bash
   bun install
   ```

3. Start the complete application.

   ```bash
   bun start
   ```

   Startup checks MongoDB, restores the seeded baseline, and launches the frontend and backend together.

4. Open [http://localhost:3000](http://localhost:3000) and sign in.

The frontend runs on port `3000`, the API runs on port `8000`, and health is available at [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health).

## Seeded Access

The database seeds one sign-in account on every start:

```text
Email: alex.morgan@postman.app
Password: password123
```

Authenticate with `POST /api/v1/auth/login` and send the returned token as `Authorization: Bearer <token>` on every other `/api/v1` route.

## Commands

| Command | Purpose |
|---|---|
| `bun start` | Runs `setup.sh` (environment files, MongoDB check, seed), then starts the frontend and backend together. |
| `bun run seed` | Restores the deterministic MongoDB baseline. |
| `bun run test` | Runs the backend tests against a throwaway `postman_test` database on the local MongoDB (override with `TEST_MONGODB_URI`); the app does not need to be running. |
| `bun run dev:backend` | Starts only the Express API on port `8000`. |
| `bun run dev:frontend` | Starts only Vite on port `3000`. |
