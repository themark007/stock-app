// src/controllers/stocksController.js
import { pool } from '../config/db.js';

export async function listStocks(req, res) {
  try {
    const q = `
      SELECT s.id, s.ticker, p.price, p.updated_at
      FROM stocks s
      LEFT JOIN stock_latest_price p ON p.stock_id = s.id
      ORDER BY s.ticker;
    `;
    const { rows } = await pool.query(q);
    return res.json(rows);
  } catch (err) {
    console.error('listStocks err', err);
    return res.status(500).json({ error: 'internal_error' });
  }
}
