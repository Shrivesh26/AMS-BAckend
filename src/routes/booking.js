const express = require('express');
const { body } = require('express-validator');
const bookingController = require('../controllers/bookingController');
const { authorize, tenantIsolation } = require('../middleware/auth');

const router = express.Router();

// Apply tenant isolation to all routes
router.use(tenantIsolation);

// Validation rules
const createBookingValidation = [
  body('service').isMongoId().withMessage('Valid service ID is required'),
  body('provider').isMongoId().withMessage('Valid provider ID is required'),
  body('customer').isMongoId().withMessage('Valid customer ID is required'),
  body('appointmentDate').isISO8601().withMessage('Valid appointment date is required'),
  body('startTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Start time must be in HH:MM format')
];

// Routes with specific paths first
// @route   GET /api/bookings/calendar/:providerId
// @desc    Get provider calendar
// @access  Private
router.get('/calendar/:providerId', bookingController.getProviderCalendar);

// @route   GET /api/bookings/availability/:providerId
// @desc    Get provider availability
// @access  Private
router.get('/availability/:providerId', bookingController.getProviderAvailability);

// General routes
// @route   GET /api/bookings
// @desc    Get bookings (filtered by user role)
// @access  Private
router.get('/', bookingController.getBookings);

// @route   POST /api/bookings
// @desc    Create new booking
// @access  Private (Tenant, Service Provider, Customer)
router.post('/', authorize('tenant', 'service_provider', 'customer'), createBookingValidation, bookingController.createBooking);

// @route   GET /api/bookings/metadata/:customerId
// @desc    Get tenant, provider, and services for a customer
// @access  Private
router.get('/metadata/:customerId', authorize('customer', 'tenant', 'service_provider'), bookingController.getBookingMetadata);

// @route   GET /api/bookings/:id
// @desc    Get single booking
// @access  Private
router.get('/:id', bookingController.getBooking);

// @route   PUT /api/bookings/:id
// @desc    Update booking
// @access  Private (Tenant, Service Provider)
router.put('/:id', authorize('tenant', 'service_provider'), bookingController.updateBooking);

// Specific ID routes
// @route   PUT /api/bookings/:id/status
// @desc    Update booking status
// @access  Private (Tenant, Service Provider)
router.put('/:id/status', authorize('tenant', 'service_provider'), bookingController.updateBookingStatus);

// @route   PUT /api/bookings/:id/reschedule
// @desc    Reschedule booking
// @access  Private
router.put('/:id/reschedule', bookingController.rescheduleBooking);

// @route   PUT /api/bookings/:id/cancel
// @desc    Cancel booking
// @access  Private
router.put('/:id/cancel', bookingController.cancelBooking);

// @route   POST /api/bookings/:id/feedback
// @desc    Submit booking feedback
// @access  Private (Customer only)
router.post('/:id/feedback', authorize('customer'), bookingController.submitFeedback);

module.exports = router;