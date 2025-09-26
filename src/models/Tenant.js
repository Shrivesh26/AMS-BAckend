const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const tenantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tenant name is required'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters']
  },
  subdomain: {
    type: String,
    required: [true, 'Subdomain is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[a-zA-Z0-9-]+$/, 'Subdomain can only contain letters, numbers, and hyphens']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please add a valid email']
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
    country: String
  },
  business: {
    type: {
      type: String,
      required: [true, 'Business type is required'],
      enum: ['salon', 'spa', 'clinic', 'consulting', 'fitness', 'automotive', 'other']
    },
    description: String,
    website: String
  },
  subscription: {
    plan: {
      type: String,
      enum: ['basic', 'premium', 'enterprise'],
      default: 'basic'
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active'
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: Date
  },
  settings: {
    timeZone: {
      type: String,
      default: 'UTC'
    },
    currency: {
      type: String,
      enum: ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD'],
      required: [true, 'Currency is required'],
      // default: 'USD',
    },
    businessHours: {
      monday: { start: String, end: String, closed: { type: Boolean, default: false } },
      tuesday: { start: String, end: String, closed: { type: Boolean, default: false } },
      wednesday: { start: String, end: String, closed: { type: Boolean, default: false } },
      thursday: { start: String, end: String, closed: { type: Boolean, default: false } },
      friday: { start: String, end: String, closed: { type: Boolean, default: false } },
      saturday: { start: String, end: String, closed: { type: Boolean, default: false } },
      sunday: { start: String, end: String, closed: { type: Boolean, default: true } }
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Create indexes
// tenantSchema.index({ subdomain: 1 });
// tenantSchema.index({ email: 1 });

module.exports = mongoose.model('Tenant', tenantSchema);