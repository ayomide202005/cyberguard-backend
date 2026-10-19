import express from 'express';
import { getDevices, trustDevice, removeDevice } from '../controllers/deviceController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Every route in this file needs the user to be signed in
router.use(protect);

router.get('/', getDevices);
router.patch('/:id/trust', trustDevice);
router.delete('/:id', removeDevice);

export default router;