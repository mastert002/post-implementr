import { Pool, QueryResult } from 'pg';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const isProduction = process.env.NODE_ENV === 'production';

    const poolConfig = {
      connectionString: process.env.DATABASE_URL,
      // Supabase requires SSL
      ssl: isProduction ? { rejectUnauthorized: false } : false,
    };

    pool = new Pool(poolConfig);

    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
  }

  return pool;
}

export async function query(
  text: string,
  params?: any[]
): Promise<QueryResult> {
  const pool = getPool();
  try {
    return await pool.query(text, params);
  } catch (err) {
    console.error('Database query error:', err);
    throw err;
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
