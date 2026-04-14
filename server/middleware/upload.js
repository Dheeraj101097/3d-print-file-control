import multer from 'multer';

const ALLOWED_TYPES = {
  'model/stl': 'stl',
  'application/sla': 'stl',
  'application/octet-stream': null, // resolved by extension
  'text/plain': 'gcode',
  'application/x-gcode': 'gcode',
};

const ALLOWED_EXTENSIONS = ['.stl', '.step', '.stp', '.gcode', '.gco'];

// Use memory storage so we can compute SHA-256 before deciding where to put it
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const ext = file.originalname.toLowerCase().match(/\.[^.]+$/)?.[0];
  if (ALLOWED_EXTENSIONS.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed. Accepted: ${ALLOWED_EXTENSIONS.join(', ')}`), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB max
});

/**
 * Resolve file type enum from original filename.
 * @param {string} originalname
 * @returns {'stl'|'step'|'gcode'|'other'}
 */
export function resolveFileType(originalname) {
  const ext = originalname.toLowerCase().match(/\.[^.]+$/)?.[0];
  if (ext === '.stl') return 'stl';
  if (ext === '.step' || ext === '.stp') return 'step';
  if (ext === '.gcode' || ext === '.gco') return 'gcode';
  return 'other';
}
