import { Router } from 'express';
import Commit from '../models/Commit.js';
import Product from '../models/Product.js';
import { protect } from '../middleware/auth.js';
import { validateBody, tagCommitSchema } from '../middleware/validate.js';

const router = Router();
router.use(protect);

// GET /api/products/:productId/commits  — paginated commit log
router.get('/products/:productId/commits', async (req, res, next) => {
  try {
    const product = await Product.findOne({
      _id: req.params.productId,
      isDeleted: false,
      $or: [{ owner: req.user._id }, { 'collaborators.user': req.user._id }],
    });
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 30);

    const [commits, total] = await Promise.all([
      Commit.find({ product: product._id })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('author', 'displayName email')
        .populate('changes.fileAsset', 'canonicalName fileType')
        .populate('changes.fileVersion', 'versionNumber fileSizeBytes')
        .populate('changes.previousVersion', 'versionNumber'),
      Commit.countDocuments({ product: product._id }),
    ]);

    res.json({ commits, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

// GET /api/commits/:commitId  — commit detail
router.get('/commits/:commitId', async (req, res, next) => {
  try {
    const commit = await Commit.findById(req.params.commitId)
      .populate('author', 'displayName email')
      .populate('changes.fileAsset', 'canonicalName fileType subpartName')
      .populate('changes.fileVersion', 'versionNumber versionLabel fileSizeBytes contentHash gcodeMetadata createdAt')
      .populate('changes.previousVersion', 'versionNumber versionLabel fileSizeBytes contentHash');

    if (!commit) return res.status(404).json({ message: 'Commit not found' });

    // Verify access
    const product = await Product.findOne({
      _id: commit.product,
      isDeleted: false,
      $or: [{ owner: req.user._id }, { 'collaborators.user': req.user._id }],
    });
    if (!product) return res.status(403).json({ message: 'Access denied' });

    res.json(commit);
  } catch (err) {
    next(err);
  }
});

// POST /api/commits/:commitId/tag
router.post('/commits/:commitId/tag', validateBody(tagCommitSchema), async (req, res, next) => {
  try {
    const commit = await Commit.findById(req.params.commitId);
    if (!commit) return res.status(404).json({ message: 'Commit not found' });

    const product = await Product.findOne({
      _id: commit.product,
      owner: req.user._id,
    });
    if (!product) return res.status(403).json({ message: 'Only the owner can tag commits' });

    if (commit.tags.includes(req.body.tag)) {
      return res.status(409).json({ message: 'Tag already exists on this commit' });
    }

    commit.tags.push(req.body.tag);
    await commit.save();

    res.json(commit);
  } catch (err) {
    next(err);
  }
});

export default router;
