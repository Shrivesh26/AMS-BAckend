const User = require('../models/User');
const { MongoRepository } = require('../../../shared');

/**
 * User Repository
 * Following Repository Pattern and Dependency Inversion Principle
 */
class UserRepository extends MongoRepository {
  constructor() {
    super(User);
  }

  /**
   * Find user by email
   */
  async findByEmail(email, includePassword = false) {
    try {
      let query = this.model.findOne({ email: email.toLowerCase() });
      
      if (includePassword) {
        query = query.select('+password');
      }
      
      return await query.exec();
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Find users by tenant
   */
  async findByTenant(tenantId, options = {}) {
    try {
      const filter = { tenant: tenantId };
      return await this.findMany(filter, options);
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Find users by role
   */
  async findByRole(role, tenantId = null, options = {}) {
    try {
      const filter = { role };
      if (tenantId) {
        filter.tenant = tenantId;
      }
      return await this.findMany(filter, options);
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Find service providers by location
   */
  async findProvidersByLocation(latitude, longitude, maxDistance = 10000, options = {}) {
    try {
      const filter = {
        role: 'service_provider',
        'address.coordinates': {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [longitude, latitude]
            },
            $maxDistance: maxDistance
          }
        }
      };
      
      return await this.findMany(filter, options);
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(userId, profileData, session = null) {
    try {
      return await this.updateById(userId, { profile: profileData }, session);
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Update user password
   */
  async updatePassword(userId, hashedPassword, session = null) {
    try {
      return await this.updateById(userId, { password: hashedPassword }, session);
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(userId, session = null) {
    try {
      return await this.updateById(userId, { lastLogin: new Date() }, session);
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Set email verification token
   */
  async setEmailVerificationToken(userId, token, session = null) {
    try {
      return await this.updateById(userId, { 
        emailVerificationToken: token 
      }, session);
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Verify email
   */
  async verifyEmail(token, session = null) {
    try {
      return await this.updateOne(
        { emailVerificationToken: token },
        { 
          emailVerified: true, 
          emailVerificationToken: undefined 
        },
        session
      );
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Set password reset token
   */
  async setPasswordResetToken(email, token, expires, session = null) {
    try {
      return await this.updateOne(
        { email: email.toLowerCase() },
        { 
          passwordResetToken: token,
          passwordResetExpires: expires
        },
        session
      );
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Find user by password reset token
   */
  async findByPasswordResetToken(token) {
    try {
      return await this.findOne({
        passwordResetToken: token,
        passwordResetExpires: { $gt: Date.now() }
      });
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Update refresh token
   */
  async updateRefreshToken(userId, refreshToken, session = null) {
    try {
      return await this.updateById(userId, { refreshToken }, session);
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Find user by refresh token
   */
  async findByRefreshToken(refreshToken) {
    try {
      return await this.findOne({ refreshToken });
    } catch (error) {
      throw this._handleError(error);
    }
  }
}

module.exports = UserRepository;