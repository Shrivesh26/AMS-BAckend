const express = require('express');
const { AuthMiddleware } = require('../../../shared');
const UserController = require('../controllers/UserController');

const router = express.Router();
const userController = new UserController();

/**
 * User Routes
 * Following RESTful API design principles
 */

// Public routes (no authentication required)
router.post('/register', userController.register);
router.post('/login', userController.login);
router.post('/refresh-token', userController.refreshToken);

// Protected routes (authentication required)
router.use(AuthMiddleware.protect);

// User profile routes
router.get('/me', userController.getProfile);
router.put('/profile', userController.updateProfile);
router.put('/change-password', userController.changePassword);
router.post('/logout', userController.logout);

// Admin and tenant management routes
router.get('/tenant/:tenantId', 
  AuthMiddleware.authorize('admin', 'tenant'),
  AuthMiddleware.ensureTenantAccess,
  userController.getUsersByTenant
);

router.get('/:id', 
  AuthMiddleware.authorize('admin', 'tenant'),
  userController.getUserById
);

router.put('/:id/deactivate', 
  AuthMiddleware.authorize('admin'),
  userController.deactivateUser
);

module.exports = router;