const { IService, AuthUtils, Validator, ValidationError, logger } = require('../../../shared');
const TenantRepository = require('../repositories/TenantRepository');

/**
 * Tenant Service
 * Following SOLID principles - handles tenant business logic
 */
class TenantService extends IService {
  constructor(tenantRepository = null) {
    super(tenantRepository || new TenantRepository());
    this.tenantRepository = this.repository;
  }

  /**
   * Validate tenant data
   */
  async validateData(tenantData, isUpdate = false) {
    const schema = this._getTenantValidationSchema(isUpdate);
    return Validator.validate(tenantData, schema);
  }

  /**
   * Create new tenant
   */
  async create(tenantData) {
    try {
      // Validate input data
      const validatedData = await this.validateData(tenantData);
      
      // Check if subdomain is available
      const isSubdomainAvailable = await this.tenantRepository.isSubdomainAvailable(
        validatedData.subdomain
      );
      if (!isSubdomainAvailable) {
        throw new ValidationError('Subdomain is already taken');
      }

      // Check if email is available
      const isEmailAvailable = await this.tenantRepository.isEmailAvailable(
        validatedData.email
      );
      if (!isEmailAvailable) {
        throw new ValidationError('Email is already registered');
      }

      // Set default subscription settings based on plan
      validatedData.subscription = this._getDefaultSubscription(
        validatedData.subscription?.plan || 'basic'
      );

      // Set default business hours
      if (!validatedData.settings?.businessHours) {
        validatedData.settings = {
          ...validatedData.settings,
          businessHours: this._getDefaultBusinessHours()
        };
      }

      // Generate verification token if verification is enabled
      if (process.env.TENANT_VERIFICATION_ENABLED === 'true') {
        validatedData.verificationToken = AuthUtils.generateRandomToken();
        validatedData.isVerified = false;
      } else {
        validatedData.isVerified = true;
      }

      // Initialize statistics
      validatedData.statistics = {
        totalUsers: 0,
        totalServices: 0,
        totalBookings: 0,
        totalRevenue: 0,
        lastActivityDate: new Date()
      };

      // Create tenant
      const tenant = await this.tenantRepository.create(validatedData);
      
      logger.info('Tenant created', { 
        tenantId: tenant._id, 
        subdomain: tenant.subdomain,
        businessType: tenant.business.type 
      });

      return tenant;
    } catch (error) {
      logger.error('Failed to create tenant', { 
        subdomain: tenantData.subdomain, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get tenant by ID
   */
  async findById(id) {
    try {
      const tenant = await this.tenantRepository.findById(id);
      if (!tenant) {
        throw new ValidationError('Tenant not found');
      }
      return tenant;
    } catch (error) {
      logger.error('Failed to find tenant by ID', { tenantId: id, error: error.message });
      throw error;
    }
  }

  /**
   * Get tenant by subdomain
   */
  async findBySubdomain(subdomain) {
    try {
      const tenant = await this.tenantRepository.findBySubdomain(subdomain);
      if (!tenant) {
        throw new ValidationError('Tenant not found');
      }
      return tenant;
    } catch (error) {
      logger.error('Failed to find tenant by subdomain', { 
        subdomain, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Update tenant
   */
  async update(tenantId, updateData) {
    try {
      const validatedData = await this.validateData(updateData, true);
      
      // Check subdomain availability if being updated
      if (validatedData.subdomain) {
        const isSubdomainAvailable = await this.tenantRepository.isSubdomainAvailable(
          validatedData.subdomain,
          tenantId
        );
        if (!isSubdomainAvailable) {
          throw new ValidationError('Subdomain is already taken');
        }
      }

      // Check email availability if being updated
      if (validatedData.email) {
        const isEmailAvailable = await this.tenantRepository.isEmailAvailable(
          validatedData.email,
          tenantId
        );
        if (!isEmailAvailable) {
          throw new ValidationError('Email is already registered');
        }
      }

      const updatedTenant = await this.tenantRepository.updateById(tenantId, validatedData);
      if (!updatedTenant) {
        throw new ValidationError('Tenant not found');
      }

      logger.info('Tenant updated', { tenantId });
      return updatedTenant;
    } catch (error) {
      logger.error('Failed to update tenant', { 
        tenantId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Update tenant settings
   */
  async updateSettings(tenantId, settings) {
    try {
      const validatedSettings = this._validateSettings(settings);
      
      const updatedTenant = await this.tenantRepository.updateSettings(
        tenantId, 
        validatedSettings
      );
      
      if (!updatedTenant) {
        throw new ValidationError('Tenant not found');
      }

      logger.info('Tenant settings updated', { tenantId });
      return updatedTenant;
    } catch (error) {
      logger.error('Failed to update tenant settings', { 
        tenantId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Update subscription
   */
  async updateSubscription(tenantId, subscriptionData) {
    try {
      const validatedSubscription = this._validateSubscription(subscriptionData);
      
      // Apply plan-specific features
      if (validatedSubscription.plan) {
        validatedSubscription.features = this._getPlanFeatures(validatedSubscription.plan);
      }

      const updatedTenant = await this.tenantRepository.updateSubscription(
        tenantId, 
        validatedSubscription
      );
      
      if (!updatedTenant) {
        throw new ValidationError('Tenant not found');
      }

      logger.info('Tenant subscription updated', { 
        tenantId, 
        plan: validatedSubscription.plan 
      });
      
      return updatedTenant;
    } catch (error) {
      logger.error('Failed to update tenant subscription', { 
        tenantId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get all tenants (admin only)
   */
  async findMany(options = {}) {
    try {
      return await this.tenantRepository.findActive(options);
    } catch (error) {
      logger.error('Failed to find tenants', { error: error.message });
      throw error;
    }
  }

  /**
   * Get tenant statistics
   */
  async getStatistics(tenantId) {
    try {
      const tenant = await this.tenantRepository.findById(tenantId);
      if (!tenant) {
        throw new ValidationError('Tenant not found');
      }

      return {
        ...tenant.statistics,
        subscriptionStatus: tenant.subscription.status,
        subscriptionPlan: tenant.subscription.plan,
        isActive: tenant.isActive,
        createdAt: tenant.createdAt
      };
    } catch (error) {
      logger.error('Failed to get tenant statistics', { 
        tenantId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Update tenant statistics
   */
  async updateStatistics(tenantId, statistics) {
    try {
      const validatedStats = this._validateStatistics(statistics);
      
      const updatedTenant = await this.tenantRepository.updateStatistics(
        tenantId, 
        validatedStats
      );
      
      if (!updatedTenant) {
        throw new ValidationError('Tenant not found');
      }

      return updatedTenant.statistics;
    } catch (error) {
      logger.error('Failed to update tenant statistics', { 
        tenantId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Suspend tenant
   */
  async suspend(tenantId, reason = null) {
    try {
      const updatedTenant = await this.tenantRepository.suspend(tenantId, reason);
      if (!updatedTenant) {
        throw new ValidationError('Tenant not found');
      }

      logger.info('Tenant suspended', { tenantId, reason });
      return { message: 'Tenant suspended successfully' };
    } catch (error) {
      logger.error('Failed to suspend tenant', { 
        tenantId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Reactivate tenant
   */
  async reactivate(tenantId) {
    try {
      const updatedTenant = await this.tenantRepository.reactivate(tenantId);
      if (!updatedTenant) {
        throw new ValidationError('Tenant not found');
      }

      logger.info('Tenant reactivated', { tenantId });
      return { message: 'Tenant reactivated successfully' };
    } catch (error) {
      logger.error('Failed to reactivate tenant', { 
        tenantId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get global statistics summary (admin only)
   */
  async getGlobalStatistics() {
    try {
      return await this.tenantRepository.getStatisticsSummary();
    } catch (error) {
      logger.error('Failed to get global statistics', { error: error.message });
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  _getTenantValidationSchema(isUpdate = false) {
    const Joi = require('joi');
    
    const baseSchema = {
      name: Joi.string().trim().max(100),
      subdomain: Joi.string().lowercase().trim().pattern(/^[a-zA-Z0-9-]+$/),
      email: Joi.string().email().lowercase().trim(),
      phone: Joi.string().pattern(/^\+?[\d\s-()]+$/).optional(),
      address: Joi.object({
        street: Joi.string().optional(),
        city: Joi.string().optional(),
        state: Joi.string().optional(),
        zipCode: Joi.string().optional(),
        country: Joi.string().optional(),
        coordinates: Joi.object({
          latitude: Joi.number().min(-90).max(90).optional(),
          longitude: Joi.number().min(-180).max(180).optional()
        }).optional()
      }).optional(),
      business: Joi.object({
        type: Joi.string().valid('salon', 'spa', 'clinic', 'consulting', 'fitness', 'automotive', 'other'),
        description: Joi.string().max(1000).optional(),
        website: Joi.string().uri().optional(),
        logo: Joi.string().uri().optional(),
        socialMedia: Joi.object({
          facebook: Joi.string().optional(),
          instagram: Joi.string().optional(),
          twitter: Joi.string().optional(),
          linkedin: Joi.string().optional()
        }).optional()
      })
    };

    if (isUpdate) {
      return Joi.object({
        ...Object.keys(baseSchema).reduce((acc, key) => {
          acc[key] = baseSchema[key].optional();
          return acc;
        }, {})
      });
    }

    return Joi.object({
      name: baseSchema.name.required(),
      subdomain: baseSchema.subdomain.required(),
      email: baseSchema.email.required(),
      phone: baseSchema.phone,
      address: baseSchema.address,
      business: baseSchema.business.required()
    });
  }

  _validateSettings(settings) {
    const Joi = require('joi');
    
    const schema = Joi.object({
      timeZone: Joi.string().optional(),
      currency: Joi.string().valid('USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD').optional(),
      dateFormat: Joi.string().valid('MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD').optional(),
      timeFormat: Joi.string().valid('12h', '24h').optional(),
      businessHours: Joi.object().pattern(
        Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'),
        Joi.object({
          start: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
          end: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
          closed: Joi.boolean().optional()
        })
      ).optional(),
      bookingSettings: Joi.object({
        advanceBookingDays: Joi.number().min(1).max(365).optional(),
        minBookingNotice: Joi.number().min(0).optional(),
        cancellationPolicy: Joi.number().min(0).optional(),
        autoConfirmBookings: Joi.boolean().optional(),
        allowOnlinePayments: Joi.boolean().optional()
      }).optional(),
      notifications: Joi.object({
        email: Joi.boolean().optional(),
        sms: Joi.boolean().optional(),
        push: Joi.boolean().optional()
      }).optional()
    });

    return Validator.validate(settings, schema);
  }

  _validateSubscription(subscription) {
    const Joi = require('joi');
    
    const schema = Joi.object({
      plan: Joi.string().valid('basic', 'premium', 'enterprise').optional(),
      status: Joi.string().valid('active', 'inactive', 'suspended', 'trial').optional(),
      endDate: Joi.date().optional(),
      trialEndDate: Joi.date().optional()
    });

    return Validator.validate(subscription, schema);
  }

  _validateStatistics(statistics) {
    const Joi = require('joi');
    
    const schema = Joi.object({
      totalUsers: Joi.number().min(0).optional(),
      totalServices: Joi.number().min(0).optional(),
      totalBookings: Joi.number().min(0).optional(),
      totalRevenue: Joi.number().min(0).optional()
    });

    return Validator.validate(statistics, schema);
  }

  _getDefaultSubscription(plan) {
    const now = new Date();
    const trialEnd = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 days

    return {
      plan,
      status: 'trial',
      startDate: now,
      trialEndDate: trialEnd,
      features: this._getPlanFeatures(plan)
    };
  }

  _getPlanFeatures(plan) {
    const features = {
      basic: {
        maxUsers: 5,
        maxServices: 10,
        maxBookings: 100,
        advancedReports: false,
        customBranding: false,
        apiAccess: false
      },
      premium: {
        maxUsers: 25,
        maxServices: 50,
        maxBookings: 1000,
        advancedReports: true,
        customBranding: true,
        apiAccess: false
      },
      enterprise: {
        maxUsers: -1, // unlimited
        maxServices: -1, // unlimited
        maxBookings: -1, // unlimited
        advancedReports: true,
        customBranding: true,
        apiAccess: true
      }
    };

    return features[plan] || features.basic;
  }

  _getDefaultBusinessHours() {
    return {
      monday: { start: '09:00', end: '17:00', closed: false },
      tuesday: { start: '09:00', end: '17:00', closed: false },
      wednesday: { start: '09:00', end: '17:00', closed: false },
      thursday: { start: '09:00', end: '17:00', closed: false },
      friday: { start: '09:00', end: '17:00', closed: false },
      saturday: { start: '10:00', end: '15:00', closed: false },
      sunday: { start: '10:00', end: '15:00', closed: true }
    };
  }
}

module.exports = TenantService;