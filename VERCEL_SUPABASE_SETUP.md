# Vercel + Supabase Deployment Guide

Deploy both frontend and backend to Vercel with Supabase PostgreSQL.

## Architecture

```
Frontend (React)     → Vercel (Static + Serverless)
Backend (API Routes) → Vercel Serverless Functions (/api)
Database (PostgreSQL) → Supabase
```

---

## Step 1: Setup Supabase Database

### 1.1 Create Supabase Account
- Go to [supabase.com](https://supabase.com)
- Sign up (free tier available)
- Create new project

### 1.2 Get Connection String
1. In Supabase dashboard → Settings → Database
2. Copy **Connection String** (URI format)
3. Replace `[YOUR-PASSWORD]` with your database password
4. Copy the full URL

Example:
```
postgresql://postgres:[PASSWORD]@db.xxxx.supabase.co:5432/postgres
```

### 1.3 Create Tables in Supabase
1. Go to Supabase SQL Editor
2. Run this SQL:

```sql
-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Implementation Records table
CREATE TABLE implementation_records (
  id SERIAL PRIMARY KEY,
  pr_url VARCHAR(500) NOT NULL,
  pr_id VARCHAR(50),
  jira_keys VARCHAR(500),
  description TEXT,
  created_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Confirmations table (immutable audit trail)
CREATE TABLE confirmations (
  id SERIAL PRIMARY KEY,
  implementation_record_id INTEGER NOT NULL REFERENCES implementation_records(id) ON DELETE CASCADE,
  confirmed_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  confirmed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  environment VARCHAR(50) DEFAULT 'production',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_implementation_records_created_by ON implementation_records(created_by_user_id);
CREATE INDEX idx_implementation_records_created_at ON implementation_records(created_at);
CREATE INDEX idx_confirmations_record_id ON confirmations(implementation_record_id);
CREATE INDEX idx_confirmations_confirmed_by ON confirmations(confirmed_by_user_id);
CREATE INDEX idx_confirmations_confirmed_at ON confirmations(confirmed_at);
```

3. Execute the query

✅ **Supabase setup complete!**

---

## Step 2: Restructure Project for Vercel

Your project needs to be in Vercel's expected structure:

```
post-implementr/
├── frontend/                 # React app (will be root in Vercel)
│   ├── src/
│   ├── public/
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
├── api/                      # ← NEW: Serverless functions
│   ├── auth/
│   │   ├── login.ts
│   │   ├── register.ts
│   │   └── logout.ts
│   ├── records/
│   │   ├── index.ts
│   │   ├── [id].ts
│   │   └── [id]/confirm.ts
│   ├── jira/
│   │   └── auto-link.ts
│   └── github/
│       └── pr-info.ts
├── lib/                      # Shared utilities
│   ├── db.ts                 # Database client
│   ├── auth.ts
│   └── github.ts
├── vercel.json               # Vercel config
└── package.json              # Root package.json
```

---

## Step 3: Create Vercel Configuration

Create `vercel.json` at root:

```json
{
  "buildCommand": "cd frontend && npm ci && npm run build",
  "outputDirectory": "frontend/dist",
  "functions": {
    "api/**/*.ts": {
      "memory": 1024,
      "maxDuration": 10
    }
  },
  "env": {
    "DATABASE_URL": "@database_url",
    "JWT_SECRET": "@jwt_secret"
  }
}
```

---

## Step 4: Update Frontend Configuration

### 4.1 Update `frontend/vite.config.ts`

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
```

### 4.2 Update `frontend/src/api/client.ts`

```typescript
import axios from 'axios';

const API_BASE_URL = process.env.VITE_API_URL || '';

const client = axios.create({
  baseURL: API_BASE_URL,
});

// Rest of the code stays the same
```

### 4.3 Update `frontend/.env`

```env
# Vercel will have empty API_URL (same origin)
VITE_API_URL=
```

---

## Step 5: Create Database Client (lib/db.ts)

```typescript
import { Pool } from 'pg';

let pool: Pool;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
    });
  }
  return pool;
}

