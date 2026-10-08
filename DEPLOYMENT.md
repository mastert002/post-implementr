# Deployment Guide for Post-Implementr

## Local Development

### Quick Start

1. **Install Dependencies** (already done):
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

2. **Start PostgreSQL** (local):
   ```bash
   # On macOS with Homebrew:
   brew services start postgresql
   
   # On Linux:
   sudo service postgresql start
   
   # Or use Docker:
   docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:16-alpine
   ```

3. **Create Database**:
   ```bash
   psql -U postgres -c "CREATE DATABASE post_implementr;"
   ```

4. **Start Backend** (in `backend/` directory):
   ```bash
   npm run dev
   ```
   Backend runs on `http://localhost:5000`

5. **Start Frontend** (in `frontend/` directory, new terminal):
   ```bash
   npm run dev
   ```
   Frontend runs on `http://localhost:3000`

6. **Access**: Open [http://localhost:3000](http://localhost:3000)

---

## Docker Deployment

### Using Docker Compose (Easiest)

```bash
cd post-implementr
docker-compose up --build
```

Services:
- PostgreSQL: `localhost:5432`
- Backend: `localhost:5000`
- Frontend: `localhost:3000`

### Manual Docker

Build images:
```bash
docker build -t post-implementr-backend ./backend
docker build -t post-implementr-frontend ./frontend
```

Run with network:
```bash
docker network create post-implementr-net

# PostgreSQL
docker run -d \
  --name postgres \
  --network post-implementr-net \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=post_implementr \
  -p 5432:5432 \
  postgres:16-alpine

# Backend
docker run -d \
  --name backend \
  --network post-implementr-net \
  -e DATABASE_URL="postgres://postgres:postgres@postgres:5432/post_implementr" \
  -e JWT_SECRET="your-secret-key" \
  -p 5000:5000 \
  post-implementr-backend

# Frontend
docker run -d \
  --name frontend \
  --network post-implementr-net \
  -e VITE_API_URL="http://localhost:5000" \
  -p 3000:3000 \
  post-implementr-frontend
```

---

## Production Deployment

### Environment Variables

**Backend** (.env):
```env
PORT=5000
NODE_ENV=production
DATABASE_URL=postgres://user:password@host:5432/post_implementr
JWT_SECRET=very-long-random-secret-key-change-this
JWT_EXPIRY=7d
GITHUB_API_TOKEN=ghp_xxxxx  # Optional
JIRA_API_TOKEN=xxxxx        # Optional
JIRA_BASE_URL=https://your-org.atlassian.net  # Optional
```

**Frontend** (.env or build-time):
```env
VITE_API_URL=https://api.your-domain.com
```

### Deployment Options

#### Option 1: Railway (Recommended)
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login & Deploy
railway login
railway init
railway up
```

#### Option 2: Render
1. Push to GitHub
2. Create new Web Service on Render
3. Set environment variables
4. Deploy

#### Option 3: AWS EC2
```bash
# SSH into instance
ssh -i key.pem ubuntu@your-instance

# Install Node & PostgreSQL
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install nodejs postgresql postgresql-contrib

# Clone repo & deploy
git clone your-repo
cd post-implementr/backend
npm ci --production
npm run build
PM2 start dist/index.js

# Frontend
cd ../frontend
npm ci
npm run build
# Serve with Nginx or similar
```

#### Option 4: Docker on VPS
```bash
# Build & push to Docker Hub
docker build -t yourusername/post-implementr-backend ./backend
docker push yourusername/post-implementr-backend

# On VPS, use docker-compose with production values
# Ensure SSL/HTTPS is configured
```

### SSL/HTTPS Setup

Use Nginx reverse proxy or use managed services:

**Nginx Example**:
```nginx
server {
    listen 443 ssl;
    server_name api.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/api.your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.your-domain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Get free cert with Certbot:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot certonly --nginx -d api.your-domain.com
```

---

## Database Backup

### PostgreSQL Dump
```bash
# Backup
pg_dump -U postgres post_implementr > backup.sql

# Restore
psql -U postgres post_implementr < backup.sql
```

### Automated Backups
```bash
# Cron job (runs daily at 2 AM)
0 2 * * * pg_dump -U postgres post_implementr | gzip > /backups/post_implementr_$(date +\%Y\%m\%d).sql.gz
```

---

## Health Checks

```bash
# Backend health
curl http://localhost:5000/health

# Login check
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Records API
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/records
```

---

## Performance Tuning

### Database Indexes
Already created in `schema.sql`:
- `implementation_records(created_by_user_id)`
- `implementation_records(created_at)`
- `confirmations(implementation_record_id)`
- `confirmations(confirmed_by_user_id)`
- `confirmations(confirmed_at)`

### Caching
Consider adding Redis for:
- Session caching
- PR details cache (30 min TTL)
- API rate limiting

### Frontend
- Vite builds optimized bundle
- Tailwind purges unused CSS
- Consider CDN for static assets

---

## Monitoring

### Logs
```bash
# Backend (Docker)
docker logs backend -f

# Backend (Local)
tail -f logs/app.log

# PostgreSQL
docker logs postgres -f
```

### Metrics
Monitor:
- API response times
- Database query times
- Active users
- Error rates

Use: Datadog, New Relic, or cloud provider monitoring

---

## Troubleshooting

### Can't connect to PostgreSQL
```bash
# Check if running
psql -U postgres

# Reset password
sudo -u postgres psql
# Then: ALTER USER postgres PASSWORD 'newpassword';
```

### API returns 500
```bash
# Check logs
docker logs backend
# or
pm2 logs

# Check database connection
psql -U postgres -d post_implementr -c "SELECT 1"
```

### Frontend blank page
```bash
# Check browser console (F12)
# Check if API_URL is correct
# Clear cache: Ctrl+Shift+Delete
```

---

## Maintenance

### Update Dependencies
```bash
# Check for updates
npm outdated

# Update
npm update

# Or use npm-check-updates
npm-check-updates -u && npm install
```

### Database Optimization
```bash
# Vacuum (cleanup bloat)
psql -U postgres -d post_implementr -c "VACUUM ANALYZE;"

# Run periodically via cron
```

### Clean Up Old Data
```sql
-- Delete confirmations older than 1 year (modify as needed)
DELETE FROM confirmations
WHERE confirmed_at < NOW() - INTERVAL '1 year';
```

---

## Support

For issues, check:
1. `.env` files are correct
2. Database is running
3. Ports are available
4. Network connectivity
5. API token validity (if using GitHub/JIRA)

See README.md for troubleshooting section.
