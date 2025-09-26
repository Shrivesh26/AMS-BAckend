const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Tenant = require('../models/Tenant');

// Protect routes
exports.protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Make sure token exists
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from token
    const user = await User.findById(decoded.id).populate('tenant');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'No user found with this token'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User account is deactivated'
      });
    }

    // Check if tenant is active (except for admin users)
    if (user.role !== 'admin' && user.tenant && !user.tenant.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Tenant account is inactive'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`
      });
    }
    next();
  };
};

// Multi-tenant middleware - ensures data isolation
exports.tenantIsolation = (req, res, next) => {
  // Skip tenant isolation for admin users
  if (req.user.role === 'admin') {
    return next();
  }

  // Ensure tenant context is set
  if (!req.user.tenant) {
    return res.status(400).json({
      success: false,
      message: 'No tenant context found'
    });
  }

  // Add tenant filter to query
  req.tenantId = req.user.tenant._id;
  next();
};

// Optional tenant context middleware for routes that may need tenant info
exports.optionalTenantContext = (req, res, next) => {
  if (req.user && req.user.tenant) {
    req.tenantId = req.user.tenant._id;
  }
  next();
};