import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import mongoose from 'mongoose';

import authRouter from './routes/auth.js';
import productRouter from './routes/products.js';
import categoryRouter from './routes/categories.js';
import inquiryRouter from './routes/inquiries.js';
import quotesRouter from './routes/quotes.js';
import ordersRouter from './routes/orders.js';
import usersRouter from './routes/users.js';
import contactRouter from './routes/contact.js';
import path from 'path';
import fs from 'fs';

const app = express();

const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:3000';
// Support multiple origins via comma-separated env
// TEMP: Allow any origin (reflect request origin) while you debug CORS
// WARNING: This is permissive. Restrict this in production to known origins.
app.use(cors({
  origin: true, // reflect the request Origin header
  credentials: true,
  methods: ['GET','HEAD','PUT','PATCH','POST','DELETE'],
  allowedHeaders: ['Content-Type','Authorization'],
}));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'b2b-backend' }));

app.use('/api/auth', authRouter);
app.use('/api/products', productRouter);
app.use('/api/categories', categoryRouter);
app.use('/api/inquiries', inquiryRouter);
app.use('/api/quotes', quotesRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/users', usersRouter);
app.use('/api/contact', contactRouter);

// Static serving for uploaded product images
try { fs.mkdirSync(path.join(process.cwd(), 'uploads'), { recursive: true }); } catch {}
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

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
