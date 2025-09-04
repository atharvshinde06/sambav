import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export function requireAuth(roles = []) {
  const allowed = Array.isArray(roles) ? roles : [roles];
  return async (req, res, next) => {
    try {
      const hdr = req.headers.authorization || '';
      const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
      if (!token) return res.status(401).json({ error: 'Unauthorized' });
      const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
      const user = await User.findById(payload.sub).lean();
      if (!user) return res.status(401).json({ error: 'Unauthorized' });
      if (allowed.length && !allowed.includes(user.role)) return res.status(403).json({ error: 'Forbidden' });
      req.user = user;
      next();
    } catch (e) { next(e); }
  };
}

export function signToken(user) {
  const payload = { sub: user._id.toString(), role: user.role };
  const secret = process.env.JWT_SECRET || 'dev-secret';
  return jwt.sign(payload, secret, { expiresIn: '7d' });
}

