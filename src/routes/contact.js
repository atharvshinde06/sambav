import { Router } from 'express';
import ContactMessage from '../models/ContactMessage.js';

const router = Router();

// POST /api/contact — accept website contact submissions
router.post('/', async (req, res, next) => {
  try {
    const { name, email, company, message, hp, hcaptchaToken } = req.body || {};

    // Honeypot: must be empty
    if (hp) return res.status(400).json({ error: 'Bad request' });

    // Basic validation
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Please provide name, email and message.' });
    }

    // Basic rate limit per IP: 5 per hour
    const ip = (req.headers['x-forwarded-for']?.toString().split(',')[0] || req.ip || '').trim();
    const since = new Date(Date.now() - 60 * 60 * 1000);
    const recentCount = await ContactMessage.countDocuments({ ip, createdAt: { $gt: since } });
    if (recentCount >= 5) return res.status(429).json({ error: 'Too many submissions. Please try later.' });

    // Optional hCaptcha verification when secret is configured
    try {
      const secret = process.env.HCAPTCHA_SECRET;
      if (secret && hcaptchaToken && typeof fetch === 'function') {
        const form = new URLSearchParams({ secret, response: hcaptchaToken, remoteip: ip });
        const hcRes = await fetch('https://hcaptcha.com/siteverify', { method: 'POST', body: form });
        const hc = await hcRes.json();
        if (!hc.success) return res.status(400).json({ error: 'Captcha verification failed' });
      }
    } catch {
      // Non-fatal: continue without blocking if verification request fails
    }

    const doc = await ContactMessage.create({
      name,
      email,
      company: company || '',
      message,
      ip,
      userAgent: req.headers['user-agent'] || '',
      source: 'website',
    });

    res.status(201).json({ ok: true, id: doc._id });
  } catch (e) { next(e); }
});

export default router;
