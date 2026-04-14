import { Router } from 'express';
import Product from '../models/Product.js';
import Part from '../models/Part.js';
import Subpart from '../models/Subpart.js';
import FileAsset from '../models/FileAsset.js';
import FileVersion from '../models/FileVersion.js';
import Commit from '../models/Commit.js';
import { protect } from '../middleware/auth.js';
import { validateBody, productSchema, cloneSchema } from '../middleware/validate.js';

const router = Router();
router.use(protect);

/** Slugify a name */
const slugify = (name) =>
  name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

/** Ensure slug uniqueness by appending a counter if needed */
async function uniqueSlug(base) {
  let slug = base;
  let i = 1;
  while (await Product.exists({ slug })) {
    slug = `${base}-${i++}`;
  }
  return slug;
}

// GET /api/products
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const filter = {
      isDeleted: false,
      $or: [{ owner: req.user._id }, { 'collaborators.user': req.user._id }],
    };

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('owner', 'displayName email')
        .populate('headCommit', 'shortHash message createdAt'),
      Product.countDocuments(filter),
    ]);

    res.json({ products, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

// POST /api/products
router.post('/', validateBody(productSchema), async (req, res, next) => {
  try {
    const base = slugify(req.body.name);
    const slug = await uniqueSlug(base);
    const product = await Product.create({ ...req.body, slug, owner: req.user._id });
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
});

// GET /api/products/:slug  — full hierarchy (product + parts + subparts)
router.get('/:slug', async (req, res, next) => {
  try {
    const product = await Product.findOne({
      slug: req.params.slug,
      isDeleted: false,
      $or: [{ owner: req.user._id }, { 'collaborators.user': req.user._id }],
    })
      .populate('owner', 'displayName email')
      .populate('headCommit', 'shortHash message createdAt author');

    if (!product) return res.status(404).json({ message: 'Product not found' });

    const parts = await Part.find({ product: product._id }).sort({ order: 1, name: 1 });
    const subparts = await Subpart.find({ product: product._id }).sort({ order: 1, name: 1 });

    res.json({ product, parts, subparts });
  } catch (err) {
    next(err);
  }
});

// PUT /api/products/:id
router.put('/:id', validateBody(productSchema), async (req, res, next) => {
  try {
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id, isDeleted: false },
      { name: req.body.name, description: req.body.description, tags: req.body.tags },
      { new: true, runValidators: true }
    );
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/products/:id  (soft delete)
router.delete('/:id', async (req, res, next) => {
  try {
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      { isDeleted: true },
      { new: true }
    );
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product deleted' });
  } catch (err) {
    next(err);
  }
});

// POST /api/products/:id/clone
router.post('/:id/clone', validateBody(cloneSchema), async (req, res, next) => {
  try {
    const source = await Product.findOne({
      _id: req.params.id,
      isDeleted: false,
      $or: [{ owner: req.user._id }, { 'collaborators.user': req.user._id }],
    });
    if (!source) return res.status(404).json({ message: 'Product not found' });

    const base = slugify(req.body.name);
    const slug = await uniqueSlug(base);

    // Clone the product (no headCommit — fresh start for the clone)
    const cloned = await Product.create({
      owner: req.user._id,
      name: req.body.name,
      description: req.body.description || `Cloned from ${source.name}`,
      slug,
      tags: [...source.tags],
      totalFiles: source.totalFiles,
      totalStorageBytes: source.totalStorageBytes,
    });

    // Clone parts
    const parts = await Part.find({ product: source._id });
    const partMap = {};
    for (const part of parts) {
      const newPart = await Part.create({
        product: cloned._id,
        name: part.name,
        slug: part.slug,
        description: part.description,
        order: part.order,
      });
      partMap[String(part._id)] = newPart._id;
    }

    // Clone subparts
    const subparts = await Subpart.find({ product: source._id });
    const subpartMap = {};
    for (const sub of subparts) {
      const newSub = await Subpart.create({
        part: partMap[String(sub.part)],
        product: cloned._id,
        name: sub.name,
        description: sub.description,
        order: sub.order,
      });
      subpartMap[String(sub._id)] = newSub._id;
    }

    // Clone FileAssets (pointing to same FileVersions / GridFS objects)
    const fileAssets = await FileAsset.find({ product: source._id });
    for (const fa of fileAssets) {
      await FileAsset.create({
        subpart: subpartMap[String(fa.subpart)],
        part: partMap[String(fa.part)],
        product: cloned._id,
        fileType: fa.fileType,
        canonicalName: fa.canonicalName,
        subpartName: fa.subpartName,
        dateCreated: fa.dateCreated,
        piecesPerPrint: fa.piecesPerPrint,
        printerProfile: fa.printerProfile,
        currentVersion: fa.currentVersion,
        versionCount: fa.versionCount,
        totalStorageBytes: fa.totalStorageBytes,
      });
    }

    res.status(201).json({ product: cloned, message: 'Cloned successfully' });
  } catch (err) {
    next(err);
  }
});

// GET /api/products/:id/status  — files changed since last commit
router.get('/:id/status', async (req, res, next) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      isDeleted: false,
      $or: [{ owner: req.user._id }, { 'collaborators.user': req.user._id }],
    });
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const fileAssets = await FileAsset.find({ product: product._id })
      .populate('currentVersion', 'versionNumber createdAt contentHash')
      .populate('subpart', 'name');

    res.json({
      headCommit: product.headCommit,
      fileAssets: fileAssets.map((fa) => ({
        _id: fa._id,
        canonicalName: fa.canonicalName,
        fileType: fa.fileType,
        versionCount: fa.versionCount,
        currentVersion: fa.currentVersion,
        subpartName: fa.subpart?.name,
      })),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
