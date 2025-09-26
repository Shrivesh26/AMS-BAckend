const AuthUtils = require('../utils/auth');
const logger = require('../utils/logger');
const { ValidationError } = require('../utils/validator');

/**
 * Authentication Middleware
 * Following Single Responsibility Principle
 */
class AuthMiddleware {
  /**
   * Protect routes - require authentication
   */
  static protect(req, res, next) {
    try {
      const token = AuthUtils.extractTokenFromHeader(req.headers.authorization);
      
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'No token provided, authorization denied'
        });
      }

      const decoded = AuthUtils.verifyToken(token);
      req.user = decoded;
      
      logger.info('User authenticated', { 
        userId: decoded.id, 
        role: decoded.role,
        tenant: decoded.tenant 
      });
      
      next();
    } catch (error) {
      logger.error('Authentication failed', { error: error.message });
      
      return res.status(401).json({
        success: false,
        message: 'Token is not valid'
      });
    }
  }

  /**
   * Authorize based on roles
   */
  static authorize(...roles) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Not authenticated'
        });
      }

      if (!AuthUtils.hasRole(req.user.role, roles)) {
        logger.warn('Authorization failed', { 
          userId: req.user.id, 
          userRole: req.user.role, 
          requiredRoles: roles 
        });
        
        return res.status(403).json({
          success: false,
          message: 'Not authorized to access this resource'
        });
      }

      next();
    };
  }

  /**
   * Ensure tenant access
   */
  static ensureTenantAccess(req, res, next) {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    // Extract tenant ID from request (params, body, or query)
    const requestedTenant = req.params.tenantId || req.body.tenant || req.query.tenant;
    
    if (!requestedTenant) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID is required'
      });
    }

    if (!AuthUtils.canAccessTenant(req.user.tenant, requestedTenant, req.user.role)) {
      logger.warn('Tenant access denied', { 
        userId: req.user.id, 
        userTenant: req.user.tenant, 
        requestedTenant 
      });
      
      return res.status(403).json({
        success: false,
        message: 'Access denied to this tenant'
      });
    }

    next();
  }

  /**
   * Optional authentication - don't fail if no token
   */
  static optionalAuth(req, res, next) {
    try {
      const token = AuthUtils.extractTokenFromHeader(req.headers.authorization);
      
      if (token) {
        const decoded = AuthUtils.verifyToken(token);
        req.user = decoded;
      }
      
      next();
    } catch (error) {
      // Log but don't fail for optional auth
      logger.debug('Optional auth failed', { error: error.message });
      next();
    }
  }
}

module.exports = AuthMiddleware;