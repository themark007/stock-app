// src/db/index.js
import pkg from "pg";
import dotenv from "dotenv";
dotenv.config();

const { Pool } = pkg;

// Neon requires SSL enabled
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // required for Neon PostgreSQL
  },
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
