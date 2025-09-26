const { validationResult } = require('express-validator');
const Service = require('../models/Service');

// @desc    Get all services for tenant
// @route   GET /api/services
// @access  Private
exports.getServices = async (req, res, next) => {
  try {
    const query = { tenant: req.tenantId };
    
    // Add filters
    if (req.query.category) query.category = req.query.category;
    if (req.query.isActive !== undefined) query.isActive = req.query.isActive === 'true';
    // else query.isActive = true; 
    
    const services = await Service.find(query)
      .populate('providers', 'firstName lastName email')
      .sort({ createdAt: -1 });

    const servicesWithAssets = services.map(service => {
      const obj = service.toObject();
      obj.assets = Array.isArray(obj.assets) ? obj.assets : [];
      // ensure isActive included if missing
      // if (obj.isActive === undefined) obj.isActive = true;
      obj.isActive = service.isActive;
      return obj;
    });

    res.status(200).json({
      success: true,
      count: servicesWithAssets.length,
      data: servicesWithAssets
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single service
// @route   GET /api/services/:id
// @access  Private
exports.getService = async (req, res, next) => {
  try {
    const service = await Service.findOne({
      _id: req.params.id,
      tenant: req.tenantId
    }).populate('providers', 'firstName lastName email profile');

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    res.set('Cache-Control', 'no-store');

    const obj = service.toObject();
    obj.assets = Array.isArray(obj.assets) ? obj.assets : [];
    if (obj.isActive === undefined) obj.isActive = true;

    res.status(200).json({
      success: true,
      data: obj
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new service
// @route   POST /api/services
// @access  Private (Tenant only)
exports.createService = async (req, res, next) => {
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

    // Add tenant to req.body
    req.body.tenant = req.tenantId;

    const service = await Service.create(req.body);

    res.status(201).json({
      success: true,
      data: service
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update service
// @route   PUT /api/services/:id
// @access  Private (Tenant only)
exports.updateService = async (req, res, next) => {
  try {
    let service = await Service.findOne({
      _id: req.params.id,
      tenant: req.tenantId
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    service = await Service.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: service
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete service
// @route   DELETE /api/services/:id
// @access  Private (Tenant only)
exports.deleteService = async (req, res, next) => {
  try {
    const service = await Service.findOne({
      _id: req.params.id,
      tenant: req.tenantId
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    // Soft delete by setting isActive to false
    service.isActive = false;
    await service.save();

    res.status(200).json({
      success: true,
      message: 'Service deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Assign providers to service
// @route   PUT /api/services/:id/providers
// @access  Private (Tenant only)
exports.assignProviders = async (req, res, next) => {
  try {
    const { providerIds } = req.body;

    const service = await Service.findOne({
      _id: req.params.id,
      tenant: req.tenantId
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    service.providers = providerIds;
    await service.save();

    res.status(200).json({
      success: true,
      data: service
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get service availability
// @route   GET /api/services/:id/availability
// @access  Private
exports.getServiceAvailability = async (req, res, next) => {
  try {
    const service = await Service.findOne({
      _id: req.params.id,
      tenant: req.tenantId
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    // This would calculate availability based on provider schedules
    // For now, return placeholder data
    const availability = {
      serviceId: service._id,
      availableSlots: [],
      providers: service.providers
    };

    res.status(200).json({
      success: true,
      data: availability
    });
  } catch (error) {
    next(error);
  }
};