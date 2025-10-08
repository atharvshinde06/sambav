import mongoose from 'mongoose';

const ProductQuoteSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true },
    phone: { type: String },
    country: { type: String },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    status: { type: String, enum: ['new', 'viewed', 'closed'], default: 'new', index: true },
  },
  { timestamps: true }
);

export default mongoose.model('ProductQuote', ProductQuoteSchema);
