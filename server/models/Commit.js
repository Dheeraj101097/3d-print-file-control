import mongoose from 'mongoose';

const changeSchema = new mongoose.Schema(
  {
    fileAsset: { type: mongoose.Schema.Types.ObjectId, ref: 'FileAsset', required: true },
    fileVersion: { type: mongoose.Schema.Types.ObjectId, ref: 'FileVersion', required: true },
    changeType: { type: String, enum: ['added', 'modified', 'deleted'], required: true },
    previousVersion: { type: mongoose.Schema.Types.ObjectId, ref: 'FileVersion', default: null },
  },
  { _id: false }
);

const commitSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    shortHash: { type: String, required: true }, // first 8 chars of SHA-256
    message: { type: String, required: true, trim: true },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    changes: [changeSchema],
    // DAG linkage — foundation for future branch support
    parentCommit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Commit',
      default: null,
    },
    tags: [{ type: String, trim: true }],
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // commits are immutable
  }
);

commitSchema.index({ product: 1, createdAt: -1 });
commitSchema.index({ shortHash: 1 });

export default mongoose.model('Commit', commitSchema);
