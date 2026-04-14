import { Router } from 'express';
import FileAsset from '../models/FileAsset.js';
import FileVersion from '../models/FileVersion.js';
import Product from '../models/Product.js';
import { protect } from '../middleware/auth.js';
import { pipeFileToResponse } from '../services/storageService.js';
import { generateCanonicalName } from '../services/namingEngine.js';

const router = Router();
router.use(protect);

// ── GET /api/files/:fileAssetId/versions ─────────────────────────────────────
// Full version history for a file asset
router.get('/files/:fileAssetId/versions', async (req, res, next) => {
  try {
    const fileAsset = await FileAsset.findById(req.params.fileAssetId);
    if (!fileAsset) return res.status(404).json({ message: 'File not found' });

    await assertProductAccess(fileAsset.product, req.user._id);

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 50);

    const [versions, total] = await Promise.all([
      FileVersion.find({ fileAsset: fileAsset._id })
        .sort({ versionNumber: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('uploadedBy', 'displayName'),
      FileVersion.countDocuments({ fileAsset: fileAsset._id }),
    ]);

    res.json({ fileAsset, versions, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/versions/:versionId/download ────────────────────────────────────
// Download a specific historical version by its ID
router.get('/versions/:versionId/download', async (req, res, next) => {
  try {
    const version = await FileVersion.findById(req.params.versionId).populate('fileAsset');
    if (!version) return res.status(404).json({ message: 'Version not found' });

    await assertProductAccess(version.fileAsset.product, req.user._id);

    const ref = await resolveStorageRef(version);
    if (!ref) return res.status(404).json({ message: 'File data not found in storage' });

    // Build the versioned filename for the download header
    const canonicalName = generateCanonicalName({
      subpartName: version.fileAsset.subpartName,
      subpartCreatedAt: version.fileAsset.dateCreated,
      fileType: version.fileAsset.fileType,
      piecesPerPrint: version.fileAsset.piecesPerPrint,
      versionNumber: version.versionNumber,
    });

    console.log(`⬇️  [DOWNLOAD] ${canonicalName} (v${version.versionNumber})`);
    res.setHeader('Content-Disposition', `attachment; filename="${canonicalName}"`);
    res.setHeader('Content-Type', version.mimeType || 'application/octet-stream');
    pipeFileToResponse(ref).on('error', next).pipe(res);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/files/:fileAssetId/rollback ────────────────────────────────────
// Roll back to a previous version (creates a new forward version — no history lost)
router.post('/files/:fileAssetId/rollback', async (req, res, next) => {
  try {
    const { targetVersionId, note } = req.body;
    if (!targetVersionId) return res.status(400).json({ message: 'targetVersionId is required' });

    const fileAsset = await FileAsset.findById(req.params.fileAssetId);
    if (!fileAsset) return res.status(404).json({ message: 'File not found' });

    await assertProductAccess(fileAsset.product, req.user._id);

    const target = await FileVersion.findOne({ _id: targetVersionId, fileAsset: fileAsset._id });
    if (!target) return res.status(404).json({ message: 'Target version not found' });

    const newVersionNumber = fileAsset.versionCount + 1;

    // Generate the canonical name for the new version
    const canonicalName = generateCanonicalName({
      subpartName: fileAsset.subpartName,
      subpartCreatedAt: fileAsset.dateCreated,
      fileType: fileAsset.fileType,
      piecesPerPrint: fileAsset.piecesPerPrint,
      versionNumber: newVersionNumber,
    });

    // Create new version pointing to the same storage bytes as the target
    const newVersion = await FileVersion.create({
      fileAsset: fileAsset._id,
      versionNumber: newVersionNumber,
      versionLabel: note || `Restored from v${String(target.versionNumber).padStart(2, '0')}`,
      contentHash: target.contentHash,
      storageRef: null,          // deduplicated — shares bytes with target
      downloadUrl: target.downloadUrl,
      fileSizeBytes: target.fileSizeBytes,
      originalFilename: target.originalFilename,
      mimeType: target.mimeType,
      gcodeMetadata: target.gcodeMetadata,
      uploadedBy: req.user._id,
    });

    // Update FileAsset HEAD
    await FileAsset.findByIdAndUpdate(fileAsset._id, {
      currentVersion: newVersion._id,
      canonicalName,
      $inc: { versionCount: 1 },
    });

    res.json({
      fileVersion: newVersion,
      canonicalName,
      message: `Restored to version v${String(target.versionNumber).padStart(2, '0')} as ${canonicalName}`,
    });
  } catch (err) {
    next(err);
  }
});

// ── Helpers ──────────────────────────────────────────────────────────────────

async function assertProductAccess(productId, userId) {
  const product = await Product.findOne({
    _id: productId,
    isDeleted: false,
    $or: [{ owner: userId }, { 'collaborators.user': userId }],
  });
  if (!product) {
    const err = new Error('Access denied');
    err.status = 403;
    throw err;
  }
  return product;
}

async function resolveStorageRef(version) {
  if (version.storageRef) return version.storageRef;
  const source = await FileVersion.findOne({
    contentHash: version.contentHash,
    storageRef: { $ne: null },
  }).lean();
  return source?.storageRef ?? null;
}

export default router;
