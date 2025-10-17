const { validationResult } = require('express-validator');
const Service = require('../models/Service');
const ServiceProvider = require('../models/ServiceProvider');
const User = require('../models/User');

// NEW: Service Provider selects services they can provide
exports.selectServices = async (req, res, next) => {
  try {
    const { serviceIds } = req.body; // Array of service IDs
    
    // ✅ CHECK IF USER IS SERVICE PROVIDER
    if (req.user.role !== 'service_provider') {
      return res.status(403).json({
        success: false,
        message: 'Only service providers can select services'
      });
    }

    // ✅ VERIFY SERVICES BELONG TO THE SAME TENANT
    const services = await Service.find({
      _id: { $in: serviceIds },
      tenant: req.user.tenant
    });

    if (services.length !== serviceIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Some services not found or unauthorized'
      });
    }

    // ✅ ADD SERVICE PROVIDER TO SERVICES
    await Service.updateMany(
      { _id: { $in: serviceIds } },
      { $addToSet: { providers: req.user._id } }
    );

    res.json({
      success: true,
      message: 'Services selected successfully'
    });
  } catch (error) {
    next(error);
  }
};

// NEW: Service Provider removes themselves from services
exports.unselectServices = async (req, res, next) => {
  try {
    const { serviceIds } = req.body;
    
    if (req.user.role !== 'service_provider') {
      return res.status(403).json({
        success: false,
        message: 'Only service providers can unselect services'
      });
    }

    // ✅ REMOVE SERVICE PROVIDER FROM SERVICES
    await Service.updateMany(
      { _id: { $in: serviceIds } },
      { $pull: { providers: req.user._id } }
    );

    res.json({
      success: true,
      message: 'Services unselected successfully'
    });
  } catch (error) {
    next(error);
  }
};

// NEW: GET AVAILABLE SERVICES FOR SERVICE PROVIDER TO SELECT
exports.getAvailableServices = async (req, res, next) => {
  try {
    if (req.user.role !== 'service_provider') {
      return res.status(403).json({
        success: false,
        message: 'Only service providers can access this endpoint'
      });
    }

    // Get all active services in the tenant
    const services = await Service.find({
      tenant: req.user.tenant,
      isActive: true  // Only show active services
    }).populate('tenant', 'name')
      .populate('providers', 'firstName lastName email')
      .sort({ createdAt: -1 });

    // Format response to match frontend expectations
    const servicesWithAssets = services.map(service => {
      const obj = service.toObject();
      obj.assets = Array.isArray(obj.assets) ? obj.assets : [];
      obj.isActive = service.isActive;
      return obj;
    });

    res.json({
      success: true,
      count: servicesWithAssets.length,
      services: servicesWithAssets  // Use 'services' to match your frontend
    });
  } catch (error) {
    console.error('Error fetching available services:', error);
    next(error);
  }
};


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
    // Optional: validate provider exists
    const provider = await ServiceProvider.findById(providerId);
    if (!provider) return res.status(404).json({ message: 'Provider not found' });

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
    const providers = await ServiceProvider.find({
      tenant: customer.tenant,
      isActive: true
    });

    if (providers.length === 0) {
      return res.status(404).json({ message: 'No providers available for this customer' });
    }

    const providerIds = providers.map(p => p._id);
    console.log('Searching services for tenant:', customer.tenant, 'and providerIds:', providerIds);

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
    console.log('Create Service - User:', {
      id: req.user._id,
      role: req.user.role,
      tenant: req.user.tenant,
      tenantId: req.tenantId
    });

    // ✅ CHECK IF USER IS TENANT ONLY
    if (req.user.role !== 'tenant') {
      return res.status(403).json({
        success: false,
        message: 'Only tenants can create services'
      });
    }

    // ✅ CHECK IF TENANT CONTEXT EXISTS
    if (!req.user.tenant && !req.tenantId && !req.user._id) {
      return res.status(400).json({
        success: false,
        message: 'No tenant context found. User tenant info missing.'
      });
    }

    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // ✅ SET TENANT ID - try multiple fallbacks
    req.body.tenant = req.user.tenant?._id || req.user.tenant || req.tenantId || req.user._id;
    req.body.providers = []; // Initially no providers assigned

    console.log('Creating service with tenant ID:', req.body.tenant);

    const service = await Service.create(req.body);

    res.status(201).json({
      success: true,
      data: service
    });
  } catch (error) {
    console.error('Error creating service:', error);
    next(error);
  }
};

// @desc    Update service
// @route   PUT /api/services/:id
// @access  Private (Tenant only)
exports.updateService = async (req, res, next) => {
  try {
    if (req.user.role !== 'tenant') {
      return res.status(403).json({
        success: false,
        message: 'Only tenants can update services'
      });
    }

    // ✅ CHANGE THIS LINE:
    let service = await Service.findOne({
      _id: req.params.id,
      tenant: req.user._id // Change from req.tenantId to req.user._id
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found or unauthorized'
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
    if (req.user.role !== 'tenant') {
      return res.status(403).json({
        success: false,
        message: 'Only tenants can delete services'
      });
    }

    const service = await Service.findOne({
      _id: req.params.id,
      tenant: req.user._id // Change from req.tenantId to req.user._id
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found or unauthorized'
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

// ✅ ADD THIS NEW METHOD - Get services created by a specific tenant
exports.getServicesByTenant = async (req, res, next) => {
  try {
    const tenantId = req.params.tenantId;
    
    if (!tenantId || !tenantId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ success: false, message: 'Invalid tenant ID' });
    }    
    
    const services = await Service.find({ 
      tenant: tenantId,
    }).populate('providers', 'firstName lastName email')
      .populate('tenant', 'name')
      .sort({ createdAt: -1 });

    const servicesWithAssets = services.map(service => {
      const obj = service.toObject();
      obj.assets = Array.isArray(obj.assets) ? obj.assets : [];
      obj.isActive = service.isActive;
      return obj;
    });

    res.status(200).json({
      success: true,
      count: servicesWithAssets.length,
      services: servicesWithAssets
    });
  } catch (error) {
    console.error('Error fetching tenant services:', error);
    next(error);
  }
};

// ✅ ADD THIS NEW METHOD - Assign provider to service  
exports.assignProviderToService = async (req, res, next) => {
  try {
    const { serviceId, providerId } = req.body;
    
    if (!serviceId || !providerId) {
      return res.status(400).json({ 
        success: false,
        error: 'serviceId and providerId are required' 
      });
    }

    // Find the service
    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ 
        success: false,
        error: 'Service not found' 
      });
    }

    // Check if provider is already assigned
    if (service.providers.includes(providerId)) {
      return res.status(400).json({ 
        success: false,
        error: 'Provider already assigned to this service' 
      });
    }

    // Add provider to service
    service.providers.push(providerId);
    await service.save();

    res.json({ 
      success: true,
      message: 'Provider assigned successfully', 
      service: service 
    });
  } catch (error) {
    console.error('Error assigning provider:', error);
    next(error);
  }
};