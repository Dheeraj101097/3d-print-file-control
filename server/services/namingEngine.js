import { format } from 'date-fns';

/**
 * Pure function — no side effects, no DB calls.
 * Generates a canonical filename for a 3D print asset.
 *
 * Schema:
 *   gcode:   [subpartName]-[YYYYMMDD]-[N]pcs-v[NN].[ext]
 *   stl/step: [subpartName]-[YYYYMMDD]-v[NN].[ext]
 *
 * @param {object} opts
 * @param {string}  opts.subpartName       - raw subpart name
 * @param {Date}    opts.subpartCreatedAt  - FROZEN creation date of the subpart
 * @param {string}  opts.fileType          - 'stl' | 'step' | 'gcode' | 'other'
 * @param {number|null} opts.piecesPerPrint - required for gcode, null otherwise
 * @param {number}  opts.versionNumber     - 1-based monotonic version counter
 * @returns {string} e.g. "logo-20260411-6pcs-v02.gcode"
 */
export function generateCanonicalName({
  subpartName,
  subpartCreatedAt,
  fileType,
  piecesPerPrint,
  versionNumber,
}) {
  const safeName = sanitizeName(subpartName);
  const dateStr = format(new Date(subpartCreatedAt), 'yyyyMMdd');
  const version = `v${String(versionNumber).padStart(2, '0')}`;
  const ext = fileType.toLowerCase();

  if (fileType === 'gcode' && piecesPerPrint != null) {
    return `${safeName}-${dateStr}-${piecesPerPrint}pcs-${version}.${ext}`;
  }
  return `${safeName}-${dateStr}-${version}.${ext}`;
}

/**
 * Sanitize a subpart name for use in a filename:
 * - lowercase
 * - spaces and underscores → hyphens
 * - strip anything that's not alphanumeric or hyphen
 * - collapse consecutive hyphens
 * - max 40 chars
 */
export function sanitizeName(name) {
  return name
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

/**
 * Client-side preview helper — same logic, used in the Upload Wizard
 * to show the user the canonical name before pushing.
 */
export function previewCanonicalName(opts) {
  return generateCanonicalName(opts);
}
