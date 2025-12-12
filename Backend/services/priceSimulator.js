// src/services/priceSimulator.js
import { pool } from '../config/db.js';

/**
 * startPriceSimulator(io, options)
 * options:
 *   intervalMs (default 1000)
 */
export default function startPriceSimulator(io, options = {}) {
  const intervalMs = options.intervalMs || 1000;
  let running = false;
  let timer = null;

  async function step() {
    let client;
    try {
      client = await pool.connect();
      const res = await client.query(`
        SELECT s.id, s.ticker, p.price
        FROM stocks s
        LEFT JOIN stock_latest_price p ON p.stock_id = s.id
      `);

      const now = new Date();

      for (const row of res.rows) {
        let price = row.price !== null ? Number(row.price) : (100 + Math.random() * 1000);
        const pctChange = (Math.random() * 0.04) - 0.02;
        price = +(price * (1 + pctChange)).toFixed(2);

        await client.query(`
          INSERT INTO stock_latest_price (stock_id, price, updated_at)
          VALUES ($1, $2, now())
          ON CONFLICT (stock_id) DO UPDATE
            SET price = EXCLUDED.price,
                updated_at = now()
        `, [row.id, price]);

        const payload = {
          ticker: row.ticker,
          price,
          updated_at: now.toISOString()
        };

        io.to(`stock:${row.ticker}`).emit('stock:update', payload);
      }
    } catch (err) {
      console.error('priceSimulator step err', err);
    } finally {
      if (client) client.release();
    }
  }

  return {
    start() {
      if (running) return;
      running = true;
      // Don't run immediately, wait for server to be ready
      timer = setInterval(() => step().catch((err) => {
        console.error('priceSimulator error (continuing):', err.message);
      }), intervalMs);
      console.log('price simulator started, intervalMs=', intervalMs);
    },
    stop() {
      if (!running) return;
      clearInterval(timer);
      timer = null;
      running = false;
      console.log('price simulator stopped');
    }
  };
}
