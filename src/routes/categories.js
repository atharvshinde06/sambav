import { Router } from 'express';
import Category from '../models/Category.js';
import { requireAuth } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';

const router = Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.join(process.cwd(), 'uploads')),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    const base = path.basename(file.originalname, ext).replace(/[^a-z0-9_-]+/gi, '-').toLowerCase();
    cb(null, `${Date.now()}-${base}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if ((file.mimetype || '').startsWith('image/')) cb(null, true); else cb(new Error('Only image uploads allowed'));
  },
});

function buildPayload(req) {
  const b = req.body || {};
  const name = typeof b.name === 'string' ? b.name.trim() : b.name;
  const slug = typeof b.slug === 'string' ? b.slug.trim() : b.slug;
  const description = typeof b.description === 'string' && b.description.trim() ? b.description.trim() : undefined;
  const orderRaw = b.order === undefined || b.order === '' ? undefined : Number(b.order);
  const order = Number.isNaN(orderRaw) ? undefined : orderRaw;
  const payload = {
    name: name || undefined,
    slug: slug || undefined,
    description,
    order,
  };
  if (req.file) {
    payload.image = `/uploads/${req.file.filename}`;
  } else if (b.image) {
    payload.image = b.image;
  }
  const removeImage = b.removeImage === 'true' || b.removeImage === true;
  return { payload, removeImage };
}

router.get('/', async (_req, res, next) => {
  try {
    const categories = await Category.find({}).sort({ order: 1, name: 1 }).lean();
    res.json({ categories });
  } catch (e) { next(e); }
});

router.post('/', requireAuth('admin'), upload.single('image'), async (req, res, next) => {
  try {
    const { payload } = buildPayload(req);
    const category = await Category.create(payload);
    res.status(201).json({ category });
  } catch (e) { next(e); }
});

router.put('/:id', requireAuth('admin'), upload.single('image'), async (req, res, next) => {
  try {
    const { payload, removeImage } = buildPayload(req);
    Object.keys(payload).forEach((key) => { if (payload[key] === undefined) delete payload[key]; });

    let update;
    if (removeImage && !req.file) {
      const set = { ...payload };
      if (Object.keys(set).length) {
        update = { $set: set, $unset: { image: '' } };
      } else {
        update = { $unset: { image: '' } };
      }
    } else {
      update = payload;
    }

    const category = await Category.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
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
