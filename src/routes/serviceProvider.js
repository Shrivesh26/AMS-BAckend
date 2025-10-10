const express = require('express');
const { body } = require('express-validator');
const serviceProviderController = require('../controllers/serviceProviderController');
const { authorize, tenantIsolation } = require('../middleware/auth');

const router = express.Router();

// Apply tenant isolation to all routes
router.use(tenantIsolation);

// @route   GET /api/service-providers
// @desc    Get all service providers
// @access  Private
router.get('/', serviceProviderController.getProviders);

// @route   GET /api/service-providers/:id
// @desc    Get single service provider
// @access  Private
router.get('/:id', serviceProviderController.getProvider);

// @route   POST /api/service-providers
// @desc    Create new service provider
// @access  Private (Admin or Tenant)
router.post('/', authorize('admin', 'tenant'), serviceProviderController.createProvider);

// @route   PUT /api/service-providers/:id
// @desc    Update service provider
// @access  Private (Admin, Tenant, or provider themselves)
router.put('/:id', serviceProviderController.updateProvider);

// @route   DELETE /api/service-providers/:id
// @desc    Delete (deactivate) service provider
// @access  Private (Admin or Tenant)
router.delete('/:id', authorize('admin', 'tenant'), serviceProviderController.deleteProvider);

// @route   PUT /api/service-providers/:id/availability
// @desc    Update provider availability
// @access  Private (Service Provider or Tenant)
router.put('/:id/availability', authorize('service_provider', 'tenant'), serviceProviderController.updateAvailability);

// @route   GET /api/service-providers/:id/schedule
// @desc    Get provider schedule
// @access  Private
router.get('/:id/schedule', serviceProviderController.getProviderSchedule);

module.exports = router;
