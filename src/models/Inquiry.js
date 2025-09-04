import mongoose from 'mongoose';

const PriceRangeSnapshot = new mongoose.Schema(
  { min: Number, max: Number, currency: { type: String, default: 'EUR' } },
  { _id: false }
);

const InquiryItem = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1 },
    unit: { type: String, default: 'per kg' },
    priceRange: { type: PriceRangeSnapshot, required: true },
    notes: String,
    agreedPrice: Number
  },
  { _id: false }
);

const Message = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    senderRole: { type: String, enum: ['user', 'admin'], required: true },
    body: String,
    priceProposal: Number,
    createdAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const InquirySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: { type: [InquiryItem], default: [] },
    status: { type: String, enum: ['open', 'negotiating', 'agreed', 'closed'], default: 'open', index: true },
    messages: { type: [Message], default: [] }
  },
  { timestamps: true }
);

export default mongoose.model('Inquiry', InquirySchema);

