import type { IncomingMessage, ServerResponse } from 'http';
import app from '../backend/src/app';
import { initializeDatabase } from '../backend/src/db/client';

let ready: Promise<void> | null = null;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!ready) {
    ready = initializeDatabase();
  }

  try {
    await ready;
  } catch {
    ready = null;
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Database initialization failed' }));
    return;
  }

  return app(req as any, res as any);
}
