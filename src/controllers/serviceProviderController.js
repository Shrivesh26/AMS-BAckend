const ServiceProvider = require('../models/ServiceProvider');

// @desc    Register/Create a new service provider
// @route   POST /api/service-providers
// @access  Private (Admin or Tenant)
exports.createProvider = async (req, res, next) => {
  try {
    // If not admin, enforce tenant from current user
    if (req.user.role !== 'admin') req.body.tenant = req.user.tenant;

    const provider = await ServiceProvider.create(req.body);
    provider.password = undefined; // Remove password from response

    res.status(201).json({
      success: true,
      data: provider,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Service provider already exists with this email'
      });
    }
    next(error);
  }
};

// @desc    Get all service providers (already present)
// @route   GET /api/service-providers
// @access  Private
exports.getProviders = async (req, res, next) => {
  try {
    let query = { isActive: true };
    if (req.user.role !== 'admin') query.tenant = req.user.tenant;
    if (req.query.name) {
      query.$or = [
        { firstName: { $regex: req.query.name, $options: 'i' } },
        { lastName: { $regex: req.query.name, $options: 'i' } }
      ];
    }
    if (req.query.specialization) {
      query.specializations = { $in: [req.query.specialization] };
    }
    const providers = await ServiceProvider.find(query)
      .select('-password')
      .populate('tenant', 'name subdomain')
      .sort({ 'profile.rating.average': -1 });

    res.status(200).json({
      success: true,
      count: providers.length,
      data: providers,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get a single service provider by ID
// @route   GET /api/service-providers/:id
// @access  Private
exports.getProvider = async (req, res, next) => {
  try {
    const provider = await ServiceProvider.findById(req.params.id)
      .select('-password')
      .populate('tenant', 'name subdomain');

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Service provider not found'
      });
    }

    res.status(200).json({
      success: true,
      data: provider,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update service provider by ID
// @route   PUT /api/service-providers/:id
// @access  Private
exports.updateProvider = async (req, res, next) => {
  try {
    let provider = await ServiceProvider.findById(req.params.id);
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Service provider not found'
      });
    }

    // Block password update via this endpoint
    delete req.body.password;
    provider = await ServiceProvider.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).select('-password');

    res.status(200).json({
      success: true,
      data: provider,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Soft delete (deactivate) provider
// @route   DELETE /api/service-providers/:id
// @access  Private (Admin or Tenant)
exports.deleteProvider = async (req, res, next) => {
  try {
    const provider = await ServiceProvider.findById(req.params.id);
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Service provider not found'
      });
    }
    provider.isActive = false;
    await provider.save();
    res.status(200).json({
      success: true,
      message: 'Provider deactivated successfully'
    });
  } catch (error) {
    next(error);
  }
};


// @desc    Update provider availability
// @route   PUT /api/service-providers/:id/availability
// @access  Private (Service Provider or Tenant)
exports.updateAvailability = async (req, res, next) => {
  try {
    const provider = await ServiceProvider.findById(req.params.id);

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Service provider not found'
      });
    }

    // Authorization: only tenant or the provider themselves
    if (req.user.role !== 'tenant' && req.user._id.toString() !== provider._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update availability'
      });
    }

    provider.availability = req.body.availability;
    await provider.save();

    res.status(200).json({
      success: true,
      data: provider
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get provider schedule
// @route   GET /api/service-providers/:id/schedule
// @access  Private
exports.getProviderSchedule = async (req, res, next) => {
  try {
    const provider = await ServiceProvider.findById(req.params.id)
      .select('firstName lastName availability')
      .populate('tenant', 'name');

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Provider not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        provider,
        schedule: provider.availability?.schedule || {},
        timeOff: provider.availability?.timeOff || []
      }
    });
  } catch (error) {
    next(error);
  }
};
