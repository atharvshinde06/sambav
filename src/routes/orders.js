import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import Order from '../models/Order.js';

const router = Router();

// Create an order from cart items
router.post('/', requireAuth(), async (req, res, next) => {
  try {
    const { items, note } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'No items' });
    const mapped = items.map((it) => ({
      name: it.name,
      qty: Number(it.qty || 1),
      unit: it.unit,
      priceRange: {
        min: Number(it?.priceRange?.min || 0),
        max: Number(it?.priceRange?.max || 0),
        currency: it?.priceRange?.currency || 'EUR',
      },
      image: it.image,
      productId: it.id || it.productId,
    }));
    const currency = mapped[0]?.priceRange?.currency || 'EUR';
    const totalMin = mapped.reduce((s, x) => s + (x.priceRange.min || 0) * x.qty, 0);
    const totalMax = mapped.reduce((s, x) => s + (x.priceRange.max || 0) * x.qty, 0);
    const order = await Order.create({
      user: req.user._id,
      items: mapped,
      status: 'pending',
      note: note || '',
      totalMin,
      totalMax,
      currency,
    });
    res.status(201).json({ order });
  } catch (e) { next(e); }
});

// List my orders (admin sees all)
router.get('/', requireAuth(), async (req, res, next) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const base = isAdmin ? (req.query.userId ? { user: req.query.userId } : {}) : { user: req.user._id };
    const filter = { ...base };
    if (req.query.status) {
      const statuses = String(req.query.status).split(',');
      filter.status = { $in: statuses };
    }
    if (req.query.phase) {
      filter['shipment.phase'] = String(req.query.phase);
    }
    const orders = await Order.find(filter).sort({ createdAt: -1 }).populate('user','name email role').lean();
    res.json({ orders });
  } catch (e) { next(e); }
});

// Get single order
router.get('/:id', requireAuth(), async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).lean();
    if (!order) return res.status(404).json({ error: 'Not found' });
    const isOwner = order.user.toString() === req.user._id.toString();
    if (!(isOwner || req.user.role === 'admin')) return res.status(403).json({ error: 'Forbidden' });
    res.json({ order });
  } catch (e) { next(e); }
});

export default router;

// Post a chat message and optionally propose prices
router.post('/:id/messages', requireAuth(), async (req, res, next) => {
  try {
    const { body, priceProposal } = req.body || {};
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Not found' });
    const isOwner = order.user.toString() === req.user._id.toString();
    if (!(isOwner || req.user.role === 'admin')) return res.status(403).json({ error: 'Forbidden' });

    order.messages.push({ sender: req.user._id, senderRole: req.user.role, body: body || '', priceProposal });

    if (Array.isArray(priceProposal) && priceProposal.length) {
      for (const p of priceProposal) {
        if (order.items[p.index]) order.items[p.index].agreedPrice = Number(p.price);
      }
      const all = order.items.every((i) => i.agreedPrice != null);
      order.status = all ? 'proposed' : 'negotiating';
    } else if (order.status === 'pending') {
      order.status = 'negotiating';
    }

    await order.save();
    const fresh = await Order.findById(order._id).populate('user','name email role').lean();
    res.json({ order: fresh });
  } catch (e) { next(e); }
});

// Mark as shipped (admin only)
router.post('/:id/ship', requireAuth('admin'), async (req, res, next) => {
  try {
    const order = await Order.findByIdAndUpdate(req.params.id, { status: 'shipped' }, { new: true });
    if (!order) return res.status(404).json({ error: 'Not found' });
    res.json({ order });
  } catch (e) { next(e); }
});

// Mark as completed (admin only)
router.post('/:id/complete', requireAuth('admin'), async (req, res, next) => {
  try {
    const order = await Order.findByIdAndUpdate(req.params.id, { status: 'completed' }, { new: true });
    if (!order) return res.status(404).json({ error: 'Not found' });
    res.json({ order });
  } catch (e) { next(e); }
});

