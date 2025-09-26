const Tenant = require('../models/Tenant');
const { MongoRepository } = require('../../../shared');

/**
 * Tenant Repository
 * Following Repository Pattern and Dependency Inversion Principle
 */
class TenantRepository extends MongoRepository {
  constructor() {
    super(Tenant);
  }

  /**
   * Find tenant by subdomain
   */
  async findBySubdomain(subdomain) {
    try {
      return await this.findOne({ 
        subdomain: subdomain.toLowerCase(),
        isActive: true 
      });
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Find tenant by email
   */
  async findByEmail(email) {
    try {
      return await this.findOne({ 
        email: email.toLowerCase(),
        isActive: true 
      });
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Check if subdomain is available
   */
  async isSubdomainAvailable(subdomain, excludeId = null) {
    try {
      const filter = { subdomain: subdomain.toLowerCase() };
      if (excludeId) {
        filter._id = { $ne: excludeId };
      }
      
      const tenant = await this.findOne(filter);
      return !tenant;
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Check if email is available
   */
  async isEmailAvailable(email, excludeId = null) {
    try {
      const filter = { email: email.toLowerCase() };
      if (excludeId) {
        filter._id = { $ne: excludeId };
      }
      
      const tenant = await this.findOne(filter);
      return !tenant;
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Find active tenants
   */
  async findActive(options = {}) {
    try {
      const filter = { isActive: true };
      return await this.findMany(filter, options);
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Find tenants by subscription status
   */
  async findBySubscriptionStatus(status, options = {}) {
    try {
      const filter = { 
        'subscription.status': status,
        isActive: true 
      };
      return await this.findMany(filter, options);
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Find tenants with expiring trials
   */
  async findExpiringTrials(daysFromNow = 7) {
    try {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + daysFromNow);
      
      const filter = {
        'subscription.status': 'trial',
        'subscription.trialEndDate': { $lte: targetDate },
        isActive: true
      };
      
      return await this.findMany(filter);
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Update tenant statistics
   */
  async updateStatistics(tenantId, statistics, session = null) {
    try {
      const updateData = {
        'statistics.lastActivityDate': new Date(),
        ...Object.keys(statistics).reduce((acc, key) => {
          acc[`statistics.${key}`] = statistics[key];
          return acc;
        }, {})
      };
      
      return await this.updateById(tenantId, updateData, session);
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Update subscription
   */
  async updateSubscription(tenantId, subscriptionData, session = null) {
    try {
      const updateData = Object.keys(subscriptionData).reduce((acc, key) => {
        acc[`subscription.${key}`] = subscriptionData[key];
        return acc;
      }, {});
      
      return await this.updateById(tenantId, updateData, session);
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Update settings
   */
  async updateSettings(tenantId, settings, session = null) {
    try {
      const updateData = Object.keys(settings).reduce((acc, key) => {
        if (typeof settings[key] === 'object' && settings[key] !== null) {
          // Handle nested objects
          Object.keys(settings[key]).forEach(nestedKey => {
            acc[`settings.${key}.${nestedKey}`] = settings[key][nestedKey];
          });
        } else {
          acc[`settings.${key}`] = settings[key];
        }
        return acc;
      }, {});
      
      return await this.updateById(tenantId, updateData, session);
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Suspend tenant
   */
  async suspend(tenantId, reason = null, session = null) {
    try {
      const updateData = {
        'subscription.status': 'suspended',
        'subscription.suspensionReason': reason,
        'subscription.suspensionDate': new Date()
      };
      
      return await this.updateById(tenantId, updateData, session);
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Reactivate tenant
   */
  async reactivate(tenantId, session = null) {
    try {
      const updateData = {
        'subscription.status': 'active',
        'subscription.suspensionReason': undefined,
        'subscription.suspensionDate': undefined
      };
      
      return await this.updateById(tenantId, updateData, session);
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Verify tenant
   */
  async verify(verificationToken, session = null) {
    try {
      return await this.updateOne(
        { verificationToken },
        { 
          isVerified: true,
          verificationToken: undefined
        },
        session
      );
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Get tenant statistics summary
   */
  async getStatisticsSummary() {
    try {
      const pipeline = [
        {
          $match: { isActive: true }
        },
        {
          $group: {
            _id: null,
            totalTenants: { $sum: 1 },
            activeTenants: {
              $sum: { $cond: [{ $eq: ['$subscription.status', 'active'] }, 1, 0] }
            },
            trialTenants: {
              $sum: { $cond: [{ $eq: ['$subscription.status', 'trial'] }, 1, 0] }
            },
            suspendedTenants: {
              $sum: { $cond: [{ $eq: ['$subscription.status', 'suspended'] }, 1, 0] }
            },
            totalRevenue: { $sum: '$statistics.totalRevenue' },
            totalBookings: { $sum: '$statistics.totalBookings' }
          }
        }
      ];
      
      const result = await this.model.aggregate(pipeline);
      return result[0] || {
        totalTenants: 0,
        activeTenants: 0,
        trialTenants: 0,
        suspendedTenants: 0,
        totalRevenue: 0,
        totalBookings: 0
      };
    } catch (error) {
      throw this._handleError(error);
    }
  }
}

module.exports = TenantRepository;