const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: [true, 'Tenant is required']
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Customer is required']
  },
  service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: [true, 'Service is required']
  },
  provider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServiceProvider',
    required: [true, 'Service provider is required']
  },
  appointmentDate: {
    type: Date,
    required: [true, 'Appointment date is required']
  },
  startTime: {
    type: String,
    required: [true, 'Start time is required'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Start time must be in HH:MM format']
  },
  endTime: {
    type: String,
    required: [true, 'End time is required'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'End time must be in HH:MM format']
  },
  duration: {
    type: Number,
    required: [true, 'Duration is required'],
    min: [5, 'Duration must be at least 5 minutes']
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'],
    default: 'pending'
  },
  pricing: {
    basePrice: {
      type: Number,
      required: [true, 'Base price is required']
    },
    qualityVariation: {
      name: String,
      priceModifier: Number
    },
    discounts: [{
      type: String,
      value: Number,
      description: String
    }],
    finalPrice: {
      type: Number,
      required: [true, 'Final price is required']
    },
    currency: {
      type: String,
      default: 'USD'
    }
  },
  selectedQualityVariation: {
    type: String,
    trim: true
  },
  customerNotes: {
    type: String,
    maxlength: [500, 'Customer notes cannot exceed 500 characters']
  },
  providerNotes: {
    type: String,
    maxlength: [500, 'Provider notes cannot exceed 500 characters']
  },
  internalNotes: {
    type: String,
    maxlength: [500, 'Internal notes cannot exceed 500 characters']
  },
  payment: {
    method: {
      type: String,
      enum: ['cash', 'card', 'digital_wallet', 'bank_transfer', 'other']
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'partially_paid', 'refunded', 'failed'],
      default: 'pending'
    },
    transactionId: String,
    paidAmount: { type: Number, default: 0 },
    paidAt: Date,
    refundAmount: { type: Number, default: 0 },
    refundedAt: Date
  },
  reminders: [{
    type: {
      type: String,
      enum: ['email', 'sms', 'push']
    },
    scheduledFor: Date,
    sent: { type: Boolean, default: false },
    sentAt: Date
  }],
  feedback: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      maxlength: [1000, 'Feedback comment cannot exceed 1000 characters']
    },
    submittedAt: Date
  },
  cancellation: {
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceProvider'
    },
    cancelledAt: Date,
    reason: String,
    refundIssued: { type: Boolean, default: false },
    refundAmount: Number
  },
  reschedule: {
    previousDate: Date,
    previousStartTime: String,
    rescheduleCount: { type: Number, default: 0 },
    rescheduledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceProvider'
    },
    rescheduledAt: Date,
    reason: String
  }
}, {
  timestamps: true
});

// Create indexes
bookingSchema.index({ tenant: 1, appointmentDate: 1 });
bookingSchema.index({ customer: 1, appointmentDate: -1 });
bookingSchema.index({ provider: 1, appointmentDate: 1 });
bookingSchema.index({ service: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ 'payment.status': 1 });

// Compound index for checking provider availability
bookingSchema.index({ 
  provider: 1, 
  appointmentDate: 1, 
  status: 1 
});

// Virtual for booking duration in hours
bookingSchema.virtual('durationHours').get(function() {
  return this.duration / 60;
});

// // Pre-save middleware to calculate end time if not provided
// bookingSchema.pre('save', function(next) {
//   if (this.startTime && this.duration && !this.endTime) {
//     const [hours, minutes] = this.startTime.split(':').map(Number);
//     const startMinutes = hours * 60 + minutes;
//     const endMinutes = startMinutes + this.duration;
//     const endHours = Math.floor(endMinutes / 60);
//     const endMins = endMinutes % 60;
//     this.endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
//   }
//   next();
// });

module.exports = mongoose.model('Booking', bookingSchema);