import { Router } from 'express';
import Part from '../models/Part.js';
import Subpart from '../models/Subpart.js';
import Product from '../models/Product.js';
import { protect } from '../middleware/auth.js';
import { validateBody, subpartSchema } from '../middleware/validate.js';

const router = Router({ mergeParams: true }); // access :productId, :partId
router.use(protect);

async function getAccessiblePart(partId, productId, userId) {
  const product = await Product.findOne({
    _id: productId,
    isDeleted: false,
    $or: [{ owner: userId }, { 'collaborators.user': userId }],
  });
  if (!product) return null;
  return Part.findOne({ _id: partId, product: product._id });
}

// GET /api/products/:productId/parts/:partId/subparts
router.get('/', async (req, res, next) => {
  try {
    const part = await getAccessiblePart(req.params.partId, req.params.productId, req.user._id);
    if (!part) return res.status(404).json({ message: 'Part not found' });

    const subparts = await Subpart.find({ part: part._id }).sort({ order: 1, name: 1 });
    res.json(subparts);
  } catch (err) {
    next(err);
  }
});

// POST /api/products/:productId/parts/:partId/subparts
router.post('/', validateBody(subpartSchema), async (req, res, next) => {
  try {
    const part = await getAccessiblePart(req.params.partId, req.params.productId, req.user._id);
    if (!part) return res.status(404).json({ message: 'Part not found' });

    const subpart = await Subpart.create({
      part: part._id,
      product: req.params.productId,
      name: req.body.name,
      description: req.body.description,
      order: req.body.order,
    });
    res.status(201).json(subpart);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'Subpart name already exists in this part' });
    next(err);
  }
});

// PUT /api/products/:productId/parts/:partId/subparts/:subpartId
router.put('/:subpartId', validateBody(subpartSchema), async (req, res, next) => {
  try {
    const part = await getAccessiblePart(req.params.partId, req.params.productId, req.user._id);
    if (!part) return res.status(404).json({ message: 'Part not found' });

    const subpart = await Subpart.findOneAndUpdate(
      { _id: req.params.subpartId, part: part._id },
      { name: req.body.name, description: req.body.description, order: req.body.order },
      { new: true, runValidators: true }
    );
    if (!subpart) return res.status(404).json({ message: 'Subpart not found' });
    res.json(subpart);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/products/:productId/parts/:partId/subparts/:subpartId
router.delete('/:subpartId', async (req, res, next) => {
  try {
    const part = await getAccessiblePart(req.params.partId, req.params.productId, req.user._id);
    if (!part) return res.status(404).json({ message: 'Part not found' });

    const subpart = await Subpart.findOneAndDelete({ _id: req.params.subpartId, part: part._id });
    if (!subpart) return res.status(404).json({ message: 'Subpart not found' });
    res.json({ message: 'Subpart deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
