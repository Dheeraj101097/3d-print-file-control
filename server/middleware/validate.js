import { z } from 'zod';

/**
 * Returns an Express middleware that validates req.body against a Zod schema.
 * On failure, responds 400 with field-level error messages.
 */
export const validateBody = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const errors = result.error.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return res.status(400).json({ message: 'Validation failed', errors });
  }
  req.body = result.data; // use the parsed (coerced) data
  next();
};

// ── Schemas ─────────────────────────────────────────────────────────────────

export const registerSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    displayName: z.string().max(60).optional(),
  })
  .transform((data) => ({
    ...data,
    // Default displayName to the part before @ in email
    displayName: data.displayName?.trim() || data.email.split('@')[0],
  }));

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const productSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().default(''),
  tags: z.array(z.string()).optional().default([]),
});

export const partSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().default(''),
  order: z.number().int().optional().default(0),
});

export const subpartSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().default(''),
  order: z.number().int().optional().default(0),
});

export const pushFileSchema = z.object({
  subpartId: z.string().min(1),
  piecesPerPrint: z.coerce.number().int().positive().optional().nullable(),
  printerProfileId: z.string().optional().nullable(),
  commitMessage: z.string().max(500).optional(),
  versionLabel: z.string().max(100).optional().nullable(),
});

export const rollbackSchema = z.object({
  targetVersionId: z.string().min(1),
  message: z.string().max(500).optional(),
});

export const tagCommitSchema = z.object({
  tag: z.string().min(1).max(50),
});

export const printerProfileSchema = z.object({
  name: z.string().min(1).max(100),
  bedWidth: z.coerce.number().positive(),
  bedDepth: z.coerce.number().positive(),
  bedHeight: z.coerce.number().positive(),
  notes: z.string().max(500).optional().default(''),
});

export const cloneSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().default(''),
});
