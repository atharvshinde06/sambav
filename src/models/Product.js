import mongoose from 'mongoose';

const PriceRangeSchema = new mongoose.Schema(
  { min: Number, max: Number, currency: { type: String, default: 'EUR' } },
  { _id: false }
);

const DimensionsSchema = new mongoose.Schema(
  { length: Number, width: Number, height: Number, unit: { type: String, default: 'cm' } },
  { _id: false }
);

const PackagingSchema = new mongoose.Schema(
  {
    type: String,
    unitsPerPack: Number,
    weightPerPack: Number,
    weightUnit: { type: String, default: 'kg' },
    details: String,
  },
  { _id: false }
);

const PortDetailsSchema = new mongoose.Schema(
  { origin: String, destination: String },
  { _id: false }
);

const DeliveryDetailsSchema = new mongoose.Schema(
  { incoterms: String, leadTimeDays: Number, notes: String },
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
    priceRange: { type: PriceRangeSchema, required: true },
    originCountry: { type: String },
    dimensions: { type: DimensionsSchema },
    packaging: { type: PackagingSchema },
    portDetails: { type: PortDetailsSchema },
    deliveryDetails: { type: DeliveryDetailsSchema },
    certifications: [String],
  },
  { timestamps: true }
);

ProductSchema.index({ name: 'text', description: 'text', category: 'text' });

export default mongoose.model('Product', ProductSchema);
