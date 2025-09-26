const { ErrorHandler, logger } = require('../../../shared');
const TenantService = require('../services/TenantService');

/**
 * Tenant Controller
 * Following Single Responsibility Principle - handles HTTP requests/responses
 */
class TenantController {
  constructor(tenantService = null) {
    this.tenantService = tenantService || new TenantService();
  }

  /**
   * Create new tenant
   * @route POST /api/tenants
   */
  createTenant = ErrorHandler.asyncHandler(async (req, res) => {
    const tenant = await this.tenantService.create(req.body);
    
    res.status(201).json({
      success: true,
      message: 'Tenant created successfully',
      data: tenant
    });
  });

  /**
   * Get all tenants (admin only)
   * @route GET /api/tenants
   */
  getTenants = ErrorHandler.asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, status } = req.query;
    
    const options = {
      page: parseInt(page),
      limit: parseInt(limit)
    };

    if (status) {
      options.filter = { 'subscription.status': status };
    }

    const result = await this.tenantService.findMany(options);
    
    res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  });

  /**
   * Get tenant by ID
   * @route GET /api/tenants/:id
   */
  getTenantById = ErrorHandler.asyncHandler(async (req, res) => {
    const { id } = req.params;
    const tenant = await this.tenantService.findById(id);
    
    res.status(200).json({
      success: true,
      data: tenant
    });
  });

  /**
   * Get tenant by subdomain
   * @route GET /api/tenants/subdomain/:subdomain
   */
  getTenantBySubdomain = ErrorHandler.asyncHandler(async (req, res) => {
    const { subdomain } = req.params;
    const tenant = await this.tenantService.findBySubdomain(subdomain);
    
    res.status(200).json({
      success: true,
      data: tenant
    });
  });

  /**
   * Update tenant
   * @route PUT /api/tenants/:id
   */
  updateTenant = ErrorHandler.asyncHandler(async (req, res) => {
    const { id } = req.params;
    const tenant = await this.tenantService.update(id, req.body);
    
    res.status(200).json({
      success: true,
      message: 'Tenant updated successfully',
      data: tenant
    });
  });

  /**
   * Update tenant settings
   * @route PUT /api/tenants/:id/settings
   */
  updateTenantSettings = ErrorHandler.asyncHandler(async (req, res) => {
    const { id } = req.params;
    const tenant = await this.tenantService.updateSettings(id, req.body);
    
    res.status(200).json({
      success: true,
      message: 'Tenant settings updated successfully',
      data: tenant
    });
  });

  /**
   * Update tenant subscription
   * @route PUT /api/tenants/:id/subscription
   */
  updateTenantSubscription = ErrorHandler.asyncHandler(async (req, res) => {
    const { id } = req.params;
    const tenant = await this.tenantService.updateSubscription(id, req.body);
    
    res.status(200).json({
      success: true,
      message: 'Tenant subscription updated successfully',
      data: tenant
    });
  });

  /**
   * Get tenant statistics
   * @route GET /api/tenants/:id/statistics
   */
  getTenantStatistics = ErrorHandler.asyncHandler(async (req, res) => {
    const { id } = req.params;
    const statistics = await this.tenantService.getStatistics(id);
    
    res.status(200).json({
      success: true,
      data: statistics
    });
  });

  /**
   * Update tenant statistics
   * @route PUT /api/tenants/:id/statistics
   */
  updateTenantStatistics = ErrorHandler.asyncHandler(async (req, res) => {
    const { id } = req.params;
    const statistics = await this.tenantService.updateStatistics(id, req.body);
    
    res.status(200).json({
      success: true,
      message: 'Tenant statistics updated successfully',
      data: statistics
    });
  });

  /**
   * Suspend tenant (admin only)
   * @route PUT /api/tenants/:id/suspend
   */
  suspendTenant = ErrorHandler.asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    
    const result = await this.tenantService.suspend(id, reason);
    
    res.status(200).json({
      success: true,
      message: result.message
    });
  });

  /**
   * Reactivate tenant (admin only)
   * @route PUT /api/tenants/:id/reactivate
   */
  reactivateTenant = ErrorHandler.asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await this.tenantService.reactivate(id);
    
    res.status(200).json({
      success: true,
      message: result.message
    });
  });

  /**
   * Get global statistics (admin only)
   * @route GET /api/tenants/statistics/global
   */
  getGlobalStatistics = ErrorHandler.asyncHandler(async (req, res) => {
    const statistics = await this.tenantService.getGlobalStatistics();
    
    res.status(200).json({
      success: true,
      data: statistics
    });
  });

  /**
   * Get current tenant info (for tenant users)
   * @route GET /api/tenants/me
   */
  getCurrentTenant = ErrorHandler.asyncHandler(async (req, res) => {
    if (!req.user.tenant) {
      return res.status(400).json({
        success: false,
        message: 'No tenant associated with this user'
      });
    }

    const tenant = await this.tenantService.findById(req.user.tenant);
    
    res.status(200).json({
      success: true,
      data: tenant
    });
  });

  /**
   * Update current tenant (for tenant owners)
   * @route PUT /api/tenants/me
   */
  updateCurrentTenant = ErrorHandler.asyncHandler(async (req, res) => {
    if (!req.user.tenant) {
      return res.status(400).json({
        success: false,
        message: 'No tenant associated with this user'
      });
    }

    const tenant = await this.tenantService.update(req.user.tenant, req.body);
    
    res.status(200).json({
      success: true,
      message: 'Tenant updated successfully',
      data: tenant
    });
  });

  /**
   * Update current tenant settings
   * @route PUT /api/tenants/me/settings
   */
  updateCurrentTenantSettings = ErrorHandler.asyncHandler(async (req, res) => {
    if (!req.user.tenant) {
      return res.status(400).json({
        success: false,
        message: 'No tenant associated with this user'
      });
    }

    const tenant = await this.tenantService.updateSettings(req.user.tenant, req.body);
    
    res.status(200).json({
      success: true,
      message: 'Tenant settings updated successfully',
      data: tenant
    });
  });
}

module.exports = TenantController;