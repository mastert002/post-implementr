# Local Development + Vercel + Supabase Setup

Complete guide for running **locally** and deploying to **Vercel + Supabase**.

---

## Part 1: Local Development

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 14+ (local)
- Git

### Step 1: Setup Local PostgreSQL

**On Windows (with PostgreSQL installed):**
```bash
# Start PostgreSQL service
# (Usually runs automatically)

# Create database
psql -U postgres -c "CREATE DATABASE post_implementr;"
```

**On macOS (with Homebrew):**
```bash
brew services start postgresql
psql -U postgres -c "CREATE DATABASE post_implementr;"
```

**On Linux:**
```bash
sudo service postgresql start
psql -U postgres -c "CREATE DATABASE post_implementr;"
```

**Or use Docker (easiest):**
```bash
docker run -d \
  --name postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=post_implementr \
  -p 5432:5432 \
  postgres:16-alpine
```

### Step 2: Create .env File (Local)

Create `backend/.env`:
```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/post_implementr
JWT_SECRET=dev-secret-key-change-this
JWT_EXPIRY=7d
NODE_ENV=development
GITHUB_API_TOKEN=  # Optional
JIRA_API_TOKEN=    # Optional
```

### Step 3: Install Dependencies

```bash
# Root dependencies
npm install

# Frontend dependencies
cd frontend
npm install
cd ..
```

### Step 4: Start Local Development

**Terminal 1: Backend (API routes)**
```bash
cd frontend
npm run dev
```
Runs on http://localhost:5173 with Vite dev server

**Terminal 2: PostgreSQL (if Docker)**
```bash
# Already running if you started Docker container
docker logs postgres -f  # Monitor logs
```

### Step 5: Test Locally

1. Open http://localhost:5173
2. Register new account
3. Add implementation records
4. Mark as confirmed

✅ **Local setup complete!**

---

## Part 2: Prepare for Vercel + Supabase

### Step 1: Create Supabase Account

