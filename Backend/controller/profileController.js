import pool from '../config/db.js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

export const ProfileController = {
  
  getProfile: async (req, res) => {
    const { userId } = req.params;
    try {
      const profile = await pool.query(
        'SELECT * FROM profiles WHERE user_id = $1',
        [userId]
      );
      if (profile.rows.length === 0) return res.json(null);
      res.json(profile.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).send('Server Error');
    }
  },

  // Create or update profile
  createOrUpdateProfile: async (req, res) => {
    const { userId, photo_url, bio, website, linkedin, twitter, instagram } = req.body;
    try {
      const existing = await pool.query(
        'SELECT * FROM profiles WHERE user_id = $1',
        [userId]
      );

      if (existing.rows.length > 0) {
        const updated = await pool.query(
          `UPDATE profiles SET 
            photo_url=$1, bio=$2, website=$3, linkedin=$4, twitter=$5, instagram=$6, updated_at=NOW()
          WHERE user_id=$7 RETURNING *`,
          [photo_url, bio, website, linkedin, twitter, instagram, userId]
        );
        res.json(updated.rows[0]);
      } else {
        const newProfile = await pool.query(
          `INSERT INTO profiles 
            (user_id, photo_url, bio, website, linkedin, twitter, instagram) 
          VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
          [userId, photo_url, bio, website, linkedin, twitter, instagram]
        );
        res.json(newProfile.rows[0]);
      }
    } catch (err) {
      console.error(err);
      res.status(500).send('Server Error');
    }
  },
};