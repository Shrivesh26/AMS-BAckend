const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Database Configuration
 * Following Single Responsibility Principle
 */
class DatabaseConfig {
  constructor() {
    this.connection = null;
    this.isConnected = false;
  }

  /**
   * Connect to MongoDB
   */
  async connect(uri = process.env.MONGODB_URI) {
    if (this.isConnected) {
      logger.info('Database already connected');
      return this.connection;
    }

    try {
      const options = {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        family: 4, // Use IPv4, skip trying IPv6
        retryWrites: true,
        retryReads: true,
      };

      this.connection = await mongoose.connect(uri, options);
      this.isConnected = true;

      logger.info(`Database connected: ${this.connection.connection.host}`);

      // Handle connection events
      mongoose.connection.on('error', (error) => {
        logger.error('Database connection error:', error);
        this.isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('Database disconnected');
        this.isConnected = false;
      });

      mongoose.connection.on('reconnected', () => {
        logger.info('Database reconnected');
        this.isConnected = true;
      });

      // Graceful shutdown
      process.on('SIGINT', async () => {
        await this.disconnect();
        process.exit(0);
      });

      return this.connection;
    } catch (error) {
      logger.error('Database connection failed:', error);
      
      // Don't exit in development mode
      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      }
      
      throw error;
    }
  }

  /**
   * Disconnect from MongoDB
   */
  async disconnect() {
    if (!this.isConnected) {
      return;
    }

    try {
      await mongoose.connection.close();
      this.isConnected = false;
      logger.info('Database disconnected gracefully');
    } catch (error) {
      logger.error('Error disconnecting from database:', error);
      throw error;
    }
  }

  /**
   * Check if database is connected
   */
  isConnected() {
    return this.isConnected && mongoose.connection.readyState === 1;
  }

  /**
   * Get connection health status
   */
  getHealthStatus() {
    return {
      status: this.isConnected ? 'connected' : 'disconnected',
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      name: mongoose.connection.name
    };
  }
}

module.exports = new DatabaseConfig();