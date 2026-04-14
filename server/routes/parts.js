import { Router } from 'express';
import Part from '../models/Part.js';
import Product from '../models/Product.js';
import { protect } from '../middleware/auth.js';
import { validateBody, partSchema } from '../middleware/validate.js';

const router = Router({ mergeParams: true }); // access :productId from parent
router.use(protect);

const slugify = (name) =>
  name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-');

/** Verify the user has access to the parent product */
async function getAccessibleProduct(productId, userId) {
  return Product.findOne({
    _id: productId,
    isDeleted: false,
    $or: [{ owner: userId }, { 'collaborators.user': userId }],
  });
}

// GET /api/products/:productId/parts
router.get('/', async (req, res, next) => {
  try {
    const product = await getAccessibleProduct(req.params.productId, req.user._id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const parts = await Part.find({ product: product._id }).sort({ order: 1, name: 1 });
    res.json(parts);
  } catch (err) {
    next(err);
  }
});

// POST /api/products/:productId/parts
router.post('/', validateBody(partSchema), async (req, res, next) => {
  try {
    const product = await getAccessibleProduct(req.params.productId, req.user._id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const slug = slugify(req.body.name);
    const part = await Part.create({
      product: product._id,
      name: req.body.name,
      slug,
      description: req.body.description,
      order: req.body.order,
    });
    res.status(201).json(part);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'Part name already exists in this product' });
    next(err);
  }
});

// PUT /api/products/:productId/parts/:partId
router.put('/:partId', validateBody(partSchema), async (req, res, next) => {
  try {
    const product = await getAccessibleProduct(req.params.productId, req.user._id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const part = await Part.findOneAndUpdate(
      { _id: req.params.partId, product: product._id },
      { name: req.body.name, slug: slugify(req.body.name), description: req.body.description, order: req.body.order },
      { new: true, runValidators: true }
    );
    if (!part) return res.status(404).json({ message: 'Part not found' });
    res.json(part);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/products/:productId/parts/:partId
router.delete('/:partId', async (req, res, next) => {
  try {
    const product = await getAccessibleProduct(req.params.productId, req.user._id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const part = await Part.findOneAndDelete({ _id: req.params.partId, product: product._id });
    if (!part) return res.status(404).json({ message: 'Part not found' });
    res.json({ message: 'Part deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
