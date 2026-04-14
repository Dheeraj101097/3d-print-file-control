import mongoose from 'mongoose';

const printerProfileSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: { type: String, required: true, trim: true },
    bedWidth: { type: Number, required: true },
    bedDepth: { type: Number, required: true },
    bedHeight: { type: Number, required: true },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

printerProfileSchema.index({ owner: 1 });

export default mongoose.model('PrinterProfile', printerProfileSchema);
