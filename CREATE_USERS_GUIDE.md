# Creating User Accounts (Admin Guide)

Since signup is disabled, you need to manually create user accounts in the database.

## Option 1: Create User via SQL (Quickest)

### Step 1: Connect to PostgreSQL

```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql" -U postgres -d post_implementr
```

### Step 2: Run This SQL

```sql
-- Create a user account
INSERT INTO users (email, password_hash) 
VALUES (
  'qa@example.com',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36gZvWFm'
);
```

**Note:** The hash above is the bcrypt hash for password `"test123"`. 

To create your own password hash, use the command below.

---

## Option 2: Generate Your Own Password Hash

### Generate bcrypt hash:

```powershell
# Open Node.js
node

# In Node.js terminal:
const bcrypt = require('bcryptjs');
const password = 'your_password_here';
bcrypt.hash(password, 10).then(hash => console.log(hash));
```

Copy the output (the long hash), then use it in the SQL:

```sql
INSERT INTO users (email, password_hash) 
VALUES ('qa1@example.com', 'YOUR_HASH_HERE');
```

---

## Option 3: Create Multiple Users at Once

```sql
INSERT INTO users (email, password_hash) VALUES
('qa1@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36gZvWFm'),
('qa2@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36gZvWFm'),
('qa3@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36gZvWFm');
```

---

## Verify Users Were Created

```sql
SELECT id, email, created_at FROM users;
```

You should see your newly created users.

---

## Login with Created Account

1. Go to **http://localhost:3000** (or 5173 if you changed it)
2. Enter email: `qa@example.com`
3. Enter password: `test123` (or whatever you set)
4. Click **Sign In**

---

## Pre-Made Password Hashes (for Testing)

These are bcrypt hashes for common test passwords:

| Password | Hash |
|----------|------|
| `test123` | `$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36gZvWFm` |
| `password123` | `$2a$10$Ty7d7kGhxN8ZKLqy7NvHge5e1XYRvQVyG8Jxrx5BZLxN8Zq5Z5Jxi` |

Or generate your own using the Node.js method above.

---

## Future Improvements

When you want to improve this, you can:
1. **Add an admin signup endpoint** - Only accessible with a special token
2. **Invite system** - Generate invite codes for new users
3. **Email domain whitelist** - Auto-allow company emails
4. **OAuth** - Login with Google/GitHub

For now, manual SQL is the simplest approach! 👍
