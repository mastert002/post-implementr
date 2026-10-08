# Post-Implementr

A QA-focused web platform for managing post-implementation reviews after production deployments. Track pull requests, link JIRA tickets, and confirm implementations with an immutable audit trail.

## Features

✅ **QA Dashboard** - View all implementation records with confirmation status
✅ **GitHub/JIRA Integration** - Auto-detect JIRA keys from PR descriptions
✅ **Confirmation Tracking** - Mark implementations as confirmed with notes
✅ **Audit Trail** - Immutable history of all confirmations with timestamps
✅ **Filtering & Search** - Search by PR, JIRA key, or date range
✅ **Team Support** - Multi-user platform with authentication

## Tech Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS + Vite
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL
- **Authentication**: JWT

## Prerequisites

- Docker & Docker Compose
- OR: Node.js 20+, PostgreSQL 16+, npm

## Quick Start with Docker

### 1. Clone & Navigate

```bash
cd post-implementr
```

### 2. Create .env Files

Backend `.env` (already created):
```bash
# backend/.env is pre-configured for Docker Compose
```

Frontend `.env` (if needed):
```bash
VITE_API_URL=http://localhost:5000
```

### 3. Start with Docker Compose

```bash
docker-compose up
```

This starts:
- PostgreSQL on `localhost:5432`
- Backend on `localhost:5000`
- Frontend on `localhost:3000`

### 4. Access the App

Open [http://localhost:3000](http://localhost:3000) in your browser.

**Demo Credentials:**
- Email: `qa@example.com`
- Password: `test123` (create your own account via signup)

---

## Local Development (Without Docker)

### Backend Setup

```bash
cd backend
npm install
npm run build
npm run dev
```

The server runs on `http://localhost:5000`

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The app runs on `http://localhost:3000`

### PostgreSQL Setup

Create the database:

```bash
psql -U postgres -c "CREATE DATABASE post_implementr;"
```

The backend will auto-initialize tables on first run.

---

## API Endpoints

### Authentication
- `POST /auth/register` - Create new account
- `POST /auth/login` - Login
- `POST /auth/logout` - Logout

### Records
- `GET /api/records` - List all records (with filters)
- `POST /api/records` - Create new record
- `GET /api/records/:id` - Get record detail
- `GET /api/records/:id/confirmations` - Get confirmation history
- `POST /api/records/:id/confirm` - Confirm on production
- `DELETE /api/records/:id` - Delete record (only if not confirmed)

### Query Parameters
- `search` - Search PR URL, JIRA keys, description
- `status` - Filter by `pending` or `confirmed`
- `date_from` - Filter from date (ISO 8601)
- `date_to` - Filter to date (ISO 8601)
- `limit` - Results per page (default: 20)
- `offset` - Pagination offset (default: 0)

---

## Workflow

1. **QA logs in** → Dashboard
2. **Add new record** → Paste GitHub PR URL (optional: add JIRA keys)
   - App auto-detects JIRA keys from PR description
   - Or manually specify comma-separated keys
3. **Verify on production** → Click "Confirm on Prod"
   - Add optional notes
   - Select environment (production/staging)
4. **View history** → Click "View History" on any record
   - See all confirmations with user & timestamp

---

## File Structure

```
post-implementr/
├── backend/
│   ├── src/
│   │   ├── db/              # Database client & schema
│   │   ├── middleware/      # Auth & error handling
│   │   ├── services/        # GitHub & JIRA clients
│   │   ├── routes/          # API routes
│   │   ├── app.ts          # Express setup
│   │   └── index.ts        # Server entry
│   ├── package.json
│   ├── tsconfig.json
│   ├── Dockerfile
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── api/            # API client
│   │   ├── hooks/          # useAuth, useRecords
│   │   ├── components/     # React components
│   │   ├── pages/          # Login, Dashboard
│   │   ├── App.tsx        # Router
│   │   ├── main.tsx       # Entry point
│   │   └── index.css      # Tailwind
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── package.json
│   ├── Dockerfile
│   └── tsconfig.json
│
├── docker-compose.yml
└── README.md
```

---

## Environment Variables

### Backend (.env or Docker)

```env
PORT=5000
NODE_ENV=development
DATABASE_URL=postgres://postgres:postgres@localhost:5432/post_implementr
JWT_SECRET=your_secret_key
JWT_EXPIRY=7d
GITHUB_API_TOKEN=optional_github_token
JIRA_API_TOKEN=optional_jira_token
JIRA_BASE_URL=https://your-org.atlassian.net
```

### Frontend

```env
VITE_API_URL=http://localhost:5000  # Backend URL
```

---

## Database Schema

### users
- `id` - User ID (primary key)
- `email` - Unique email
- `password_hash` - Hashed password
- `created_at` - Account creation timestamp

### implementation_records
- `id` - Record ID
- `pr_url` - GitHub PR URL
- `pr_id` - GitHub PR number (extracted)
- `jira_keys` - Comma-separated JIRA keys
- `description` - User notes
- `created_by_user_id` - Creator user ID
- `created_at` - Record creation timestamp

### confirmations (Immutable)
- `id` - Confirmation ID
- `implementation_record_id` - Linked record
- `confirmed_by_user_id` - QA engineer who confirmed
- `confirmed_at` - Confirmation timestamp
- `notes` - QA verification notes
- `environment` - production/staging
- `created_at` - Timestamp

---

## Troubleshooting

### Port already in use
```bash
# Change ports in docker-compose.yml or use:
docker-compose down && docker-compose up
```

### Database connection error
```bash
# Check if PostgreSQL is running:
docker-compose logs postgres

# Or locally:
psql -U postgres -h localhost
```

### Frontend can't reach backend
```bash
# Check backend is running:
curl http://localhost:5000/health

# Or modify VITE_API_URL in frontend
```

---

## Future Enhancements

- Slack/email notifications on deployments
- Bulk confirmation of multiple records
- Export confirmations as CSV/PDF
- Automated PR sync (GitHub webhooks)
- User roles (admin, qa)
- Advanced analytics & reporting

---

## License

Built with ❤️ for QA teams.
