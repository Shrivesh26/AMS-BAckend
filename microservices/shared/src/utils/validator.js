const Joi = require('joi');

/**
 * Validation Utility Class
 * Following Single Responsibility Principle
 */
class Validator {
  /**
   * Validate data against schema
   */
  static validate(data, schema) {
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      throw new ValidationError('Validation failed', errors);
    }

    return value;
  }

  /**
   * Common validation schemas
   */
  static get schemas() {
    return {
      objectId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).message('Invalid ObjectId format'),
      
      email: Joi.string().email().lowercase().trim(),
      
      password: Joi.string().min(6).max(100).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .message('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
      
      phone: Joi.string().pattern(/^\+?[\d\s-()]+$/).message('Invalid phone number format'),
      
      pagination: Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(10)
      }),

      tenantId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required()
        .message('Valid tenant ID is required'),

      userRole: Joi.string().valid('admin', 'tenant', 'service_provider', 'customer'),

      businessType: Joi.string().valid('salon', 'spa', 'clinic', 'consulting', 'fitness', 'automotive', 'other'),

      bookingStatus: Joi.string().valid('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')
    };
  }
}

/**
 * Custom Validation Error
 */
class ValidationError extends Error {
  constructor(message, errors) {
    super(message);
    this.name = 'ValidationError';
    this.errors = errors;
    this.statusCode = 400;
  }
}

module.exports = { Validator, ValidationError };