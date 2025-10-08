import { Router } from 'express';
import ProductQuote from '../models/ProductQuote.js';
import Product from '../models/Product.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Public endpoint to create a quote request
router.post('/', async (req, res, next) => {
  try {
    const { name, email, phone, country, productId } = req.body || {};
    if (!name || !email || !productId) {
      return res.status(400).json({ error: 'Please provide name, email, and product.' });
    }
    const product = await Product.findById(productId).select('_id name slug');
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const doc = await ProductQuote.create({
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      phone: phone ? String(phone).trim() : undefined,
      country: country ? String(country).trim() : undefined,
      product: product._id,
    });

    res.status(201).json({ quote: doc });
  } catch (e) { next(e); }
});

// Admin list quotes
router.get('/', requireAuth('admin'), async (_req, res, next) => {
  try {
    const quotes = await ProductQuote.find({}).sort({ createdAt: -1 }).populate('product', 'name slug').lean();
    res.json({ quotes });
  } catch (e) { next(e); }
});

// Admin update status
router.put('/:id/status', requireAuth('admin'), async (req, res, next) => {
  try {
    const { status } = req.body || {};
    if (!['new', 'viewed', 'closed'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const quote = await ProductQuote.findByIdAndUpdate(req.params.id, { status }, { new: true }).lean();
    if (!quote) return res.status(404).json({ error: 'Not found' });
    res.json({ quote });
  } catch (e) { next(e); }
});

export default router;
