const express = require('express');
const { AuthMiddleware } = require('../../../shared');
const TenantController = require('../controllers/TenantController');

const router = express.Router();
const tenantController = new TenantController();

/**
 * Tenant Routes
 * Following RESTful API design principles
 */

// Public routes
router.get('/subdomain/:subdomain', tenantController.getTenantBySubdomain);

// Protected routes (authentication required)
router.use(AuthMiddleware.protect);

// Current tenant routes (for tenant users)
router.get('/me', tenantController.getCurrentTenant);
router.put('/me', 
  AuthMiddleware.authorize('tenant'), 
  tenantController.updateCurrentTenant
);
router.put('/me/settings', 
  AuthMiddleware.authorize('tenant', 'admin'), 
  tenantController.updateCurrentTenantSettings
);

// Admin only routes
router.get('/statistics/global', 
  AuthMiddleware.authorize('admin'), 
  tenantController.getGlobalStatistics
);

router.get('/', 
  AuthMiddleware.authorize('admin'), 
  tenantController.getTenants
);

router.post('/', 
  AuthMiddleware.authorize('admin'), 
  tenantController.createTenant
);

// Tenant management routes (admin only)
router.get('/:id', 
  AuthMiddleware.authorize('admin'), 
  tenantController.getTenantById
);

router.put('/:id', 
  AuthMiddleware.authorize('admin'), 
  tenantController.updateTenant
);

router.put('/:id/settings', 
  AuthMiddleware.authorize('admin'), 
  tenantController.updateTenantSettings
);

router.put('/:id/subscription', 
  AuthMiddleware.authorize('admin'), 
  tenantController.updateTenantSubscription
);

router.get('/:id/statistics', 
  AuthMiddleware.authorize('admin'), 
  tenantController.getTenantStatistics
);

router.put('/:id/statistics', 
  AuthMiddleware.authorize('admin'), 
  tenantController.updateTenantStatistics
);

router.put('/:id/suspend', 
  AuthMiddleware.authorize('admin'), 
  tenantController.suspendTenant
);

router.put('/:id/reactivate', 
  AuthMiddleware.authorize('admin'), 
  tenantController.reactivateTenant
);

module.exports = router;