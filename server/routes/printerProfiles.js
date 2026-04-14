import { Router } from 'express';
import PrinterProfile from '../models/PrinterProfile.js';
import { protect } from '../middleware/auth.js';
import { validateBody, printerProfileSchema } from '../middleware/validate.js';

const router = Router();
router.use(protect);

// GET /api/printer-profiles
router.get('/', async (req, res, next) => {
  try {
    const profiles = await PrinterProfile.find({ owner: req.user._id }).sort({ createdAt: -1 });
    res.json(profiles);
  } catch (err) {
    next(err);
  }
});

// POST /api/printer-profiles
router.post('/', validateBody(printerProfileSchema), async (req, res, next) => {
  try {
    const profile = await PrinterProfile.create({ ...req.body, owner: req.user._id });
    res.status(201).json(profile);
  } catch (err) {
    next(err);
  }
});

// PUT /api/printer-profiles/:id
router.put('/:id', validateBody(printerProfileSchema), async (req, res, next) => {
  try {
    const profile = await PrinterProfile.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!profile) return res.status(404).json({ message: 'Printer profile not found' });
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/printer-profiles/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const profile = await PrinterProfile.findOneAndDelete({
      _id: req.params.id,
      owner: req.user._id,
    });
    if (!profile) return res.status(404).json({ message: 'Printer profile not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
