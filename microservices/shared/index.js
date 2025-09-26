/**
 * Shared library exports
 * Central access point for all shared functionality
 */

// Interfaces
const IRepository = require('./src/interfaces/IRepository');
const IService = require('./src/interfaces/IService');

// Repositories
const MongoRepository = require('./src/repositories/MongoRepository');

// Utils
const logger = require('./src/utils/logger');
const AuthUtils = require('./src/utils/auth');
const { Validator, ValidationError } = require('./src/utils/validator');

// Middleware
const AuthMiddleware = require('./src/middleware/auth');
const ErrorHandler = require('./src/middleware/errorHandler');

// Config
const DatabaseConfig = require('./src/config/database');

module.exports = {
  // Interfaces
  IRepository,
  IService,
  
  // Repositories
  MongoRepository,
  
  // Utils
  logger,
  AuthUtils,
  Validator,
  ValidationError,
  
  // Middleware
  AuthMiddleware,
  ErrorHandler,
  
  // Config
  DatabaseConfig
};