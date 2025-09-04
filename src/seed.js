import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';
import Product from './models/Product.js';

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set');
  await mongoose.connect(uri);
  console.log('Connected');

  // Admin
  const adminEmail = 'admin@example.com';
  const adminPass = 'admin123';
  const exists = await User.findOne({ email: adminEmail });
  if (!exists) {
    await User.create({
      name: 'Admin', email: adminEmail, role: 'admin', passwordHash: await bcrypt.hash(adminPass, 10)
    });
    console.log('Admin created:', adminEmail, adminPass);
  } else { console.log('Admin exists'); }

  // Products
  if ((await Product.countDocuments()) === 0) {
    await Product.insertMany([
      { name: 'Arabica Coffee Beans', slug: 'arabica-coffee', category: 'Coffee', unit: 'per kg', priceRange: { min: 10.5, max: 14.0, currency: 'EUR' }, images: [], description: 'Premium Arabica beans, washed process.' },
      { name: 'Basmati Rice', slug: 'basmati-rice', category: 'Grains', unit: 'per kg', priceRange: { min: 1.5, max: 2.2, currency: 'EUR' }, images: [], description: 'Aged long‑grain basmati.' },
      { name: 'Black Pepper (Whole)', slug: 'black-pepper', category: 'Spices', unit: 'per kg', priceRange: { min: 6.0, max: 8.2, currency: 'EUR' }, images: [], description: 'Strong aroma, sun‑dried.' }
    ]);
    console.log('Seeded products');
  }

  await mongoose.disconnect();
}

run().catch((e) => { console.error(e); process.exit(1); });

