# Fundly backend — local setup

The API behind the Fundly mobile app. It uses Node.js, Express and TypeScript, with PostgreSQL through Drizzle ORM.

Once set up, the API runs at `http://localhost:3000/v1`, and the interactive API docs are at `http://localhost:3000/docs`.

## Prerequisites

- **Node.js 22 or newer.** Check with `node -v`.
- **PostgreSQL 14 or newer.** Any of these works:
  - [Postgres.app](https://postgresapp.com/) on macOS, the easiest option
  - Homebrew: `brew install postgresql@16 && brew services start postgresql@16`
  - Docker: `docker run -d --name fundly-db -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:16`

## 1. Install dependencies

```bash
cd Mobile-Backend
npm install
```

`npm install` also compiles the TypeScript into `dist/` (this runs as the `postinstall` step).

## 2. Create the database

```bash
createdb loan_sdk
```

If you're using Docker, run `docker exec -it fundly-db createdb -U postgres loan_sdk` instead.

## 3. Create your `.env` file

Create `Mobile-Backend/.env` with the content below. Git ignores this file, so never commit it.

```env
PORT=3000
NODE_ENV=development

# postgres://USER:PASSWORD@HOST:PORT/DATABASE
DATABASE_URL=postgres://postgres:postgres@localhost:5432/loan_sdk

# Each secret must be at least 32 characters. Generate one with: openssl rand -hex 48
JWT_ACCESS_SECRET=paste-a-generated-secret-here
OTP_SECRET=paste-a-different-generated-secret-here

ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_DAYS=30

# Optional. Leave both out to skip real emails (see "Getting OTP codes" below).
# RESEND_API_KEY=re_xxxxxxxx
# RESEND_FROM_EMAIL=onboarding@resend.dev
```

For `DATABASE_URL`, use your own Postgres username and password. Postgres.app usually needs no password: `postgres://YOUR_MAC_USERNAME@localhost:5432/loan_sdk`.

Every variable is checked when the server starts. If one is missing or invalid, for example a secret shorter than 32 characters, the server exits immediately with an error naming that variable.

| Variable | Required | Default | What it does |
|---|---|---|---|
| `DATABASE_URL` | yes | – | Postgres connection string |
| `JWT_ACCESS_SECRET` | yes | – | Signs login tokens (min 32 chars) |
| `OTP_SECRET` | yes | – | Hashes one-time codes (min 32 chars, different from the JWT secret) |
| `PORT` | no | `3000` | Port the API listens on |
| `NODE_ENV` | no | `development` | `development`, `production` or `test` |
| `ACCESS_TOKEN_TTL` | no | `15m` | How long a login token lasts (`15m`, `1h`, …) |
| `REFRESH_TOKEN_DAYS` | no | `30` | Days before the user must log in again |
| `RESEND_API_KEY` | no | – | [Resend](https://resend.com/api-keys) key for sending emails |
| `RESEND_FROM_EMAIL` | no | `onboarding@resend.dev` | Sender address. Use a plain address only, like `noreply@yourdomain.com`, not `Fundly <…>`. |

## 4. Create the tables

```bash
npm run db:push
```

This creates every table from [`src/db/schema.ts`](src/db/schema.ts). Run it again whenever that file changes.

> Don't use `schema.sql`. It's an old snapshot that is missing most of the tables.

## 5. (Optional) Add test accounts

```bash
npm run db:seed
```

> **Warning:** this deletes every existing user, along with their loans and repayments, before inserting the test accounts. The script refuses to run when `NODE_ENV=production`.

Every seeded account uses the password `Password123`:

| Phone | State |
|---|---|
| `08011111111` | verified, identity VERIFIED |
| `08022222222` | verified, identity NOT_STARTED |
| `08033333333` | verified, identity PENDING |
| `08044444444` | verified, identity FAILED |
| `08055555555` | phone **not** verified. Its pending OTP is `123456`. |

## 6. Start the server

```bash
npm run dev
```

This restarts automatically when you edit files. You should see:

```
API running on http://localhost:3000
```

To check that it works, open http://localhost:3000/docs in your browser.

## Getting OTP codes

Sign-up and login both send a 6-digit code. In development, every code is printed in the terminal running `npm run dev`:

```
[DEV] OTP for +2348011111111: 482913
```

The code is also emailed if `RESEND_API_KEY` is set and the user has an email address. Without a Resend key, the terminal is the only place to find codes. That's fine for local work.

## Connecting the mobile app

In development, the app finds the backend automatically. It calls port 3000 on the same computer that's running `npx expo start`, so there's no IP address to configure, even when your router gives your computer a new one.

What you need:

- The backend running on port 3000 (`npm run dev`), on the same computer as Expo.
- The phone and the computer on the same Wi-Fi network.

If the backend is on a different machine, or you start Expo with `--tunnel`, set the address yourself in `Mobile-frontend/.env`, then restart Expo:

```env
EXPO_PUBLIC_API_URL=http://192.168.x.x:3000/v1
```

The address the app is using is printed in the Expo logs when it starts, as `[env] API: http://…`.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Start with auto-reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled build, as production does |
| `npm run db:push` | Sync tables with `src/db/schema.ts` |
| `npm run db:studio` | Open Drizzle Studio, a browser UI for the database |
| `npm run db:seed` | Reset users and insert test accounts |

## Troubleshooting

**`ZodError` when starting, listing a variable name.** That variable in `.env` is missing or invalid. Check the table in step 3.

**`ECONNREFUSED ...:5432`.** Postgres isn't running. Start Postgres.app, run `brew services start postgresql@16`, or start the Docker container. Check with `pg_isready -h localhost`.

**`database "loan_sdk" does not exist`.** Run step 2.

**`relation "users" does not exist`.** The tables were never created. Run `npm run db:push`.

**`EADDRINUSE: address already in use :::3000`.** Another process is using port 3000, often an older `npm run dev`. Stop it, or find it with `lsof -i :3000`. You can also set a different `PORT` in `.env`.

**The app shows "Network unavailable" but the API works in the browser.** The app is pointing at the wrong address. See [Connecting the mobile app](#connecting-the-mobile-app).
