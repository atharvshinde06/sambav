import mongoose from 'mongoose';

function slugify(input = '') {
  return String(input)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

const CategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true },
    description: { type: String },
    image: { type: String },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

CategorySchema.pre('validate', function (next) {
  if (!this.slug && this.name) {
    this.slug = slugify(this.name);
  } else if (this.slug) {
    this.slug = slugify(this.slug);
  }
  if (this.name) {
    this.name = this.name.trim();
  }
  next();
});

export default mongoose.model('Category', CategorySchema);
