import express from 'express';
import { ProfileController } from '../controllers/ProfileController.js';

const router = express.Router();

// Get profile by user ID
router.get('/:userId', ProfileController.getProfile);

// Create or update profile
router.post('/', ProfileController.createOrUpdateProfile);

export default router;