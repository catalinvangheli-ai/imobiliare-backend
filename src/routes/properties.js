import express from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.js';
import Property from '../models/Property.js';

const router = express.Router();

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Doar imagini sunt permise'));
    }
  }
});

// Get all properties with filters
router.get('/', async (req, res) => {
  try {
    const { category, county, city, priceMin, priceMax, surfaceMin, surfaceMax, rooms } = req.query;
    
    const filter = {};
    if (category) filter.category = category;
    if (county) filter.county = county;
    if (city) filter.city = new RegExp(city, 'i');
    if (priceMin || priceMax) {
      filter.price = {};
      if (priceMin) filter.price.$gte = Number(priceMin);
      if (priceMax) filter.price.$lte = Number(priceMax);
    }
    if (surfaceMin || surfaceMax) {
      filter.surface = {};
      if (surfaceMin) filter.surface.$gte = Number(surfaceMin);
      if (surfaceMax) filter.surface.$lte = Number(surfaceMax);
    }
    if (rooms) filter.rooms = Number(rooms);

    const properties = await Property.find(filter)
      .populate('owner', 'name phone')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(properties);
  } catch (error) {
    res.status(500).json({ message: 'Eroare la obținerea proprietăților', error: error.message });
  }
});

// Get my properties - TREBUIE ÎNAINTEA RUTEI /:id
router.get('/my', authenticate, async (req, res) => {
  try {
    const properties = await Property.find({ owner: req.userId })
      .sort({ createdAt: -1 });
    res.json(properties);
  } catch (error) {
    res.status(500).json({ message: 'Eroare', error: error.message });
  }
});

// Get single property
router.get('/:id', async (req, res) => {
  try {
    const property = await Property.findById(req.params.id)
      .populate('owner', 'name phone email');
    
    if (!property) {
      return res.status(404).json({ message: 'Proprietatea nu a fost găsită' });
    }

    res.json(property);
  } catch (error) {
    res.status(500).json({ message: 'Eroare la obținerea proprietății', error: error.message });
  }
});

// Create property
router.post('/', authenticate, upload.array('images', 10), async (req, res) => {
  try {
    const propertyData = {
      ...req.body,
      owner: req.userId,
      images: req.files ? req.files.map(file => `/uploads/${file.filename}`) : []
    };

    const property = new Property(propertyData);
    await property.save();

    res.status(201).json(property);
  } catch (error) {
    res.status(500).json({ message: 'Eroare la crearea proprietății', error: error.message });
  }
});

// Update property
router.put('/:id', authenticate, upload.array('images', 10), async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    
    if (!property) {
      return res.status(404).json({ message: 'Proprietatea nu a fost găsită' });
    }

    if (property.owner.toString() !== req.userId) {
      return res.status(403).json({ message: 'Nu ai permisiunea să modifici această proprietate' });
    }

    const updateData = { ...req.body };
    if (req.files && req.files.length > 0) {
      updateData.images = req.files.map(file => `/uploads/${file.filename}`);
    }

    Object.assign(property, updateData);
    await property.save();

    res.json(property);
  } catch (error) {
    res.status(500).json({ message: 'Eroare la actualizarea proprietății', error: error.message });
  }
});

// Delete property
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    
    if (!property) {
      return res.status(404).json({ message: 'Proprietatea nu a fost găsită' });
    }

    if (property.owner.toString() !== req.userId) {
      return res.status(403).json({ message: 'Nu ai permisiunea să ștergi această proprietate' });
    }

    await property.deleteOne();
    res.json({ message: 'Proprietate ștearsă cu succes' });
  } catch (error) {
    res.status(500).json({ message: 'Eroare la ștergerea proprietății', error: error.message });
  }
});

export default router;
