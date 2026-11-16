import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { config } from './config';
import * as schema from './db/schema';

export const pool = new Pool({ connectionString: config.DATABASE_URL });

// An idle client losing its connection (DB restart, network blip) emits 'error'
// on the pool; without a listener Node treats it as fatal and exits.
pool.on('error', (err) => {
  console.error('[db] Idle client error:', err);
});
export const db = drizzle(pool, { schema });