export async function query(text: string, params?: any[]) {
  const pool = getPool();
  return pool.query(text, params);
}
```

---

## Step 6: Create API Routes

### 6.1 `api/auth/register.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password required' },
        { status: 400 }
      );
    }

    const existing = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
      [email, passwordHash]
    );

    const user = result.rows[0];
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    return NextResponse.json({
      id: user.id,
      email: user.email,
      token,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 6.2 `api/auth/login.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password required' },
        { status: 400 }
      );
    }

    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const user = result.rows[0];
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    return NextResponse.json({
      id: user.id,
      email: user.email,
      token,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 6.3 `api/records/index.ts` (GET & POST)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const userId = verifyToken(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const limit = searchParams.get('limit') || '20';
    const offset = searchParams.get('offset') || '0';

    let sql = `
      SELECT 
        r.*,
        u.email as created_by_email,
        c.id as latest_confirmation_id,
        c.confirmed_at as latest_confirmed_at,
        cu.email as latest_confirmed_by_email
      FROM implementation_records r
      LEFT JOIN users u ON r.created_by_user_id = u.id
      LEFT JOIN LATERAL (
        SELECT * FROM confirmations 
        WHERE implementation_record_id = r.id
        ORDER BY confirmed_at DESC
        LIMIT 1
      ) c ON true
      LEFT JOIN users cu ON c.confirmed_by_user_id = cu.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      sql += ` AND (r.pr_url ILIKE $${paramIndex} OR r.jira_keys ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (status === 'confirmed') {
      sql += ` AND c.id IS NOT NULL`;
    } else if (status === 'pending') {
      sql += ` AND c.id IS NULL`;
    }

    sql += ` ORDER BY r.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await query(sql, params);

    return NextResponse.json({
      records: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = verifyToken(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pr_url, jira_keys, description } = await req.json();

    if (!pr_url) {
      return NextResponse.json(
        { error: 'PR URL is required' },
        { status: 400 }
      );
    }

    const result = await query(
      `INSERT INTO implementation_records (pr_url, jira_keys, description, created_by_user_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [pr_url, jira_keys || null, description || null, userId]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 6.4 `api/records/[id]/confirm.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = verifyToken(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { notes, environment = 'production' } = await req.json();
    const recordId = params.id;

    // Verify record exists
    const recordResult = await query(
      'SELECT * FROM implementation_records WHERE id = $1',
      [recordId]
    );

    if (recordResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Record not found' },
        { status: 404 }
      );
    }

    // Create confirmation
    const result = await query(
      `INSERT INTO confirmations (implementation_record_id, confirmed_by_user_id, notes, environment)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [recordId, userId, notes || null, environment]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

## Step 7: Create Auth Utility (lib/auth.ts)

```typescript
import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

export function verifyToken(req: NextRequest): number | null {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;
    return decoded.userId;
  } catch {
    return null;
  }
}
```

---

## Step 8: Update Root package.json

Create `package.json` at root:

```json
{
  "name": "post-implementr",
  "version": "1.0.0",
  "scripts": {
    "dev": "cd frontend && npm run dev",
    "build": "cd frontend && npm run build"
  },
  "dependencies": {
    "pg": "^8.10.0",
    "jsonwebtoken": "^9.0.0",
    "bcryptjs": "^2.4.3",
    "axios": "^1.4.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.6",
    "typescript": "^5.3.3"
  }
}
```

---

## Step 9: Deploy to Vercel

### 9.1 Push to GitHub
```bash
cd post-implementr
git init
git add .
git commit -m "Setup Vercel + Supabase"
git remote add origin https://github.com/YOUR_USERNAME/post-implementr.git
git push -u origin main
```

### 9.2 Connect to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click "Add New..." → "Project"
4. Import your repository
5. Vercel detects it's a frontend + API project

### 9.3 Set Environment Variables
In Vercel dashboard:
```
DATABASE_URL = postgresql://...  (from Supabase)
JWT_SECRET = your-long-random-secret-key
```

### 9.4 Deploy
Click "Deploy" - Vercel automatically:
- Builds React app
- Sets up serverless functions
- Deploys everything

✅ **Your app is live!**

---

## Environment Variables

### Supabase
Get from Supabase → Settings → Database:
```
DATABASE_URL=postgresql://postgres:PASSWORD@db.xxx.supabase.co:5432/postgres
```

### JWT Secret
Generate a strong random string:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Testing Locally

```bash
# Install root dependencies
npm install

# Start frontend (runs on :3000)
npm run dev

# API routes automatically available at /api
# Frontend can call /api/auth/login, /api/records, etc.
```

---

## File Structure After Setup

```
post-implementr/
├── api/
│   ├── auth/
│   │   ├── login.ts
│   │   ├── register.ts
│   │   └── logout.ts
│   ├── records/
│   │   ├── index.ts
│   │   └── [id]/
│   │       └── confirm.ts
│   └── ...
├── lib/
│   ├── db.ts
│   ├── auth.ts
│   └── github.ts
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   └── ...
│   ├── package.json
│   └── vite.config.ts
├── package.json
├── vercel.json
└── README.md
```

---

## Troubleshooting

### Database connection error
- Check `DATABASE_URL` in Vercel env vars
- Ensure Supabase IP whitelist includes Vercel
- Test connection: `psql <DATABASE_URL>`

### API returns 404
- Check `/api` folder structure matches routes
- Vercel naming: `/api/auth/login.ts` → `POST /api/auth/login`

### Frontend can't reach API
- Ensure `VITE_API_URL` is empty (same origin)
- Check network tab in browser DevTools

---

## Summary

✅ Frontend & Backend on Vercel
✅ Database on Supabase
✅ Serverless functions
✅ Auto-deploy on git push
✅ Free tier available

Ready to deploy! 🚀
