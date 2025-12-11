// src/routes/stocks.js
import express from 'express';
import { listStocks } from '../controller/stocksController.js';

const router = express.Router();

router.get('/', listStocks);

export default router;