// Admin updates shipment phase and details
router.post('/:id/shipment', requireAuth('admin'), async (req, res, next) => {
  try {
    const { phase, note, trackingId, eta } = req.body || {};
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Not found' });
    order.shipment = order.shipment || {};
    if (phase) order.shipment.phase = phase;
    if (trackingId != null) order.shipment.trackingId = trackingId;
    if (eta != null) order.shipment.eta = eta ? new Date(eta) : undefined;
    order.shipment.events = order.shipment.events || [];
    if (phase || note) order.shipment.events.push({ phase: phase || order.shipment.phase, note: note || '' });
    await order.save();
    res.json({ order });
  } catch (e) { next(e); }
});

// Admin sends final proposal for approval
router.post('/:id/propose', requireAuth('admin'), async (req, res, next) => {
  try {
    const { items = [], note } = req.body || {};
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Not found' });

    items.forEach((x) => {
      if (order.items[x.index]) {
        if (x.unitPrice != null) order.items[x.index].agreedPrice = Number(x.unitPrice);
        if (x.qty != null) order.items[x.index].qty = Number(x.qty);
      }
    });

    const snapshot = order.items.map((it) => ({
      name: it.name,
      qty: it.qty,
      unit: it.unit,
      unitPrice: it.agreedPrice ?? it.priceRange?.min ?? 0,
      productId: it.productId,
      image: it.image,
    }));
    const currency = order.currency || 'EUR';
    const total = snapshot.reduce((s, i) => s + (i.unitPrice || 0) * (i.qty || 0), 0);

    order.proposal = { items: snapshot, total, currency, note: note || '', createdAt: new Date() };
    order.proposalStatus = 'sent';
    order.status = 'proposed';
    await order.save();
    order.messages.push({ sender: req.user._id, senderRole: 'admin', body: 'Sent final proposal', priceProposal: [] });
    await order.save();
    const fresh = await Order.findById(order._id).populate('user','name email role').lean();
    res.json({ order: fresh });
  } catch (e) { next(e); }
});

// User approves proposal
router.post('/:id/approve', requireAuth(), async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Not found' });
    const isOwner = order.user.toString() === req.user._id.toString();
    if (!isOwner) return res.status(403).json({ error: 'Forbidden' });
    if (order.proposalStatus !== 'sent') return res.status(400).json({ error: 'No proposal to approve' });

    order.proposalStatus = 'approved';
    order.status = 'confirmed';
    order.finalTotal = order.proposal?.total || order.items.reduce((s,i)=>s+(i.agreedPrice||0)*i.qty,0);
    await order.save();
    order.messages.push({ sender: req.user._id, senderRole: 'user', body: 'Approved proposal', priceProposal: [] });
    await order.save();
    const fresh = await Order.findById(order._id).populate('user','name email role').lean();
    res.json({ order: fresh });
  } catch (e) { next(e); }
});

// User rejects proposal
router.post('/:id/reject', requireAuth(), async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Not found' });
    const isOwner = order.user.toString() === req.user._id.toString();
    if (!isOwner) return res.status(403).json({ error: 'Forbidden' });
    if (order.proposalStatus !== 'sent') return res.status(400).json({ error: 'No proposal to reject' });

    order.proposalStatus = 'rejected';
    order.status = 'negotiating';
    await order.save();
    order.messages.push({ sender: req.user._id, senderRole: 'user', body: 'Rejected proposal', priceProposal: [] });
    await order.save();
    const fresh = await Order.findById(order._id).populate('user','name email role').lean();
    res.json({ order: fresh });
  } catch (e) { next(e); }
});

// Cancel order (admin anytime; user before approval)
router.post('/:id/cancel', requireAuth(), async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Not found' });
    const isOwner = order.user.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isAdmin && !isOwner) return res.status(403).json({ error: 'Forbidden' });
    if (!isAdmin) {
      if (order.proposalStatus === 'approved' || ['shipped','completed','cancelled'].includes(order.status)) {
        return res.status(400).json({ error: 'Cannot cancel at this stage' });
      }
    }
    order.status = 'cancelled';
    await order.save();
    order.messages.push({ sender: req.user._id, senderRole: req.user.role, body: 'Order cancelled', priceProposal: [] });
    await order.save();
    const fresh = await Order.findById(order._id).populate('user','name email role').lean();
    res.json({ order: fresh });
  } catch (e) { next(e); }
});
