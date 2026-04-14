import mongoose from 'mongoose';

const fileAssetSchema = new mongoose.Schema(
  {
    subpart: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subpart',
      required: true,
    },
    part: { type: mongoose.Schema.Types.ObjectId, ref: 'Part', required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },

    fileType: {
      type: String,
      enum: ['stl', 'step', 'gcode', 'other'],
      required: true,
    },

    // Auto-generated canonical name — updated on every version bump
    canonicalName: { type: String, required: true },

    // Naming convention fields — frozen at creation
    subpartName: { type: String, required: true }, // user-provided label (default: part name)
    dateCreated: { type: Date, required: true },   // frozen from Subpart.createdAt
    piecesPerPrint: { type: Number, default: null }, // gcode only

    printerProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PrinterProfile',
      default: null,
    },

    // VCS state
    currentVersion: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FileVersion',
      default: null,
    },
    versionCount: { type: Number, default: 0 },
    totalStorageBytes: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Unique slot: (subpart + fileType + piecesPerPrint + subpartName)
// Different label = different row, same label = new version of same row
fileAssetSchema.index(
  { subpart: 1, fileType: 1, piecesPerPrint: 1, subpartName: 1 },
  { unique: true }
);
fileAssetSchema.index({ product: 1 });
fileAssetSchema.index({ part: 1 });

export default mongoose.model('FileAsset', fileAssetSchema);
