const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { ValidationError } = require('../utils/validator');

/**
 * Authentication Utility Class
 * Following Single Responsibility Principle
 */
class AuthUtils {
  /**
   * Generate JWT token
   */
  static generateToken(payload, options = {}) {
    const defaultOptions = {
      expiresIn: process.env.JWT_EXPIRE || '7d',
      issuer: process.env.JWT_ISSUER || 'ams-api',
      audience: process.env.JWT_AUDIENCE || 'ams-users'
    };

    return jwt.sign(payload, process.env.JWT_SECRET, { ...defaultOptions, ...options });
  }

  /**
   * Verify JWT token
   */
  static verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new ValidationError('Token has expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new ValidationError('Invalid token');
      }
      throw error;
    }
  }

  /**
   * Hash password
   */
  static async hashPassword(password) {
    const salt = await bcrypt.genSalt(12);
    return bcrypt.hash(password, salt);
  }

  /**
   * Compare password
   */
  static async comparePassword(password, hashedPassword) {
    return bcrypt.compare(password, hashedPassword);
  }

  /**
   * Generate random token for email verification, password reset, etc.
   */
  static generateRandomToken(length = 32) {
    return require('crypto').randomBytes(length).toString('hex');
  }

  /**
   * Extract token from authorization header
   */
  static extractTokenFromHeader(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.slice(7);
  }

  /**
   * Check if user has required role
   */
  static hasRole(userRole, requiredRoles) {
    if (typeof requiredRoles === 'string') {
      return userRole === requiredRoles;
    }
    return requiredRoles.includes(userRole);
  }

  /**
   * Check if user can access tenant data
   */
  static canAccessTenant(userTenant, requestedTenant, userRole) {
    // Admin can access any tenant
    if (userRole === 'admin') {
      return true;
    }
    
    // Users can only access their own tenant data
    return userTenant.toString() === requestedTenant.toString();
  }

  /**
   * Generate refresh token
   */
  static generateRefreshToken() {
    return this.generateRandomToken(64);
  }
}

module.exports = AuthUtils;