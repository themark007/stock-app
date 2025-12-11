// src/controllers/subscriptionsController.js
import { pool, getClient } from '../config/db.js';

// helper: get stock by ticker
async function getStockByTicker(client, ticker) {
  const { rows } = await client.query('SELECT id, ticker FROM stocks WHERE ticker = $1', [ticker]);
  return rows[0] || null;
}

// GET /users/:userId/subscriptions
export async function getUserSubscriptions(req, res) {
  const userId = req.user?.id || req.params.userId;
  if (!userId) return res.status(400).json({ error: 'user_id_required' });

  try {
    const q = `
      SELECT sub.id AS subscription_id, s.ticker, p.price, p.updated_at
      FROM subscriptions sub
      JOIN stocks s ON s.id = sub.stock_id
      LEFT JOIN stock_latest_price p ON p.stock_id = s.id
      WHERE sub.user_id = $1
      ORDER BY s.ticker;
    `;
    const { rows } = await pool.query(q, [userId]);
    return res.json(rows);
  } catch (err) {
    console.error('getUserSubscriptions err', err);
    return res.status(500).json({ error: 'internal_error' });
  }
}

// POST /users/:userId/subscriptions  body { ticker: "TSLA" }
export async function addSubscription(req, res) {
  const userId = req.user?.id || req.params.userId;
  const { ticker } = req.body;
  if (!userId) return res.status(400).json({ error: 'user_id_required' });
  if (!ticker) return res.status(400).json({ error: 'ticker_required' });

  const client = await getClient();
  try {
    await client.query('BEGIN');
    const stock = await getStockByTicker(client, ticker);
    if (!stock) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'ticker_not_found' });
    }

    const insertQ = `
      INSERT INTO subscriptions (user_id, stock_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id, stock_id) DO NOTHING
      RETURNING id;
    `;
    const { rows } = await client.query(insertQ, [userId, stock.id]);
    await client.query('COMMIT');

    if (rows.length === 0) {
      return res.status(200).json({ message: 'already_subscribed' });
    }
    return res.status(201).json({ subscription_id: rows[0].id });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('addSubscription err', err);
    return res.status(500).json({ error: 'internal_error' });
  } finally {
    client.release();
  }
}

// DELETE /users/:userId/subscriptions/:ticker
export async function removeSubscription(req, res) {
  const userId = req.user?.id || req.params.userId;
  const ticker = req.params.ticker;
  if (!userId) return res.status(400).json({ error: 'user_id_required' });
  if (!ticker) return res.status(400).json({ error: 'ticker_required' });

  const client = await getClient();
  try {
    await client.query('BEGIN');
    const stock = await getStockByTicker(client, ticker);
    if (!stock) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'ticker_not_found' });
    }
    const delQ = `DELETE FROM subscriptions WHERE user_id = $1 AND stock_id = $2 RETURNING id;`;
    const { rows } = await client.query(delQ, [userId, stock.id]);
    await client.query('COMMIT');

    if (rows.length === 0) return res.status(404).json({ error: 'subscription_not_found' });
    return res.json({ deleted: true });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('removeSubscription err', err);
    return res.status(500).json({ error: 'internal_error' });
  } finally {
    client.release();
  }
}
