import { Pool } from 'pg';
import { SCHEMA_SQL } from './schema';

let pool: Pool | null = null;

const isProduction = process.env.NODE_ENV === 'production';

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: isProduction ? { rejectUnauthorized: false } : undefined,
      max: isProduction ? 1 : 10,
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
  }
  return pool;
}

export const query = (text: string, params?: any[]) => {
  return getPool().query(text, params);
};

export const initializeDatabase = async () => {
  try {
    const statements = SCHEMA_SQL.split(';').filter(s => s.trim());

    for (const statement of statements) {
      await getPool().query(statement);
    }

    console.log('Database initialized successfully');
  } catch (err) {
    console.error('Error initializing database:', err);
    throw err;
  }
};

export const closePool = async () => {
  if (pool) {
    await pool.end();
  }
};

export default getPool();
