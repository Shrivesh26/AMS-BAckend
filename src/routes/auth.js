const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' }); 

const router = express.Router();

// Validation rules
// const registerValidation = [
//   body('firstName').trim().notEmpty().withMessage('First name is required'),
//   body('lastName').trim().notEmpty().withMessage('Last name is required'),
//   body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
//   body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
//   body('role').isIn(['tenant', 'service_provider', 'customer']).withMessage('Invalid role')
// ];
// const registerValidation = [
//   body('data').notEmpty().withMessage('Registration data is required'),
//   // Remove individual field validations since they're all in 'data' now
// ];
const registerValidation = [
  body('data').notEmpty().withMessage('Registration data is required'),
  body('data').custom((value, { req }) => {
    try {
      // Try to parse the data field
      const data = JSON.parse(value);
      
      // Validate required fields
      if (!data.firstName || typeof data.firstName !== 'string' || data.firstName.trim() === '') {
        throw new Error('First name is required');
      }
      
      if (!data.lastName || typeof data.lastName !== 'string' || data.lastName.trim() === '') {
        throw new Error('Last name is required');
      }
      
      if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        throw new Error('Please provide a valid email');
      }
      
      if (!data.password || data.password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }
      
      if (!data.role || !['tenant', 'service_provider', 'customer'].includes(data.role)) {
        throw new Error('Invalid role');
      }
      
      // Store parsed data back in request for controller use
      req.body.parsedData = data;
      
      return true;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('Invalid JSON format in data field');
      }
      throw error;
    }
  })
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required')
];

const forgotPasswordValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email')
];

const resetPasswordValidation = [
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
];

// @route   POST /api/auth/register
// @desc    Register user
// @access  Public
router.post('/register', upload.single('avatar'), registerValidation, authController.register);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', loginValidation, authController.login);

// @route   GET /api/auth/me
// @desc    Get current logged in user
// @access  Private
router.get('/me', protect, authController.getMe);

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', protect, authController.updateProfile);

// @route   PUT /api/auth/password
// @desc    Update password
// @access  Private
router.put('/password', protect, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long')
], authController.updatePassword);

// @route   POST /api/auth/forgot-password
// @desc    Forgot password
// @access  Public
router.post('/forgot-password', forgotPasswordValidation, authController.forgotPassword);

// @route   PUT /api/auth/reset-password/:resettoken
// @desc    Reset password
// @access  Public
router.put('/reset-password/:resettoken', resetPasswordValidation, authController.resetPassword);

// @route   POST /api/auth/logout
// @desc    Log user out
// @access  Private
router.post('/logout', protect, authController.logout);

module.exports = router;