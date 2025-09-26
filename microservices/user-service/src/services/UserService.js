const { IService, AuthUtils, Validator, ValidationError, logger } = require('../../../shared');
const UserRepository = require('../repositories/UserRepository');

/**
 * User Service
 * Following SOLID principles:
 * - Single Responsibility: Only handles user business logic
 * - Open/Closed: Extensible through inheritance
 * - Liskov Substitution: Can replace IService
 * - Interface Segregation: Focused interface
 * - Dependency Inversion: Depends on abstractions (IRepository)
 */
class UserService extends IService {
  constructor(userRepository = null) {
    super(userRepository || new UserRepository());
    this.userRepository = this.repository;
  }

  /**
   * Validate user data
   */
  async validateData(userData, isUpdate = false) {
    const schema = this._getUserValidationSchema(isUpdate);
    return Validator.validate(userData, schema);
  }

  /**
   * Create new user
   */
  async create(userData) {
    try {
      // Validate input data
      const validatedData = await this.validateData(userData);
      
      // Check if user already exists
      const existingUser = await this.userRepository.findByEmail(validatedData.email);
      if (existingUser) {
        throw new ValidationError('User with this email already exists');
      }

      // Hash password
      validatedData.password = await AuthUtils.hashPassword(validatedData.password);

      // Generate email verification token if email verification is enabled
      if (process.env.EMAIL_VERIFICATION_ENABLED === 'true') {
        validatedData.emailVerificationToken = AuthUtils.generateRandomToken();
        validatedData.emailVerified = false;
      } else {
        validatedData.emailVerified = true;
      }

      // Create user
      const user = await this.userRepository.create(validatedData);
      
      logger.info('User created', { 
        userId: user._id, 
        email: user.email, 
        role: user.role 
      });

      return user;
    } catch (error) {
      logger.error('Failed to create user', { 
        email: userData.email, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Authenticate user
   */
  async authenticate(email, password) {
    try {
      // Find user with password
      const user = await this.userRepository.findByEmail(email, true);
      if (!user) {
        throw new ValidationError('Invalid credentials');
      }

      // Check if user is active
      if (!user.isActive) {
        throw new ValidationError('Account is deactivated');
      }

      // Verify password
      const isPasswordValid = await AuthUtils.comparePassword(password, user.password);
      if (!isPasswordValid) {
        throw new ValidationError('Invalid credentials');
      }

      // Update last login
      await this.userRepository.updateLastLogin(user._id);

      // Generate tokens
      const tokenPayload = {
        id: user._id,
        email: user.email,
        role: user.role,
        tenant: user.tenant
      };

      const accessToken = AuthUtils.generateToken(tokenPayload);
      const refreshToken = AuthUtils.generateRefreshToken();

      // Save refresh token
      await this.userRepository.updateRefreshToken(user._id, refreshToken);

      logger.info('User authenticated', { 
        userId: user._id, 
        email: user.email 
      });

      return {
        user: this._sanitizeUser(user),
        tokens: {
          accessToken,
          refreshToken
        }
      };
    } catch (error) {
      logger.error('Authentication failed', { 
        email, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken) {
    try {
      const user = await this.userRepository.findByRefreshToken(refreshToken);
      if (!user || !user.isActive) {
        throw new ValidationError('Invalid refresh token');
      }

      const tokenPayload = {
        id: user._id,
        email: user.email,
        role: user.role,
        tenant: user.tenant
      };

      const newAccessToken = AuthUtils.generateToken(tokenPayload);
      const newRefreshToken = AuthUtils.generateRefreshToken();

      // Update refresh token
      await this.userRepository.updateRefreshToken(user._id, newRefreshToken);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      };
    } catch (error) {
      logger.error('Token refresh failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  async findById(id) {
    try {
      const user = await this.userRepository.findById(id);
      if (!user) {
        throw new ValidationError('User not found');
      }
      return this._sanitizeUser(user);
    } catch (error) {
      logger.error('Failed to find user by ID', { userId: id, error: error.message });
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(userId, profileData) {
    try {
      const validatedData = this._validateProfileData(profileData);
      
      const updatedUser = await this.userRepository.updateProfile(userId, validatedData);
      if (!updatedUser) {
        throw new ValidationError('User not found');
      }

      logger.info('User profile updated', { userId });
      return this._sanitizeUser(updatedUser);
    } catch (error) {
      logger.error('Failed to update user profile', { 
        userId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Change password
   */
  async changePassword(userId, currentPassword, newPassword) {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new ValidationError('User not found');
      }

      // Verify current password
      const userWithPassword = await this.userRepository.findByEmail(user.email, true);
      const isCurrentPasswordValid = await AuthUtils.comparePassword(
        currentPassword, 
        userWithPassword.password
      );
      
      if (!isCurrentPasswordValid) {
        throw new ValidationError('Current password is incorrect');
      }

      // Hash new password
      const hashedNewPassword = await AuthUtils.hashPassword(newPassword);
      
      // Update password
      await this.userRepository.updatePassword(userId, hashedNewPassword);

      logger.info('Password changed', { userId });
      return { message: 'Password updated successfully' };
    } catch (error) {
      logger.error('Failed to change password', { 
        userId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get users by tenant
   */
  async findByTenant(tenantId, options = {}) {
    try {
      const result = await this.userRepository.findByTenant(tenantId, options);
      return {
        ...result,
        data: result.data.map(user => this._sanitizeUser(user))
      };
    } catch (error) {
      logger.error('Failed to find users by tenant', { 
        tenantId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Deactivate user
   */
  async deactivate(userId) {
    try {
      const user = await this.userRepository.updateById(userId, { 
        isActive: false,
        refreshToken: null
      });
      
      if (!user) {
        throw new ValidationError('User not found');
      }

      logger.info('User deactivated', { userId });
      return { message: 'User deactivated successfully' };
    } catch (error) {
      logger.error('Failed to deactivate user', { 
        userId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Clear refresh token (for logout)
   */
  async clearRefreshToken(userId) {
    try {
      await this.userRepository.updateRefreshToken(userId, null);
      logger.info('Refresh token cleared', { userId });
      return { message: 'Logged out successfully' };
    } catch (error) {
      logger.error('Failed to clear refresh token', { 
        userId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  _getUserValidationSchema(isUpdate = false) {
    const Joi = require('joi');
    
    const baseSchema = {
      firstName: Joi.string().trim().max(50),
      lastName: Joi.string().trim().max(50),
      email: Joi.string().email().lowercase().trim(),
      password: Joi.string().min(6).max(100).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .message('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
      phone: Joi.string().pattern(/^\+?[\d\s-()]+$/).optional(),
      role: Joi.string().valid('admin', 'tenant', 'service_provider', 'customer'),
      tenant: Joi.string().pattern(/^[0-9a-fA-F]{24}$/)
    };

    if (isUpdate) {
      return Joi.object({
        ...Object.keys(baseSchema).reduce((acc, key) => {
          acc[key] = baseSchema[key].optional();
          return acc;
        }, {})
      });
    }

    return Joi.object({
      firstName: baseSchema.firstName.required(),
      lastName: baseSchema.lastName.required(),
      email: baseSchema.email.required(),
      password: baseSchema.password.required(),
      phone: baseSchema.phone,
      role: baseSchema.role.required(),
      tenant: baseSchema.tenant.when('role', {
        is: 'admin',
        then: Joi.optional(),
        otherwise: Joi.required()
      })
    });
  }

  _validateProfileData(profileData) {
    const Joi = require('joi');
    
    const schema = Joi.object({
      avatar: Joi.string().uri().optional(),
      bio: Joi.string().max(500).optional(),
      specializations: Joi.array().items(Joi.string()).optional(),
      experience: Joi.number().min(0).max(50).optional()
    });

    return Validator.validate(profileData, schema);
  }

  _sanitizeUser(user) {
    const userObj = user.toObject ? user.toObject() : user;
    delete userObj.password;
    delete userObj.passwordResetToken;
    delete userObj.emailVerificationToken;
    delete userObj.refreshToken;
    return userObj;
  }
}

module.exports = UserService;