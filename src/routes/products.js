import { Router } from 'express';
import Product from '../models/Product.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const { q, category } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (q) filter.$text = { $search: q };
    const products = await Product.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ products });
  } catch (e) { next(e); }
});

router.get('/:slug', async (req, res, next) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug }).lean();
    if (!product) return res.status(404).json({ error: 'Not found' });
    res.json({ product });
  } catch (e) { next(e); }
});

router.post('/', requireAuth('admin'), async (req, res, next) => {
  try {
    const p = await Product.create(req.body);
    res.status(201).json({ product: p });
  } catch (e) { next(e); }
});

router.put('/:id', requireAuth('admin'), async (req, res, next) => {
  try {
    const p = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!p) return res.status(404).json({ error: 'Not found' });
    res.json({ product: p });
  } catch (e) { next(e); }
});

router.delete('/:id', requireAuth('admin'), async (req, res, next) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;

