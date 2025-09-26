const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: [true, 'Tenant is required']
  },
  name: {
    type: String,
    required: [true, 'Service name is required'],
    trim: true,
    maxlength: [100, 'Service name cannot be more than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Service description is required'],
    maxlength: [1000, 'Description cannot be more than 1000 characters']
  },
  category: {
    type: String,
    required: [true, 'Service category is required'],
    enum: ['beauty', 'wellness', 'healthcare', 'fitness', 'consulting', 'automotive', 'home_services', 'other']
  },
  subcategory: {
    type: String,
    trim: true
  },
  duration: {
    type: Number,
    required: [true, 'Service duration is required'],
    min: [5, 'Duration must be at least 5 minutes'],
    max: [480, 'Duration cannot exceed 8 hours'] // in minutes
  },
  pricing: {
    basePrice: {
      type: Number,
      required: [true, 'Base price is required'],
      min: [0, 'Price cannot be negative']
    },
    currency: {
      type: String,
      default: 'USD',
      enum: ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD']
    },
    discounts: [{
      type: {
        type: String,
        enum: ['percentage', 'fixed']
      },
      value: Number,
      description: String,
      validFrom: Date,
      validTo: Date,
      isActive: { type: Boolean, default: true }
    }]
  },
  qualityVariations: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: String,
    priceModifier: {
      type: { type: String, enum: ['percentage', 'fixed'] },
      value: Number
    },
    durationModifier: Number, // in minutes (can be negative)
    products: [{
      name: String,
      brand: String,
      description: String,
      cost: Number
    }]
  }],
  providers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  requirements: {
    minimumAge: Number,
    maximumAge: Number,
    gender: {
      type: String,
      enum: ['any', 'male', 'female']
    },
    specialNotes: String
  },
  images: [String],
  tags: [String],
  isActive: {
    type: Boolean,
    default: true
  },
  bookingSettings: {
    maxAdvanceBooking: { type: Number, default: 90 }, // days
    minAdvanceBooking: { type: Number, default: 0 }, // hours
    allowCancellation: { type: Boolean, default: true },
    cancellationDeadline: { type: Number, default: 24 }, // hours
    allowRescheduling: { type: Boolean, default: true },
    maxConcurrentBookings: { type: Number, default: 1 }
  },
  statistics: {
    totalBookings: { type: Number, default: 0 },
    rating: {
      average: { type: Number, default: 0 },
      count: { type: Number, default: 0 }
    },
    revenue: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Create indexes
serviceSchema.index({ tenant: 1, name: 1 });
serviceSchema.index({ tenant: 1, category: 1 });
serviceSchema.index({ tenant: 1, isActive: 1 });
serviceSchema.index({ providers: 1 });
serviceSchema.index({ tags: 1 });
serviceSchema.index({ 'pricing.basePrice': 1 });

// Virtual for final price calculation
serviceSchema.virtual('finalPrice').get(function() {
  let price = this.pricing.basePrice;
  
  // Apply active discounts
  const activeDiscounts = this.pricing.discounts.filter(discount => {
    const now = new Date();
    return discount.isActive && 
           (!discount.validFrom || discount.validFrom <= now) &&
           (!discount.validTo || discount.validTo >= now);
  });
  
  activeDiscounts.forEach(discount => {
    if (discount.type === 'percentage') {
      price = price * (1 - discount.value / 100);
    } else if (discount.type === 'fixed') {
      price = Math.max(0, price - discount.value);
    }
  });
  
  return Math.round(price * 100) / 100; // Round to 2 decimal places
});

module.exports = mongoose.model('Service', serviceSchema);