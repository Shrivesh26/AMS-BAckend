require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

const { DatabaseConfig, ErrorHandler, logger } = require('../../shared');
const tenantRoutes = require('./routes/tenantRoutes');

/**
 * Tenant Service Application
 * Following microservices architecture principles
 */
const app = express();

// Connect to database
DatabaseConfig.connect().catch(err => {
  logger.error('Failed to connect to database', err);
});

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  }
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}
app.use(logger.logRequest);

// Health check endpoint
app.get('/health', (req, res) => {
  const dbHealth = DatabaseConfig.getHealthStatus();
  
  res.status(200).json({
    success: true,
    service: 'tenant-service',
    timestamp: new Date().toISOString(),
    database: dbHealth,
    uptime: process.uptime()
  });
});

// API routes
app.use('/api/tenants', tenantRoutes);

// 404 handler
app.use('*', ErrorHandler.notFound);

// Error handling middleware
app.use(ErrorHandler.handle);

const PORT = process.env.PORT || 3002;

const server = app.listen(PORT, () => {
  logger.info(`Tenant Service running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received');
  server.close(() => {
    logger.info('Tenant Service terminated');
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received');
  server.close(() => {
    logger.info('Tenant Service terminated');
  });
});

module.exports = app;