import mongoose from 'mongoose';

const propertySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['Apartament', 'Casă', 'Teren', 'Spațiu comercial']
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  surface: {
    type: Number,
    required: true,
    min: 0
  },
  rooms: {
    type: Number,
    min: 0
  },
  county: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  images: [{
    type: String
  }],
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for search
propertySchema.index({ category: 1, county: 1, city: 1, price: 1 });

export default mongoose.model('Property', propertySchema);
