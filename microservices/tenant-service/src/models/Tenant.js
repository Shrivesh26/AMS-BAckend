const mongoose = require('mongoose');

/**
 * Tenant Model
 * Following Single Responsibility Principle - focused only on tenant data structure
 */
const tenantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tenant name is required'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters'],
    index: true
  },
  subdomain: {
    type: String,
    required: [true, 'Subdomain is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[a-zA-Z0-9-]+$/, 'Subdomain can only contain letters, numbers, and hyphens'],
    index: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please add a valid email'],
    index: true
  },
  phone: {
    type: String,
    trim: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  business: {
    type: {
      type: String,
      required: [true, 'Business type is required'],
      enum: ['salon', 'spa', 'clinic', 'consulting', 'fitness', 'automotive', 'other']
    },
    description: {
      type: String,
      maxlength: [1000, 'Description cannot be more than 1000 characters']
    },
    website: String,
    logo: String,
    socialMedia: {
      facebook: String,
      instagram: String,
      twitter: String,
      linkedin: String
    }
  },
  subscription: {
    plan: {
      type: String,
      enum: ['basic', 'premium', 'enterprise'],
      default: 'basic'
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'trial'],
      default: 'trial'
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: Date,
    trialEndDate: Date,
    features: {
      maxUsers: { type: Number, default: 5 },
      maxServices: { type: Number, default: 10 },
      maxBookings: { type: Number, default: 100 },
      advancedReports: { type: Boolean, default: false },
      customBranding: { type: Boolean, default: false },
      apiAccess: { type: Boolean, default: false }
    }
  },
  settings: {
    timeZone: {
      type: String,
      default: 'UTC'
    },
    currency: {
      type: String,
      default: 'USD',
      enum: ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD']
    },
    dateFormat: {
      type: String,
      default: 'MM/DD/YYYY',
      enum: ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD']
    },
    timeFormat: {
      type: String,
      default: '12h',
      enum: ['12h', '24h']
    },
    businessHours: {
      monday: { start: String, end: String, closed: { type: Boolean, default: false } },
      tuesday: { start: String, end: String, closed: { type: Boolean, default: false } },
      wednesday: { start: String, end: String, closed: { type: Boolean, default: false } },
      thursday: { start: String, end: String, closed: { type: Boolean, default: false } },
      friday: { start: String, end: String, closed: { type: Boolean, default: false } },
      saturday: { start: String, end: String, closed: { type: Boolean, default: false } },
      sunday: { start: String, end: String, closed: { type: Boolean, default: true } }
    },
    bookingSettings: {
      advanceBookingDays: { type: Number, default: 30 },
      minBookingNotice: { type: Number, default: 60 }, // minutes
      cancellationPolicy: { type: Number, default: 24 }, // hours
      autoConfirmBookings: { type: Boolean, default: false },
      allowOnlinePayments: { type: Boolean, default: false }
    },
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      push: { type: Boolean, default: true }
    }
  },
  statistics: {
    totalUsers: { type: Number, default: 0 },
    totalServices: { type: Number, default: 0 },
    totalBookings: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    lastActivityDate: Date
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: String
}, {
  timestamps: true
});

// Compound indexes for better query performance
tenantSchema.index({ subdomain: 1, isActive: 1 });
tenantSchema.index({ 'subscription.status': 1, isActive: 1 });
tenantSchema.index({ createdAt: -1 });

// Virtual for full address
tenantSchema.virtual('fullAddress').get(function() {
  const { street, city, state, zipCode, country } = this.address;
  return [street, city, state, zipCode, country].filter(Boolean).join(', ');
});

// Ensure virtual fields are serialized
tenantSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.verificationToken;
    return ret;
  }
});

module.exports = mongoose.model('Tenant', tenantSchema);