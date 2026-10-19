import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  setupTwoFactor,
  enableTwoFactor,
  disableTwoFactor,
} from '../controllers/twoFactorController.js';

const router = express.Router();

// Every route here needs the user to be signed in
router.use(protect);

router.post('/setup', setupTwoFactor);
router.post('/enable', enableTwoFactor);
router.post('/disable', disableTwoFactor);

export default router;