1. Go to [supabase.com](https://supabase.com)
2. Sign up (free tier)
3. Create new project
4. Wait for project to initialize (~1 minute)

### Step 2: Get Supabase Connection String

1. In Supabase dashboard → **Settings** → **Database**
2. Copy **Connection String** (URI format)
3. Replace `[YOUR-PASSWORD]` with your database password

Example:
```
postgresql://postgres:your_password@db.xxxx.supabase.co:5432/postgres
```

### Step 3: Create Tables in Supabase

1. In Supabase → **SQL Editor**
2. Click **New Query**
3. Copy and paste all SQL from `backend/src/db/schema.sql`:

```sql
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS implementation_records (
  id SERIAL PRIMARY KEY,
  pr_url VARCHAR(500) NOT NULL,
  pr_id VARCHAR(50),
  jira_keys VARCHAR(500),
  description TEXT,
  created_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS confirmations (
  id SERIAL PRIMARY KEY,
  implementation_record_id INTEGER NOT NULL REFERENCES implementation_records(id) ON DELETE CASCADE,
  confirmed_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  confirmed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  environment VARCHAR(50) DEFAULT 'production',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_implementation_records_created_by ON implementation_records(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_implementation_records_created_at ON implementation_records(created_at);
CREATE INDEX IF NOT EXISTS idx_confirmations_record_id ON confirmations(implementation_record_id);
CREATE INDEX IF NOT EXISTS idx_confirmations_confirmed_by ON confirmations(confirmed_by_user_id);
CREATE INDEX IF NOT EXISTS idx_confirmations_confirmed_at ON confirmations(confirmed_at);
```

4. Click **Run**

✅ **Supabase database ready!**

---

## Part 3: Deploy to Vercel

### Step 1: Push to GitHub

```bash
cd post-implementr

git init
git add .
git commit -m "Initial commit: Vercel + Supabase setup"

# Create GitHub repo first, then:
git remote add origin https://github.com/YOUR_USERNAME/post-implementr.git
git branch -M main
git push -u origin main
```

### Step 2: Connect to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click **Add New** → **Project**
4. Select your `post-implementr` repository
5. Click **Import**

### Step 3: Configure Environment Variables

Vercel will show deployment settings. Add these environment variables:

**Environment Variables:**
```
DATABASE_URL = postgresql://postgres:YOUR_PASSWORD@db.xxxx.supabase.co:5432/postgres
JWT_SECRET = your-long-random-secret-key
NODE_ENV = production
```

To generate a strong JWT_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and paste it as `JWT_SECRET`.

### Step 4: Deploy

1. Click **Deploy**
2. Vercel automatically:
   - Builds React frontend
   - Sets up serverless functions (`/api/*`)
   - Deploys to CDN
   - Gets SSL certificate

Wait 2-3 minutes for deployment to complete.

✅ **Live on Vercel!**

---

## Project Structure

After setup, your project looks like:

```
post-implementr/
├── api/                        # Vercel serverless functions
│   ├── auth/
│   │   ├── login.ts
│   │   └── register.ts
│   └── records/
│       ├── index.ts
│       ├── [id].ts
│       └── [id]/
│           └── confirm.ts
├── lib/                        # Shared utilities
│   ├── db.ts                   # Database client
│   ├── auth.ts                 # JWT utilities
│   └── github.ts               # GitHub integration
├── frontend/                   # React app
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── pages/
│   │   └── hooks/
│   ├── package.json
│   └── vite.config.ts
├── backend/                    # Original (for reference)
│   └── src/db/schema.sql       # Database schema
├── package.json                # Root config
├── vercel.json                 # Vercel config
└── README.md
```

---

## Environment Variables

### Local Development (backend/.env)
```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/post_implementr
JWT_SECRET=dev-secret-key
NODE_ENV=development
```

### Vercel (Dashboard)
```env
DATABASE_URL=postgresql://postgres:PASSWORD@db.xxxx.supabase.co:5432/postgres
JWT_SECRET=your-strong-random-key
NODE_ENV=production
```

---

## Testing After Deployment

1. Go to your Vercel deployment URL (e.g., `https://post-implementr.vercel.app`)
2. Register new account
3. Add implementation record
4. Confirm on production
5. Check database in Supabase → **Table Editor**

Everything working? ✅ **You're done!**

---

## API Endpoint Mapping

**Local Development:**
```
POST   http://localhost:5173/api/auth/register
POST   http://localhost:5173/api/auth/login
GET    http://localhost:5173/api/records
POST   http://localhost:5173/api/records
GET    http://localhost:5173/api/records/[id]
POST   http://localhost:5173/api/records/[id]/confirm
DELETE http://localhost:5173/api/records/[id]
```

**Vercel Production:**
```
POST   https://your-app.vercel.app/api/auth/register
POST   https://your-app.vercel.app/api/auth/login
GET    https://your-app.vercel.app/api/records
POST   https://your-app.vercel.app/api/records
GET    https://your-app.vercel.app/api/records/[id]
POST   https://your-app.vercel.app/api/records/[id]/confirm
DELETE https://your-app.vercel.app/api/records/[id]
```

---

## Troubleshooting

### Local: "Database connection error"
```bash
# Check PostgreSQL is running
psql -U postgres -h localhost

# If Docker:
docker ps  # Should show postgres container running
```

### Local: "Cannot find module '@/lib/db'"
```bash
# TypeScript paths not working locally
# For local dev, update frontend/vite.config.ts:
# Remove proxy settings if using direct Express backend
```

### Vercel: "500 error on /api routes"
1. Check **Deployments** → **Function Logs**
2. Check environment variables set correctly
3. Verify `DATABASE_URL` is accessible from Vercel IPs

### Vercel: "Frontend shows blank page"
1. Check browser console (F12)
2. Verify API calls going to correct URL (no domain if same-origin)
3. Clear cache: Ctrl+Shift+Delete

### Supabase: "Connection refused"
1. Check **Settings** → **Database** → Connection string
2. Verify password is correct
3. Ensure Vercel IP not blocked (Supabase allows all by default)

---

## Cost Estimates

| Service | Free Tier | After Free |
|---------|-----------|-----------|
| **Vercel** | ✅ Unlimited | $20/mo (optional) |
| **Supabase** | ✅ $0 | $25/mo (optional) |
| **Total** | **$0** | **$45/mo (optional)** |

Free tier is enough for **thousands of monthly active users**.

---

## Next Steps

After deployment:
1. ✅ Test all features
2. ✅ Share URL with team
3. ✅ Add GitHub/JIRA tokens (optional)
4. ✅ Setup custom domain (optional)
5. ✅ Monitor Vercel Analytics

---

## Support

**Local issues?**
- Check PostgreSQL is running
- Verify `.env` file exists and correct
- Check logs: `npm run dev`

**Vercel issues?**
- Check deployment logs
- Verify environment variables
- Read Vercel error page for details

**Database issues?**
- Check Supabase logs: **Settings** → **Logs** Explorer
- Verify connection string has correct password
- Test connection locally: `psql <DATABASE_URL>`

---

**You now have:**
- ✅ Local development working
- ✅ Supabase PostgreSQL database
- ✅ Vercel serverless deployment
- ✅ Auto-deploy on git push
- ✅ Zero monthly cost

Enjoy! 🚀
