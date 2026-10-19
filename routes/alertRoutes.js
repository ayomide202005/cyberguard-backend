import express from 'express';
import { getAlerts, resolveAlert } from '../controllers/alertController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/', getAlerts);
router.patch('/:id/resolve', resolveAlert);

export default router;