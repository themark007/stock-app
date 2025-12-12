// src/db/index.js
import pkg from "pg";
import dotenv from "dotenv";
dotenv.config();

const { Pool } = pkg;

// Neon requires SSL enabled
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 10,
});

// Test connection on startup
pool.on('error', (err) => {
  console.error('❌ Unexpected database pool error:', err);
});

/**
 * getClient()
 * - Used for transactions (BEGIN / COMMIT / ROLLBACK)
 */
export async function getClient() {
  const client = await pool.connect();
  return client;
}

// Default export + named export
export default pool;
export { pool };
