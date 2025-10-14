const express = require('express');
const { body } = require('express-validator');
const serviceController = require('../controllers/serviceController');
const { authorize, tenantIsolation, protect } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const createServiceValidation = [
  body('name').trim().notEmpty().withMessage('Service name is required'),
  body('description').trim().notEmpty().withMessage('Service description is required'),
  body('category').isIn(['beauty', 'wellness', 'healthcare', 'fitness', 'consulting', 'automotive', 'home_services', 'other']).withMessage('Invalid category'),
  body('duration').isInt({ min: 5, max: 480 }).withMessage('Duration must be between 5 and 480 minutes'),
  body('pricing.basePrice').isFloat({ min: 0 }).withMessage('Base price must be a positive number')
];

// ✅ ROUTES THAT DON'T NEED TENANT ISOLATION (put these FIRST)

// @route   GET /api/services/customers/:customerId
// @desc    Get all services for a customer (all linked providers)
// @access  Private
router.get('/customers/:customerId', serviceController.getServicesForCustomer);

// @route   GET /api/services/providers/:providerId
// @desc    Get services for a specific provider
// @access  Private
router.get('/providers/:providerId', serviceController.getServicesForProvider);

// @route   GET /api/services/tenant/:tenantId
// @desc    Get services created by a specific tenant
// @access  Private
router.get('/tenant/:tenantId', protect, serviceController.getServicesByTenant);

// @route   GET /api/services/available
// @desc    Get available services for service provider
// @access  Private (Service Provider)
router.get('/available', protect, authorize('service_provider'), serviceController.getAvailableServices);

// @route   POST /api/services/assign_provider  
// @desc    Assign provider to service
// @access  Private (Service Provider)
router.post('/assign_provider', protect, authorize('service_provider'), serviceController.assignProviderToService);

// @route   POST /api/services/select
// @desc    Service Provider selects services they can provide
// @access  Private (Service Provider)
router.post('/select', protect, authorize('service_provider'), serviceController.selectServices);

// @route   POST /api/services/unselect
// @desc    Service Provider removes themselves from services
// @access  Private (Service Provider)
router.post('/unselect', protect, authorize('service_provider'), serviceController.unselectServices);

// ✅ ROUTES THAT NEED TENANT ISOLATION (put these AFTER tenantIsolation middleware)

// Apply tenant isolation to remaining routes
router.use(tenantIsolation);

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
router.post('/', authorize('tenant'), createServiceValidation, serviceController.createService);

// @route   PUT /api/services/:id
// @desc    Update service
// @access  Private (Tenant only)
router.put('/:id', authorize('tenant'), serviceController.updateService);

// @route   DELETE /api/services/:id
// @desc    Delete service
// @access  Private (Tenant only)
router.delete('/:id', authorize('tenant'), serviceController.deleteService);

// @route   PUT /api/services/:id/providers
// @desc    Assign providers to service
// @access  Private (Tenant only)
router.put('/:id/providers', authorize('tenant'), serviceController.assignProviders);

// @route   GET /api/services/:id/availability
// @desc    Get service availability
// @access  Private
router.get('/:id/availability', serviceController.getServiceAvailability);

module.exports = router;