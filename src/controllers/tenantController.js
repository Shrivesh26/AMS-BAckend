const { validationResult } = require('express-validator');
const Tenant = require('../models/Tenant');

// @desc    Get all tenants
// @route   GET /api/tenants
// @access  Private (Admin only)
exports.getTenants = async (req, res, next) => {
  try {
    const tenants = await Tenant.find().sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: tenants.length,
      data: tenants
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single tenant
// @route   GET /api/tenants/:id
// @access  Private (Admin or Tenant owner)
exports.getTenant = async (req, res, next) => {
  try {
    const tenant = await Tenant.findById(req.params.id);

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    // Check authorization (admin or tenant owner)
    if (req.user.role !== 'admin' && req.user.tenant.toString() !== tenant._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this tenant'
      });
    }

    res.status(200).json({
      success: true,
      data: tenant
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new tenant
// @route   POST /api/tenants
// @access  Private (Admin only)
exports.createTenant = async (req, res, next) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const tenant = await Tenant.create(req.body);

    res.status(201).json({
      success: true,
      data: tenant
    });
  } catch (error) {
    if (error.code === 11000) {
      const message = 'Duplicate field value entered';
      return res.status(400).json({
        success: false,
        message
      });
    }
    next(error);
  }
};

// @desc    Update tenant
// @route   PUT /api/tenants/:id
// @access  Private (Admin or Tenant owner)
exports.updateTenant = async (req, res, next) => {
  try {
    let tenant = await Tenant.findById(req.params.id);

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    // Check authorization (admin or tenant owner)
    if (req.user.role !== 'admin' && req.user.tenant.toString() !== tenant._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this tenant'
      });
    }

    tenant = await Tenant.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: tenant
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete tenant
// @route   DELETE /api/tenants/:id
// @access  Private (Admin only)
exports.deleteTenant = async (req, res, next) => {
  try {
    const tenant = await Tenant.findById(req.params.id);

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    // Soft delete by setting isActive to false
    tenant.isActive = false;
    await tenant.save();

    res.status(200).json({
      success: true,
      message: 'Tenant deactivated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get tenant statistics
// @route   GET /api/tenants/me/stats
// @access  Private (Tenant only)
exports.getTenantStats = async (req, res, next) => {
  try {
    // This would include statistics like total services, bookings, revenue, etc.
    // For now, return basic info
    const stats = {
      totalServices: 0,
      totalBookings: 0,
      totalRevenue: 0,
      activeProviders: 0,
      totalCustomers: 0
    };

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};