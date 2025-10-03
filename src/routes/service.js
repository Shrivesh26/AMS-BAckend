const express = require('express');
const { body } = require('express-validator');
const serviceController = require('../controllers/serviceController');
const { authorize, tenantIsolation } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/customers/:customerId/services
// @desc    Get all services for a customer (all linked providers)
// @access  Private
router.get('/customers/:customerId', serviceController.getServicesForCustomer);
// router.get('/customers/:customerId/services', serviceController.getServicesForCustomer);

// @desc    Get services for a specific provider
// @route   GET /api/services/providers/:providerId
// @access  Private
router.get('/providers/:providerId', serviceController.getServicesForProvider);

// Apply tenant isolation to all routes
router.use(tenantIsolation);

// Validation rules
const createServiceValidation = [
  body('name').trim().notEmpty().withMessage('Service name is required'),
  body('description').trim().notEmpty().withMessage('Service description is required'),
  body('category').isIn(['beauty', 'wellness', 'healthcare', 'fitness', 'consulting', 'automotive', 'home_services', 'other']).withMessage('Invalid category'),
  body('duration').isInt({ min: 5, max: 480 }).withMessage('Duration must be between 5 and 480 minutes'),
  body('pricing.basePrice').isFloat({ min: 0 }).withMessage('Base price must be a positive number')
];

// @route   GET /api/services
// @desc    Get all services for tenant
// @access  Private
router.get('/', serviceController.getServices);

// @route   GET /api/services/:id
// @desc    Get single service
// @access  Private
router.get('/:id', serviceController.getService);

// @route   POST /api/services
// @desc    Create new service
// @access  Private (Tenant only)
router.post('/', authorize('tenant', 'service_provider'), createServiceValidation, serviceController.createService);

// @route   PUT /api/services/:id
// @desc    Update service
// @access  Private (Tenant only)
router.put('/:id', authorize('tenant', 'service_provider'), serviceController.updateService);

// @route   DELETE /api/services/:id
// @desc    Delete service
// @access  Private (Tenant only)
router.delete('/:id', authorize('tenant', 'service_provider'), serviceController.deleteService);

// @route   PUT /api/services/:id/providers
// @desc    Assign providers to service
// @access  Private (Tenant only)
router.put('/:id/providers', authorize('tenant', 'service_provider'), serviceController.assignProviders);

// @route   GET /api/services/:id/availability
// @desc    Get service availability
// @access  Private
router.get('/:id/availability', serviceController.getServiceAvailability);

module.exports = router;