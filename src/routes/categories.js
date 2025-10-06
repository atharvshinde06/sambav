import { Router } from 'express';
import Category from '../models/Category.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const categories = await Category.find({}).sort({ order: 1, name: 1 }).lean();
    res.json({ categories });
  } catch (e) { next(e); }
});

router.post('/', requireAuth('admin'), async (req, res, next) => {
  try {
    const payload = {
      name: req.body?.name,
      slug: req.body?.slug,
      description: req.body?.description,
      image: req.body?.image,
      order: req.body?.order,
    };
    const category = await Category.create(payload);
    res.status(201).json({ category });
  } catch (e) { next(e); }
});

router.put('/:id', requireAuth('admin'), async (req, res, next) => {
  try {
    const updates = {
      name: req.body?.name,
      slug: req.body?.slug,
      description: req.body?.description,
      image: req.body?.image,
      order: req.body?.order,
    };
    // Remove undefined keys so they do not overwrite with undefined
    Object.keys(updates).forEach((key) => { if (updates[key] === undefined) delete updates[key]; });
    const category = await Category.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!category) return res.status(404).json({ error: 'Not found' });
    res.json({ category });
  } catch (e) { next(e); }
});

router.delete('/:id', requireAuth('admin'), async (req, res, next) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
