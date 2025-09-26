const logger = require('../utils/logger');
const { ValidationError } = require('../utils/validator');

/**
 * Global Error Handler Middleware
 * Following Single Responsibility Principle
 */
class ErrorHandler {
  static handle(err, req, res, next) {
    let error = { ...err };
    error.message = err.message;

    // Log error
    logger.logError(err, {
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id,
      tenant: req.user?.tenant
    });

    // Mongoose bad ObjectId
    if (err.name === 'CastError') {
      const message = 'Resource not found';
      error = { message, statusCode: 404 };
    }

    // Mongoose duplicate key
    if (err.code === 11000) {
      const message = 'Duplicate field value entered';
      error = { message, statusCode: 400 };
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
      const message = Object.values(err.errors).map(val => val.message).join(', ');
      error = { message, statusCode: 400 };
    }

    // Custom validation error
    if (err instanceof ValidationError) {
      return res.status(err.statusCode || 400).json({
        success: false,
        message: err.message,
        errors: err.errors
      });
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
      error = { message: 'Invalid token', statusCode: 401 };
    }

    if (err.name === 'TokenExpiredError') {
      error = { message: 'Token expired', statusCode: 401 };
    }

    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Server Error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  }

  /**
   * Handle async errors
   */
  static asyncHandler(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  /**
   * Handle 404 errors
   */
  static notFound(req, res, next) {
    const error = new Error(`Route ${req.originalUrl} not found`);
    error.statusCode = 404;
    next(error);
  }
}

module.exports = ErrorHandler;