import { Readable } from 'stream';
import mongoose from 'mongoose';
import { getGridFSBucket } from '../config/db.js';
import { computeHash } from './hashService.js';
import FileVersion from '../models/FileVersion.js';

/**
 * Build the logical storage path (stored as GridFS filename).
 * e.g. "lamp/logo/logo-20260411-6pcs-v01.gcode"
 * Visible in Atlas under printfiles.files → filename field.
 */
export function buildStoragePath(productSlug, partSlug, canonicalFilename) {
  return `${productSlug}/${partSlug}/${canonicalFilename}`;
}

/**
 * Upload a buffer to MongoDB GridFS (printfiles bucket).
 * Deduplicates by SHA-256 — same bytes → no re-upload, new version record still created.
 *
 * @param {Buffer}  buffer
 * @param {string}  storagePath  e.g. "lamp/logo/logo-20260411-6pcs-v01.gcode"
 * @param {string}  mimeType
 * @param {string}  [precomputedHash]  optional, avoids double hashing
 * @returns {{ storageRef, contentHash, fileSizeBytes, downloadUrl, deduplicated }}
 */
export async function uploadFile(buffer, storagePath, mimeType, precomputedHash = null) {
  const contentHash = precomputedHash || computeHash(buffer);

  // Deduplication: same bytes already stored? Reuse, don't re-upload.
  const existing = await FileVersion.findOne(
    { contentHash, storageRef: { $ne: null } },
    { storageRef: 1 }
  ).lean();

  if (existing) {
    return {
      storageRef: null,            // deduplicated — no new GridFS object
      contentHash,
      fileSizeBytes: buffer.length,
      downloadUrl: null,
      deduplicated: true,
    };
  }

  // Upload to GridFS
  const bucket = getGridFSBucket();
  const uploadStream = bucket.openUploadStream(storagePath, {
    contentType: mimeType || 'application/octet-stream',
    metadata: { contentHash, storagePath },
  });

  await new Promise((resolve, reject) => {
    Readable.from(buffer).pipe(uploadStream);
    uploadStream.on('finish', resolve);
    uploadStream.on('error', reject);
  });

  return {
    storageRef: uploadStream.id.toString(),   // GridFS ObjectId as hex string
    contentHash,
    fileSizeBytes: buffer.length,
    downloadUrl: null,
    deduplicated: false,
  };
}

/**
 * Open a GridFS download stream for a given storageRef (hex ObjectId string).
 * Returns a readable stream — pipe it to the Express response.
 *
 * Usage: pipeFileToResponse(ref).on('error', next).pipe(res)
 */
export function pipeFileToResponse(storageRef) {
  const bucket = getGridFSBucket();
  return bucket.openDownloadStream(new mongoose.Types.ObjectId(storageRef));
}
