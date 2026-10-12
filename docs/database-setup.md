# Post-Implementr: Database Setup

This guide sets up the Post-Implementr database on a new system: a local PostgreSQL server, or a Supabase project.

The schema is defined in `backend/src/db/schema.ts` and also provided as a standalone script, `backend/db/migrations/001_init.sql`. Both create the same tables. The script is idempotent (every statement uses `IF NOT EXISTS`), so it is safe to run more than once.

## What the database contains

| Table | Purpose |
|---|---|
| `users` | Login accounts (email, password hash) |
| `implementation_records` | One row per PR: PR URL, JIRA keys, description, creator |
| `confirmations` | Post-implementation confirmations, one per confirmation event |
| `status_reverts` | Each time a confirmed record was set back to pending, with comment |
| `jira_tickets` | Cache of JIRA ticket titles |

A record is **pending** when it has no confirmation, or when its latest revert is newer than its latest confirmation.

## Option A: Local PostgreSQL

### 1. Install PostgreSQL

Install PostgreSQL 13 or newer. Note the password you set for the `postgres` superuser during installation.

### 2. Create a database user and database

```bash
psql -U postgres -c "CREATE USER post_user WITH PASSWORD 'choose-a-strong-password';"
```

```bash
psql -U postgres -c "CREATE DATABASE post_implementr OWNER post_user;"
```

### 3. Configure the backend

Create `backend/.env` with these variables:

```
PORT=5000
NODE_ENV=development
DATABASE_URL=postgres://post_user:URL-ENCODED-PASSWORD@localhost:5432/post_implementr
JWT_SECRET=a-long-random-string
JWT_EXPIRY=7d
GITHUB_API_TOKEN=...
JIRA_BASE_URL=...
JIRA_EMAIL=...
JIRA_API_TOKEN=...
```

If the password contains characters such as `@`, `:` or `/`, percent-encode them in `DATABASE_URL`. For example, `@` becomes `%40`.

Never commit `.env`. The `.env*` rule in `.gitignore` already excludes it.

### 4. Start the backend

```bash
cd backend
npm install
npm run dev
```

On first start the backend creates every table, index and column. The console should show `Database initialized successfully`. You don't need to run the migration script by hand for a local database.

### 5. Create your login

The database starts empty. Register through the app's register route, or call `POST /auth/register` with an email and password.

## Option B: Supabase

Use this when the database should live in a Supabase project, for example in a different Supabase account from the one currently in use.

### 1. Create the project

In the Supabase dashboard, create a new project. Choose a region close to your users, and set a strong database password. Store the password in your password manager.

### 2. Get the connection string

Open **Project Settings → Database → Connection string** and choose the **Session pooler** option (port 5432).

Avoid the **Transaction pooler** (port 6543) for this migration. It does not support the session-level settings and some DDL statements reliably.

### 3. Run the migration

Choose one of these:

**Using the SQL editor (no tools needed):** open **SQL Editor** in the Supabase dashboard, paste the full contents of `backend/db/migrations/001_init.sql`, and run it. The script can be run again without harm.

**Using psql from a terminal:**

```bash
psql "postgresql://postgres.PROJECT-REF:YOUR-PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres" -f backend/db/migrations/001_init.sql
```

Replace the placeholders with the values from the connection string in step 2. Don't paste the password into shared chat, tickets or commits.

### 4. Point the backend at Supabase

Set `DATABASE_URL` in `backend/.env` to the session-pooler connection string, with the password percent-encoded.

Supabase requires SSL. The backend only enables SSL when `NODE_ENV=production`, so set:

```
NODE_ENV=production
```

Then start the backend as in Option A, step 4.

### 5. Create your login

Register as in Option A, step 5.

## Copying existing data

Starting fresh gives you an empty system. To bring existing records across, export the source database and restore it into the target.

```bash
pg_dump --data-only --no-owner --table=users --table=implementation_records --table=confirmations --table=status_reverts --table=jira_tickets "SOURCE_CONNECTION_STRING" > data.sql
```

```bash
psql "TARGET_CONNECTION_STRING" -f data.sql
```

Run the migration (step 3 above) on the target first, so its tables exist before the data is restored. If the source and target both have a `users` table with the same email, the restore fails on the unique email constraint. Remove the duplicate users from `data.sql`, or restore into an empty database.

Keep `data.sql` out of the repository. It contains password hashes and JIRA data.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `password authentication failed` | Wrong password, or special characters not percent-encoded in `DATABASE_URL` |
| `The server does not support SSL connections` | Local server: `NODE_ENV` set to `production`. Use `development` locally |
| `self-signed certificate` / SSL errors against Supabase | `NODE_ENV` is not `production`, so SSL is off |
| `Database initialization failed` on the first request | The backend could not reach the database. Check `DATABASE_URL` and that PostgreSQL is running |
| Records missing after a restore | The data dump was taken without `--data-only`, or the tables were created in a different schema |
