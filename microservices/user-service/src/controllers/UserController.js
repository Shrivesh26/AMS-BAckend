const { ErrorHandler, logger } = require('../../../shared');
const UserService = require('../services/UserService');

/**
 * User Controller
 * Following Single Responsibility Principle - handles HTTP requests/responses
 */
class UserController {
  constructor(userService = null) {
    this.userService = userService || new UserService();
  }

  /**
   * Register new user
   * @route POST /api/users/register
   */
  register = ErrorHandler.asyncHandler(async (req, res) => {
    const user = await this.userService.create(req.body);
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: user
    });
  });

  /**
   * Login user
   * @route POST /api/users/login
   */
  login = ErrorHandler.asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const result = await this.userService.authenticate(email, password);
    
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: result
    });
  });

  /**
   * Refresh access token
   * @route POST /api/users/refresh-token
   */
  refreshToken = ErrorHandler.asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    const tokens = await this.userService.refreshToken(refreshToken);
    
    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: tokens
    });
  });

  /**
   * Get current user profile
   * @route GET /api/users/me
   */
  getProfile = ErrorHandler.asyncHandler(async (req, res) => {
    const user = await this.userService.findById(req.user.id);
    
    res.status(200).json({
      success: true,
      data: user
    });
  });

  /**
   * Update user profile
   * @route PUT /api/users/profile
   */
  updateProfile = ErrorHandler.asyncHandler(async (req, res) => {
    const user = await this.userService.updateProfile(req.user.id, req.body);
    
    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });
  });

  /**
   * Change password
   * @route PUT /api/users/change-password
   */
  changePassword = ErrorHandler.asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    const result = await this.userService.changePassword(
      req.user.id, 
      currentPassword, 
      newPassword
    );
    
    res.status(200).json({
      success: true,
      message: result.message
    });
  });

  /**
   * Get users by tenant (for admins and tenant owners)
   * @route GET /api/users/tenant/:tenantId
   */
  getUsersByTenant = ErrorHandler.asyncHandler(async (req, res) => {
    const { tenantId } = req.params;
    const { page = 1, limit = 10, role } = req.query;
    
    const options = {
      page: parseInt(page),
      limit: parseInt(limit)
    };

    if (role) {
      options.filter = { role };
    }

    const result = await this.userService.findByTenant(tenantId, options);
    
    res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  });

  /**
   * Get user by ID
   * @route GET /api/users/:id
   */
  getUserById = ErrorHandler.asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = await this.userService.findById(id);
    
    res.status(200).json({
      success: true,
      data: user
    });
  });

  /**
   * Deactivate user (admin only)
   * @route PUT /api/users/:id/deactivate
   */
  deactivateUser = ErrorHandler.asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await this.userService.deactivate(id);
    
    res.status(200).json({
      success: true,
      message: result.message
    });
  });

  /**
   * Logout user
   * @route POST /api/users/logout
   */
  logout = ErrorHandler.asyncHandler(async (req, res) => {
    // Clear refresh token from database
    await this.userService.clearRefreshToken(req.user.id);
    
    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  });
}

module.exports = UserController;