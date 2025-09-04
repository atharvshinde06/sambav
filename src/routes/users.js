import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import User from '../models/User.js';

const router = Router();

// List all users (admin only)
router.get('/', requireAuth('admin'), async (_req, res, next) => {
  try {
    const users = await User.find({}, 'name email role createdAt updatedAt').sort({ createdAt: -1 }).lean();
    res.json({ users });
  } catch (e) { next(e); }
});

export default router;

