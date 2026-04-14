import mongoose from 'mongoose';

const subpartSchema = new mongoose.Schema(
  {
    part: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Part',
      required: true,
    },
    product: {
      // Denormalized for fast queries
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    order: { type: Number, default: 0 },
    // createdAt.date is frozen into every filename generated for this subpart — never changes
  },
  { timestamps: true }
);

subpartSchema.index({ part: 1 });
subpartSchema.index({ product: 1 });
subpartSchema.index({ part: 1, name: 1 }, { unique: true });

export default mongoose.model('Subpart', subpartSchema);
