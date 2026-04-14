import mongoose from 'mongoose';

const partSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

partSchema.index({ product: 1 });
partSchema.index({ product: 1, slug: 1 }, { unique: true });

export default mongoose.model('Part', partSchema);
