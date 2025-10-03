const { validationResult } = require('express-validator');
const Service = require('../models/Service');
const User = require('../models/User');

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

// @desc    Get services for a specific service provider
// @route   GET /api/services/providers/:providerId
// @access  Private
exports.getServicesForProvider = async (req, res, next) => {
  try {
    const providerId = req.params.providerId;
    // Find all services where this provider is listed
    console.log('Searching with:', {
      providers: providerId,
      isActive: true,
      tenant: req.tenantId
    });

    const services = await Service.find({
      providers: providerId,
      // isActive: true,
      // tenant: req.tenantId // optional: filter by tenant for multi-tenant setup
    }).populate('providers', 'firstName lastName email');

    console.log('getServicesForProvider called with providerId:', providerId);
    console.log('Services found:', services.length);

    res.status(200).json({
      success: true,
      count: services.length,
      services // returns only services for this provider
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all services for a customer (all linked providers)
// @route   GET /api/services/customers/:customerId/services
// @access  Private
exports.getServicesForCustomer = async (req, res, next) => {
  try {
    console.log('Looking for customer:', req.params.customerId);
    
    const customer = await User.findOne({
      _id: req.params.customerId,
      role: 'customer'
    });

    if (!customer) {
      console.log('Customer not found');
      return res.status(404).json({ message: 'Customer not found' });
    }

    console.log('Found customer:', customer.email, 'Tenant:', customer.tenant);

    // Find providers in same tenant
    const providers = await User.find({
      tenant: customer.tenant,
      role: 'service_provider',
      isActive: true
    });

    if (providers.length === 0) {
      return res.status(404).json({ message: 'No providers available for this customer' });
    }

    const providerIds = providers.map(p => p._id);
    console.log('Found providers:', providerIds);

    // Debug: Check what services exist in this tenant
    const allTenantServices = await Service.find({ tenant: customer.tenant });
    console.log('Total services in tenant:', allTenantServices.length);
    
    if (allTenantServices.length > 0) {
      console.log('Sample service providers field:', allTenantServices[0].providers);
      console.log('Sample service active status:', allTenantServices[0].isActive);
    }

    // Find services with explicit ObjectId conversion
    const services = await Service.find({
      $and: [
        { providers: { $in: providerIds } },
        { isActive: true },
        { tenant: customer.tenant } // Add tenant filter for safety
      ]
    }).populate('providers', 'firstName lastName email')
      .populate('tenant', 'name');

    console.log('Found services after query:', services.length);

    // Alternative query if above fails - find any service in tenant
    if (services.length === 0) {
      console.log('No services found with provider filter, checking all tenant services...');
      const fallbackServices = await Service.find({
        tenant: customer.tenant,
        isActive: true
      }).populate('providers', 'firstName lastName email')
        .populate('tenant', 'name');
      
      console.log('Fallback services found:', fallbackServices.length);
      
      if (fallbackServices.length > 0) {
        console.log('Fallback service providers:', fallbackServices[0].providers);
      }
    }

    res.json({
      success: true,
      count: services.length,
      services: services.map(s => ({
        id: s._id,
        name: s.name,
        description: s.description,
        pricing: s.pricing,
        providerIds: s.providers.map(p => p._id),
        providerNames: s.providers.map(p => `${p.firstName} ${p.lastName}`),
        providerName: s.providers.map(p => `${p.firstName} ${p.lastName}`).join(', '),
        tenantId: s.tenant._id,
        tenantName: s.tenant.name,
        isActive: s.isActive,
      })),
    });
  } catch (err) {
    console.error('Error in getServicesForCustomer:', err);
    next(err);
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