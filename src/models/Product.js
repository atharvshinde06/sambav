import mongoose from 'mongoose';

const PriceRangeSchema = new mongoose.Schema(
  { min: Number, max: Number, currency: { type: String, default: 'EUR' } },
  { _id: false }
);

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    category: { type: String, index: true },
    description: String,
    images: [String],
    unit: { type: String, default: 'per kg' },
    priceRange: { type: PriceRangeSchema, required: true }
  },
  { timestamps: true }
);

ProductSchema.index({ name: 'text', description: 'text', category: 'text' });

export default mongoose.model('Product', ProductSchema);

