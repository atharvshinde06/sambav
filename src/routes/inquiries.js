import { Router } from 'express';
import Inquiry from '../models/Inquiry.js';
import Product from '../models/Product.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Create an inquiry from a cart
router.post('/', requireAuth(), async (req, res, next) => {
  try {
    const { items, note } = req.body; // items: [{productId, quantity, unit?}]
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'No items' });
    const prods = await Product.find({ _id: { $in: items.map(i => i.productId) } }).lean();
    const mapped = items.map((i) => {
      const p = prods.find(pp => pp._id.toString() === i.productId);
      if (!p) throw new Error('Product not found');
      return {
        product: p._id,
        quantity: i.quantity,
        unit: i.unit || p.unit,
        priceRange: p.priceRange,
        notes: i.notes || note
      };
    });
    const inq = await Inquiry.create({ user: req.user._id, items: mapped, status: 'open', messages: [] });
    res.status(201).json({ inquiry: inq });
  } catch (e) { next(e); }
});

// Get a single inquiry for owner/admin
router.get('/:id', requireAuth(), async (req, res, next) => {
  try {
    const inq = await Inquiry.findById(req.params.id).populate('items.product').populate('user','name email role');
    if (!inq) return res.status(404).json({ error: 'Not found' });
    const isOwner = inq.user._id.toString() === req.user._id.toString();
    if (!(isOwner || req.user.role === 'admin')) return res.status(403).json({ error: 'Forbidden' });
    res.json({ inquiry: inq.toObject() });
  } catch (e) { next(e); }
});

// List my inquiries
router.get('/', requireAuth(), async (req, res, next) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { user: req.user._id };
    const list = await Inquiry.find(filter).sort({ createdAt: -1 }).populate('items.product').lean();
    res.json({ inquiries: list });
  } catch (e) { next(e); }
});

// Post a message / price proposal
router.post('/:id/messages', requireAuth(), async (req, res, next) => {
  try {
    const { body, priceProposal } = req.body;
    const inq = await Inquiry.findById(req.params.id);
    if (!inq) return res.status(404).json({ error: 'Not found' });
    const isOwner = inq.user.toString() === req.user._id.toString();
    if (!(isOwner || req.user.role === 'admin')) return res.status(403).json({ error: 'Forbidden' });
    inq.messages.push({ sender: req.user._id, senderRole: req.user.role, body, priceProposal });
    if (priceProposal != null) inq.status = 'negotiating';
    await inq.save();
    res.json({ inquiry: inq });
  } catch (e) { next(e); }
});

// Admin agree prices and close
router.post('/:id/agree', requireAuth('admin'), async (req, res, next) => {
  try {
    const { agreements } = req.body; // [{index, price}]
    const inq = await Inquiry.findById(req.params.id);
    if (!inq) return res.status(404).json({ error: 'Not found' });
    for (const a of agreements || []) {
      if (inq.items[a.index]) {
        inq.items[a.index].agreedPrice = a.price;
      }
    }
    const all = inq.items.every(i => i.agreedPrice != null);
    inq.status = all ? 'agreed' : 'negotiating';
    await inq.save();
    res.json({ inquiry: inq });
  } catch (e) { next(e); }
});

export default router;

