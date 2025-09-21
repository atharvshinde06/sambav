import { Router } from 'express';
import Product from '../models/Product.js';
import { requireAuth } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.join(process.cwd(), 'uploads')),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    const base = path.basename(file.originalname, ext).replace(/[^a-z0-9_-]+/gi, '-').toLowerCase();
    cb(null, `${Date.now()}-${base}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024, files: 10 },
  fileFilter: (_req, file, cb) => {
    if ((file.mimetype || '').startsWith('image/')) cb(null, true); else cb(new Error('Only image uploads allowed'));
  }
});

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

// Helper to normalize product payload from JSON body or multipart form fields
function buildProductPayload(req) {
  // Handle both JSON and multipart forms
  const b = req.body || {};
  const num = (v) => (v === undefined || v === '' || v === null ? undefined : Number(v));
  const arr = (v) => Array.isArray(v)
    ? v
    : (typeof v === 'string' && v
        ? (v.trim().startsWith('[')
            ? (()=>{ try { const j = JSON.parse(v); return Array.isArray(j) ? j : undefined; } catch { return v.split(','); } })()
            : v.split(',')
          ).map(s=>String(s).trim()).filter(Boolean)
        : undefined);

  // Images via upload
  const uploaded = Array.isArray(req.files) ? req.files.filter(f => (f.mimetype||'').startsWith('image/')).map(f => `/uploads/${f.filename}`) : [];
  let images = [];
  const parsedImages = arr(b.images);
  if (parsedImages) images.push(...parsedImages);
  if (b.image) images.push(b.image); // backward compat single url
  if (uploaded.length) images.push(...uploaded);

  const payload = {
    name: b.name,
    slug: b.slug,
    category: b.category || undefined,
    description: b.description || undefined,
    unit: b.unit || undefined,
    images: images.length ? images : undefined,
    priceRange: {
      min: num(b.min ?? b['priceRange.min']),
      max: num(b.max ?? b['priceRange.max']),
      currency: b.currency ?? b['priceRange.currency'] ?? 'EUR',
    },
    originCountry: b.originCountry || undefined,
    dimensions: (b['dimensions_length']||b['dimensions_width']||b['dimensions_height']||b['dimensions_unit']) ? {
      length: num(b['dimensions_length']),
      width: num(b['dimensions_width']),
      height: num(b['dimensions_height']),
      unit: b['dimensions_unit'] || undefined,
    } : undefined,
    packaging: (b['packaging_type']||b['packaging_unitsPerPack']||b['packaging_weightPerPack']||b['packaging_weightUnit']||b['packaging_details']) ? {
      type: b['packaging_type'] || undefined,
      unitsPerPack: num(b['packaging_unitsPerPack']),
      weightPerPack: num(b['packaging_weightPerPack']),
      weightUnit: b['packaging_weightUnit'] || undefined,
      details: b['packaging_details'] || undefined,
    } : undefined,
    portDetails: (b['port_origin']||b['port_destination']) ? {
      origin: b['port_origin'] || undefined,
      destination: b['port_destination'] || undefined,
    } : undefined,
    deliveryDetails: (b['delivery_incoterms']||b['delivery_leadTimeDays']||b['delivery_notes']) ? {
      incoterms: b['delivery_incoterms'] || undefined,
      leadTimeDays: num(b['delivery_leadTimeDays']),
      notes: b['delivery_notes'] || undefined,
    } : undefined,
    certifications: arr(b['certifications']),
  };
  return payload;
}

// Accept images from any field name to be resilient
router.post('/', requireAuth('admin'), upload.any(), async (req, res, next) => {
  try {
    const payload = buildProductPayload(req);
    const p = await Product.create(payload);
    res.status(201).json({ product: p });
  } catch (e) { next(e); }
});

router.put('/:id', requireAuth('admin'), upload.any(), async (req, res, next) => {
  try {
    const payload = buildProductPayload(req);
    const p = await Product.findByIdAndUpdate(req.params.id, payload, { new: true });
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
