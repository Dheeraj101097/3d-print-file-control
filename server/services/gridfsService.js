import { Readable } from 'stream';
import mongoose from 'mongoose';
import { getGridFSBucket } from '../config/db.js';
import { computeHash } from './hashService.js';
import FileVersion from '../models/FileVersion.js';

/**
 * Check if a file with the given SHA-256 hash already exists in GridFS.
 * Returns the existing gridfsId if found, otherwise null.
 * @param {string} contentHash
 * @returns {Promise<mongoose.Types.ObjectId|null>}
 */
export async function findDuplicate(contentHash) {
  const existing = await FileVersion.findOne({ contentHash }, { gridfsId: 1 }).lean();
  return existing?.gridfsId ?? null;
}

/**
 * Upload a buffer to GridFS.
 * @param {Buffer} buffer
 * @param {string} filename - canonical filename for GridFS metadata
 * @param {object} metadata - arbitrary metadata stored alongside the file
 * @returns {Promise<{ gridfsId: ObjectId, contentHash: string, fileSizeBytes: number }>}
 */
export async function uploadToGridFS(buffer, filename, metadata = {}) {
  const bucket = getGridFSBucket();
  const contentHash = computeHash(buffer);

  // Check for duplicate before uploading
  const existingId = await findDuplicate(contentHash);
  if (existingId) {
    return { gridfsId: existingId, contentHash, fileSizeBytes: buffer.length, deduplicated: true };
  }

  return new Promise((resolve, reject) => {
    const readable = Readable.from(buffer);
    const uploadStream = bucket.openUploadStream(filename, {
      metadata: { ...metadata, contentHash },
    });

    readable.pipe(uploadStream);

    uploadStream.on('finish', () => {
      resolve({
        gridfsId: uploadStream.id,
        contentHash,
        fileSizeBytes: buffer.length,
        deduplicated: false,
      });
    });

    uploadStream.on('error', reject);
  });
}

/**
 * Open a GridFS download stream for a given ObjectId.
 * @param {mongoose.Types.ObjectId|string} gridfsId
 * @returns {GridFSBucketReadStream}
 */
export function openDownloadStream(gridfsId) {
  const bucket = getGridFSBucket();
  return bucket.openDownloadStream(new mongoose.Types.ObjectId(gridfsId));
}

/**
 * Delete a file from GridFS by ObjectId.
 * @param {mongoose.Types.ObjectId|string} gridfsId
 */
export async function deleteFromGridFS(gridfsId) {
  const bucket = getGridFSBucket();
  await bucket.delete(new mongoose.Types.ObjectId(gridfsId));
}
