import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: '' },
    tags: [{ type: String, trim: true }],
    collaborators: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role: { type: String, enum: ['editor', 'viewer'], default: 'viewer' },
      },
    ],
    headCommit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Commit',
      default: null,
    },
    totalFiles: { type: Number, default: 0 },
    totalStorageBytes: { type: Number, default: 0 },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

productSchema.index({ owner: 1, isDeleted: 1 });
// Note: slug already has a unique index via `unique: true` in the field definition — no duplicate here

export default mongoose.model('Product', productSchema);
