import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { authenticate } from '../middleware/auth.js';
import Property from '../models/Property.js';

const router = express.Router();

// Configurare Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'db0htnrxf',
  api_key: process.env.CLOUDINARY_API_KEY || '533557596816111',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'HXWkfZ1FStsuEqlhky1nUWwDJKA'
});

// Cloudinary storage pentru imagini
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'imobiliare-properties',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1200, height: 800, crop: 'limit' }]
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
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
      images: req.files ? req.files.map(file => file.path) : [] // Cloudinary returnează URL-ul complet în file.path
    };

    const property = new Property(propertyData);
    await property.save();

    console.log('✅ Property created with Cloudinary images:', property.images);
    res.status(201).json(property);
  } catch (error) {
    console.error('❌ Error creating property:', error);
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
    
    // ADAUGĂ imaginile noi la cele existente (nu le suprascrie)
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => file.path); // Cloudinary URL-uri
      updateData.images = [...(property.images || []), ...newImages];
      console.log('📸 Added new Cloudinary images:', newImages);
    }

    Object.assign(property, updateData);
    await property.save();

    console.log('✅ Property updated with images:', property.images);
    res.json(property);
  } catch (error) {
    console.error('❌ Error updating property:', error);
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
