import { Router } from 'express';
import Part from '../models/Part.js';
import Subpart from '../models/Subpart.js';
import Product from '../models/Product.js';
import FileAsset from '../models/FileAsset.js';
import FileVersion from '../models/FileVersion.js';
import { protect } from '../middleware/auth.js';
import { upload, resolveFileType } from '../middleware/upload.js';
import { generateCanonicalName } from '../services/namingEngine.js';
import { uploadFile, buildStoragePath, pipeFileToResponse } from '../services/storageService.js';
import { parseGcodeMetadata } from '../services/commitService.js';
import { computeHash } from '../services/hashService.js';

const router = Router();
router.use(protect);

// ── GET /api/parts/:partId/files ─────────────────────────────────────────────
router.get('/parts/:partId/files', async (req, res, next) => {
  try {
    const part = await Part.findById(req.params.partId);
    if (!part) return res.status(404).json({ message: 'Part not found' });

    await assertProductAccess(part.product, req.user._id);

    const fileAssets = await FileAsset.find({ part: part._id })
      .populate('currentVersion', 'versionNumber fileSizeBytes createdAt contentHash downloadUrl gcodeMetadata')
      .sort({ fileType: 1, subpartName: 1, piecesPerPrint: 1 });

    console.log(`📂 [LIST] Part "${part.name}" → ${fileAssets.length} file(s)`);
    res.json(fileAssets);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/files/upload ────────────────────────────────────────────────────
router.post('/files/upload', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file attached' });

    const { partId, piecesPerPrint, commitMessage, fileLabel } = req.body;
    if (!partId) return res.status(400).json({ message: 'partId is required' });

    const part = await Part.findById(partId);
    if (!part) return res.status(404).json({ message: 'Part not found' });

    const product = await assertProductAccess(part.product, req.user._id);

    const fileType = resolveFileType(req.file.originalname);
    const piecesNum = piecesPerPrint ? parseInt(piecesPerPrint) : null;
    const label = (fileLabel || part.name).trim().slice(0, 40) || part.name;

    console.log(`\n📤 [UPLOAD] ──────────────────────────────────────`);
    console.log(`   Product : ${product.name}`);
    console.log(`   Part    : ${part.name}`);
    console.log(`   File    : ${req.file.originalname} (${(req.file.size / 1024).toFixed(1)} KB)`);
    console.log(`   Type    : ${fileType}`);
    console.log(`   Label   : "${label}"`);
    console.log(`   Pieces  : ${piecesNum ?? '—'}`);

    const contentHash = computeHash(req.file.buffer);
    console.log(`   Hash    : ${contentHash.slice(0, 12)}...`);

    // Auto-find or create the Subpart for this part
    let subpart = await Subpart.findOne({ part: part._id, product: part.product });
    if (!subpart) {
      subpart = await Subpart.create({ part: part._id, product: part.product, name: part.name });
      console.log(`   Subpart : created new "${subpart.name}"`);
    }

    // Find FileAsset slot: (subpart + fileType + piecesPerPrint + label)
    let fileAsset = await FileAsset.findOne({
      subpart: subpart._id,
      fileType,
      piecesPerPrint: piecesNum ?? null,
      subpartName: label,
    });

    const isNew = !fileAsset;

    // Warn if identical to current HEAD (but still save — version always increments)
    let sameAsPrevious = false;
    if (!isNew && fileAsset.currentVersion) {
      const current = await FileVersion.findById(fileAsset.currentVersion).select('contentHash versionNumber').lean();
      if (current && current.contentHash === contentHash) {
        sameAsPrevious = true;
        console.log(`⚠️  [UPLOAD] Same bytes as v${String(current.versionNumber).padStart(2, '0')} — saving new version anyway`);
      }
    }

    const nextVersion = isNew ? 1 : fileAsset.versionCount + 1;

    if (isNew) {
      console.log(`🆕 [UPLOAD] New file slot → will be v01`);
    } else {
      console.log(`🔄 [UPLOAD] Existing slot "${fileAsset.canonicalName}" → bumping to v${String(nextVersion).padStart(2, '0')}`);
    }

    const canonicalName = generateCanonicalName({
      subpartName: label,
      subpartCreatedAt: subpart.createdAt,
      fileType,
      piecesPerPrint: piecesNum,
      versionNumber: nextVersion,
    });

    const storagePath = buildStoragePath(product.slug, part.slug, canonicalName);
    console.log(`   Path    : ${storagePath}`);

    const { storageRef, fileSizeBytes, downloadUrl, deduplicated } =
      await uploadFile(req.file.buffer, storagePath, req.file.mimetype, contentHash);

    if (deduplicated) {
      console.log(`♻️  [UPLOAD] Deduplicated — same bytes already in GridFS, skipping re-upload`);
    } else {
      console.log(`💾 [UPLOAD] Stored in GridFS (${(fileSizeBytes / 1024).toFixed(1)} KB)`);
    }

    const gcodeMetadata = fileType === 'gcode' ? parseGcodeMetadata(req.file.buffer) : null;

    if (isNew) {
      fileAsset = await FileAsset.create({
        subpart: subpart._id,
        part: part._id,
        product: part.product,
        fileType,
        canonicalName,
        subpartName: label,
        dateCreated: subpart.createdAt,
        piecesPerPrint: piecesNum,
        printerProfile: null,
        versionCount: 0,
        totalStorageBytes: 0,
      });
    }

    const fileVersion = await FileVersion.create({
      fileAsset: fileAsset._id,
      versionNumber: nextVersion,
      contentHash,
      storageRef: deduplicated ? null : storageRef,
      downloadUrl,
      fileSizeBytes,
      originalFilename: req.file.originalname,
      mimeType: req.file.mimetype || 'application/octet-stream',
      gcodeMetadata,
      uploadedBy: req.user._id,
    });

    await FileAsset.findByIdAndUpdate(fileAsset._id, {
      currentVersion: fileVersion._id,
      canonicalName,
      $inc: { versionCount: 1, totalStorageBytes: deduplicated ? 0 : fileSizeBytes },
    });

    await Product.findByIdAndUpdate(part.product, {
      $inc: {
        totalFiles: isNew ? 1 : 0,
        totalStorageBytes: deduplicated ? 0 : fileSizeBytes,
      },
    });

    const updatedAsset = await FileAsset.findById(fileAsset._id).populate('currentVersion');

    console.log(`✅ [UPLOAD] Done → "${canonicalName}" (v${String(nextVersion).padStart(2, '0')})`);
    console.log(`──────────────────────────────────────────────────\n`);

    res.status(201).json({
      fileAsset: updatedAsset,
      fileVersion,
      canonicalName,
      partId,
      downloadUrl,
      deduplicated,
      sameAsPrevious,
      message: `Saved as ${canonicalName}`,
    });
  } catch (err) {
    console.error(`❌ [UPLOAD] Error:`, err.message);
    next(err);
  }
});

// ── GET /api/files/:fileAssetId/download ─────────────────────────────────────
router.get('/files/:fileAssetId/download', async (req, res, next) => {
  try {
    const fileAsset = await FileAsset.findById(req.params.fileAssetId).populate('currentVersion');
    if (!fileAsset) return res.status(404).json({ message: 'File not found' });

    await assertProductAccess(fileAsset.product, req.user._id);

    const version = fileAsset.currentVersion;
    if (!version) return res.status(404).json({ message: 'No versions uploaded yet' });

    const ref = await resolveStorageRef(version);
    if (!ref) return res.status(404).json({ message: 'File data not found in storage' });

    console.log(`⬇️  [DOWNLOAD] ${fileAsset.canonicalName} (latest v${version.versionNumber})`);
    res.setHeader('Content-Disposition', `attachment; filename="${fileAsset.canonicalName}"`);
    res.setHeader('Content-Type', version.mimeType || 'application/octet-stream');
    pipeFileToResponse(ref).on('error', next).pipe(res);
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
