import mongoose from 'mongoose';

const gcodeMetadataSchema = new mongoose.Schema(
  {
    slicerName: { type: String, default: null },
    slicerVersion: { type: String, default: null },
    layerHeight: { type: Number, default: null },
    estimatedPrintTimeSeconds: { type: Number, default: null },
    filamentUsedGrams: { type: Number, default: null },
    bedTemp: { type: Number, default: null },
    nozzleTemp: { type: Number, default: null },
  },
  { _id: false }
);

const fileVersionSchema = new mongoose.Schema(
  {
    fileAsset: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FileAsset',
      required: true,
    },

    versionNumber: { type: Number, required: true },
    versionLabel: { type: String, default: null },

    // Content-addressable deduplication
    contentHash: { type: String, required: true },

    // Firebase Storage path e.g. "lamp/logo/logo-20260411-6pcs-v01.gcode"
    // null if deduplicated (points to same bytes as another version)
    storageRef: { type: String, default: null },

    // Public download URL cached from Firebase
    downloadUrl: { type: String, default: null },

    fileSizeBytes: { type: Number, required: true },
    originalFilename: { type: String, required: true },
    mimeType: { type: String, default: 'application/octet-stream' },

    gcodeMetadata: { type: gcodeMetadataSchema, default: null },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // immutable
  }
);

fileVersionSchema.index({ fileAsset: 1, versionNumber: 1 });
fileVersionSchema.index({ contentHash: 1 });

export default mongoose.model('FileVersion', fileVersionSchema);
