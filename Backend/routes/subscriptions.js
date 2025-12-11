// src/routes/subscriptions.js
import express from 'express';
import {
  getUserSubscriptions,
  addSubscription,
  removeSubscription
} from '../controller/subscriptionsController.js';

import { protect, allowFakeUserForTesting } from '../middleware/authMiddleware.js';

const router = express.Router();

// Each route: allow dev fallback (no token) then require JWT (protect).
// In production, allowFakeUserForTesting will be a noop.
router.get(
  '/users/:userId/subscriptions',
  allowFakeUserForTesting,
  protect,
  getUserSubscriptions
);

router.post(
  '/users/:userId/subscriptions',
  allowFakeUserForTesting,
  protect,
  addSubscription
);

router.delete(
  '/users/:userId/subscriptions/:ticker',
  allowFakeUserForTesting,
  protect,
  removeSubscription
);

export default router;
