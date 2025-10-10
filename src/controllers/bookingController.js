const { validationResult } = require('express-validator');
const Booking = require('../models/Booking');
const Service = require('../models/Service');
const ServiceProvider = require('../models/ServiceProvider');
const User = require('../models/User');

// @desc    Get bookings (filtered by user role)
// @route   GET /api/bookings
// @access  Private
exports.getBookings = async (req, res, next) => {
  try {
    let query = { tenant: req.tenantId };

    // Filter based on user role
    if (req.user.role === 'customer') {
      query.customer = req.user._id;
    } else if (req.user.role === 'service_provider') {
      query.provider = req.user._id;
    }

    // Additional filters
    if (req.query.status) query.status = req.query.status;
    if (req.query.date) {
      const date = new Date(req.query.date);
      query.appointmentDate = {
        $gte: new Date(date.setHours(0, 0, 0, 0)),
        $lt: new Date(date.setHours(23, 59, 59, 999))
      };
    }

    const bookings = await Booking.find(query)
      .populate('customer', 'firstName lastName email phone')
      .populate('service', 'name duration pricing')
      .populate('provider', 'firstName lastName email')
      .sort({ appointmentDate: -1, startTime: -1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single booking
// @route   GET /api/bookings/:id
// @access  Private
exports.getBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      tenant: req.tenantId
    })
    .populate('customer', 'firstName lastName email phone')
    .populate('service', 'name description duration pricing')
    .populate('provider', 'firstName lastName email profile');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check authorization
    if (req.user.role === 'customer' && booking.customer._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this booking'
      });
    }

    if (req.user.role === 'service_provider' && booking.provider._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this booking'
      });
    }

    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new booking
// @route   POST /api/bookings
// @access  Private (Tenant, Service Provider, Customer)
exports.createBooking = async (req, res, next) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // Add tenant to req.body
    req.body.tenant = req.tenantId;

    // If customer is creating booking, set customer to themselves
    if (req.user.role === 'customer') {
      req.body.customer = req.user._id;
    }

    // Get service details for pricing
    const service = await Service.findById(req.body.service);
    if (!service) {
      return res.status(400).json({
        success: false,
        message: 'Service not found'
      });
    }

    // Set pricing information
    req.body.duration = service.duration;
    req.body.pricing = {
      basePrice: service.pricing.basePrice,
      finalPrice: service.finalPrice,
      currency: service.pricing.currency
    };

    // Calculate endTime if not provided
    if (!req.body.endTime && req.body.startTime && service.duration) {
      const [hours, minutes] = req.body.startTime.split(':').map(Number);
      const startMinutes = hours * 60 + minutes;
      const endMinutes = startMinutes + service.duration;
      const endHours = Math.floor(endMinutes / 60);
      const endMins = endMinutes % 60;
      req.body.endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
    }

    const booking = await Booking.create(req.body);
    
    // Populate the created booking
    await booking.populate('customer', 'firstName lastName email');
    await booking.populate('service', 'name duration');
    await booking.populate('provider', 'firstName lastName email');

    res.status(201).json({
      success: true,
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update booking
// @route   PUT /api/bookings/:id
// @access  Private (Tenant, Service Provider)
exports.updateBooking = async (req, res, next) => {
  try {
    let booking = await Booking.findOne({
      _id: req.params.id,
      tenant: req.tenantId
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    booking = await Booking.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('customer service provider');

    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update booking status
// @route   PUT /api/bookings/:id/status
// @access  Private (Tenant, Service Provider)
exports.updateBookingStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    const booking = await Booking.findOne({
      _id: req.params.id,
      tenant: req.tenantId
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    booking.status = status;
    await booking.save();

    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reschedule booking
// @route   PUT /api/bookings/:id/reschedule
// @access  Private
exports.rescheduleBooking = async (req, res, next) => {
  try {
    const { appointmentDate, startTime } = req.body;

    const booking = await Booking.findOne({
      _id: req.params.id,
      tenant: req.tenantId
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Store previous booking details
    booking.reschedule = {
      previousDate: booking.appointmentDate,
      previousStartTime: booking.startTime,
      rescheduleCount: (booking.reschedule?.rescheduleCount || 0) + 1,
      rescheduledBy: req.user._id,
      rescheduledAt: new Date(),
      reason: req.body.reason
    };

    booking.appointmentDate = appointmentDate;
    booking.startTime = startTime;
    await booking.save();

    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel booking
// @route   PUT /api/bookings/:id/cancel
// @access  Private
exports.cancelBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      tenant: req.tenantId
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    booking.status = 'cancelled';
    booking.cancellation = {
      cancelledBy: req.user._id,
      cancelledAt: new Date(),
      reason: req.body.reason
    };

    await booking.save();

    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get provider calendar
// @route   GET /api/bookings/calendar/:providerId
// @access  Private
exports.getProviderCalendar = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    
    const query = {
      provider: req.params.providerId,
      tenant: req.tenantId,
      status: { $nin: ['cancelled'] }
    };

    if (startDate && endDate) {
      query.appointmentDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const bookings = await Booking.find(query)
      .populate('service', 'name duration')
      .populate('customer', 'firstName lastName')
      .sort({ appointmentDate: 1, startTime: 1 });

    res.status(200).json({
      success: true,
      data: bookings
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get provider availability
// @route   GET /api/bookings/availability/:providerId
// @access  Private
exports.getProviderAvailability = async (req, res, next) => {
  try {
    // This would calculate available time slots based on:
    // - Provider's schedule
    // - Existing bookings
    // - Service duration
    
    const availability = {
      providerId: req.params.providerId,
      availableSlots: [] // Would be calculated based on actual logic
    };

    res.status(200).json({
      success: true,
      data: availability
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit booking feedback
// @route   POST /api/bookings/:id/feedback
// @access  Private (Customer only)
exports.submitFeedback = async (req, res, next) => {
  try {
    const { rating, comment } = req.body;

    const booking = await Booking.findOne({
      _id: req.params.id,
      customer: req.user._id,
      tenant: req.tenantId
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (booking.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Can only provide feedback for completed bookings'
      });
    }

    booking.feedback = {
      rating,
      comment,
      submittedAt: new Date()
    };

    await booking.save();

    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get booking metadata for customer (tenant, provider, services)
// @route   GET /api/bookings/metadata/:customerId
// @access  Private
exports.getBookingMetadata = async (req, res, next) => {
  try {
    const customerId = req.params.customerId;

    // 1. Find the customer
    const customer = await User.findById(customerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    // 2. Find one service provider under the same tenant
    const provider = await ServiceProvider.findOne({ tenant: customer.tenant });
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'No service provider found for tenant',
      });
    }

    // 3. Fetch services under the same tenant
    const services = await Service.find({ tenant: tenantId }).select('name pricing isActive');

    res.status(200).json({
      success: true,
      data: {
        tenantId,
        providerId: provider._id,
        services: services.map(service => ({
          id: service._id,
          name: service.name,
          pricing: service.pricing,
          isActive: service.isActive
        })),
      }
    });
  } catch (error) {
    next(error);
  }
};