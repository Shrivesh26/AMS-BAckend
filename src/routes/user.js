const express = require('express');
const { body } = require('express-validator');
const userController = require('../controllers/userController');
const { authorize, tenantIsolation } = require('../middleware/auth');

const router = express.Router();

// Apply tenant isolation to most routes (except admin routes)

// @route   GET /api/users/providers/search
// @desc    Search service providers
// @access  Private
router.get('/providers/search', userController.searchProviders);

// @route   GET /api/users
// @desc    Get users (admin sees all, others see tenant users)
// @access  Private
router.get('/', userController.getUsers);

// @route   GET /api/users/:id
// @desc    Get single user
// @access  Private
router.get('/:id', userController.getUser);

// @route   POST /api/users
// @desc    Create new user
// @access  Private (Admin or Tenant)
router.post('/', authorize('admin', 'tenant'), userController.createUser);

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Private (Admin, Tenant, or user themselves)
router.put('/:id', userController.updateUser);

// @route   DELETE /api/users/:id
// @desc    Delete user
// @access  Private (Admin or Tenant)
router.delete('/:id', authorize('admin', 'tenant'), userController.deleteUser);

// @route   PUT /api/users/:id/availability
// @desc    Update provider availability
// @access  Private (Service Provider or Tenant)
router.put('/:id/availability', authorize('service_provider', 'tenant'), userController.updateAvailability);

// @route   GET /api/users/:id/schedule
// @desc    Get provider schedule
// @access  Private
router.get('/:id/schedule', userController.getProviderSchedule);

module.exports = router;