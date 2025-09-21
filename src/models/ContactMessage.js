import mongoose from 'mongoose';

const ContactMessageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true },
    company: { type: String },
    message: { type: String, required: true },
    source: { type: String, default: 'website' },
    status: { type: String, enum: ['new','handled'], default: 'new', index: true },
    ip: { type: String },
    userAgent: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model('ContactMessage', ContactMessageSchema);

