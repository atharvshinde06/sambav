import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import mongoose from 'mongoose';

import authRouter from './routes/auth.js';
import productRouter from './routes/products.js';
import inquiryRouter from './routes/inquiries.js';
import ordersRouter from './routes/orders.js';
import usersRouter from './routes/users.js';

const app = express();

const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:3000';
// Support multiple origins via comma-separated env
const ORIGINS = CLIENT_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean);
const EXACTS = ORIGINS.filter((o) => !o.startsWith('*.'));
const WILDCARDS = ORIGINS.filter((o) => o.startsWith('*.')).map((o) => o.slice(1)); // '.netlify.app'
const LOCALHOST_RE = /^https?:\/\/(localhost|127\.0\.0\.1)(:\\d+)?$/i;
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    const allowed = EXACTS.includes(origin)
      || WILDCARDS.some((suffix) => origin.endsWith(suffix))
      || LOCALHOST_RE.test(origin);
    return cb(null, allowed);
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'b2b-backend' }));

app.use('/api/auth', authRouter);
app.use('/api/products', productRouter);
app.use('/api/inquiries', inquiryRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/users', usersRouter);

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`Server running on :${PORT}`));
  })
  .catch((e) => {
    console.error('MongoDB connection error', e.message);
    process.exit(1);
  });
