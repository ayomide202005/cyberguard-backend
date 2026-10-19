import express from 'express';
import {
  register,
  login,
  getMe,
  logout,
  changePassword,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);

// These need the user to be signed in ("protect" runs first)
router.get('/me', protect, getMe);
router.patch('/password', protect, changePassword);

export default router;