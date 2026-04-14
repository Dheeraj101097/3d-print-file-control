import crypto from 'crypto';

/**
 * Compute SHA-256 hash of a Buffer or string.
 * @param {Buffer|string} data
 * @returns {string} hex string
 */
export function computeHash(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Generate a short commit hash from commit metadata.
 * @param {object} meta - { productId, authorId, timestamp, changes }
 * @returns {string} 8-char hex string
 */
export function generateCommitHash(meta) {
  const payload = JSON.stringify({
    p: meta.productId,
    a: meta.authorId,
    t: meta.timestamp,
    c: meta.changes,
  });
  return crypto.createHash('sha256').update(payload).digest('hex').slice(0, 8);
}
