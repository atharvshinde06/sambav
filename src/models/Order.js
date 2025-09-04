import mongoose from 'mongoose';

const OrderItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    qty: { type: Number, required: true, min: 1 },
    unit: { type: String },
    priceRange: {
      min: { type: Number, default: 0 },
      max: { type: Number, default: 0 },
      currency: { type: String, default: 'EUR' },
    },
    image: { type: String },
    productId: { type: String },
    agreedPrice: { type: Number },
  },
  { _id: false }
);

const OrderMessageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    senderRole: { type: String, enum: ['user', 'admin'], required: true },
    body: { type: String },
    priceProposal: [{ index: Number, price: Number }],
  },
  { timestamps: true, _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
    items: { type: [OrderItemSchema], required: true },
    status: { type: String, enum: ['pending', 'negotiating', 'proposed', 'confirmed', 'shipped', 'completed', 'cancelled'], default: 'pending', index: true },
    note: { type: String },
    totalMin: { type: Number, default: 0 },
    totalMax: { type: Number, default: 0 },
    currency: { type: String, default: 'EUR' },
    finalTotal: { type: Number },
    messages: [OrderMessageSchema],
    proposal: {
      items: [{ name: String, qty: Number, unit: String, unitPrice: Number, productId: String, image: String }],
      total: Number,
      currency: { type: String, default: 'EUR' },
      note: String,
      createdAt: Date,
    },
    proposalStatus: { type: String, enum: ['none', 'sent', 'approved', 'rejected'], default: 'none', index: true },
    shipment: {
      phase: { type: String, enum: ['harvesting','packing','loading','in_transit','delivered', null], default: null },
      trackingId: { type: String },
      eta: { type: Date },
      events: [{
        phase: String,
        note: String,
        at: { type: Date, default: Date.now }
      }]
    }
  },
  { timestamps: true }
);

export default mongoose.model('Order', OrderSchema);
