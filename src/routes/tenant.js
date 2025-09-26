const express = require('express');
const { body } = require('express-validator');
const tenantController = require('../controllers/tenantController');
const { authorize } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const createTenantValidation = [
  body('name').trim().notEmpty().withMessage('Tenant name is required'),
  body('subdomain').trim().notEmpty().withMessage('Subdomain is required'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('business.type').isIn(['salon', 'spa', 'clinic', 'consulting', 'fitness', 'automotive', 'other']).withMessage('Invalid business type')
];

// @route   GET /api/tenants
// @desc    Get all tenants
// @access  Private (Admin only)
router.get('/', authorize('admin'), tenantController.getTenants);

// @route   GET /api/tenants/me/stats
// @desc    Get tenant statistics
// @access  Private (Tenant only)
router.get('/me/stats', authorize('tenant'), tenantController.getTenantStats);

// @route   GET /api/tenants/:id
// @desc    Get single tenant
// @access  Private (Admin or Tenant owner)
router.get('/:id', tenantController.getTenant);

// @route   POST /api/tenants
// @desc    Create new tenant
// @access  Private (Admin only)
router.post('/', authorize('admin'), createTenantValidation, tenantController.createTenant);

// @route   PUT /api/tenants/:id
// @desc    Update tenant
// @access  Private (Admin or Tenant owner)
router.put('/:id', tenantController.updateTenant);

// @route   DELETE /api/tenants/:id
// @desc    Delete tenant
// @access  Private (Admin only)
router.delete('/:id', authorize('admin'), tenantController.deleteTenant);

module.exports = router;