const User = require('../models/User');

// @desc    Get users (admin sees all, others see tenant users)
// @route   GET /api/users
// @access  Private
exports.getUsers = async (req, res, next) => {
  try {
    let query = {};

    // Filter based on user role
    if (req.user.role === 'admin') {
      // Admin can see all users
      if (req.query.tenant) {
        query.tenant = req.query.tenant;
      }
    } else {
      // Others see only their tenant users
      query.tenant = req.user.tenant;
    }

    // Additional filters
    if (req.query.role) query.role = req.query.role;
    if (req.query.isActive !== undefined) query.isActive = req.query.isActive === 'true';

    const users = await User.find(query)
      .select('-password')
      .populate('tenant', 'name subdomain')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private
exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('tenant', 'name subdomain');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check authorization
    if (req.user.role !== 'admin' && 
        req.user.role !== 'tenant' && 
        req.user._id.toString() !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this user'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new user
// @route   POST /api/users
// @access  Private (Admin or Tenant)
exports.createUser = async (req, res, next) => {
  try {
    // Set tenant for non-admin users
    if (req.user.role !== 'admin') {
      req.body.tenant = req.user.tenant;
    }

    const user = await User.create(req.body);

    // Remove password from response
    user.password = undefined;

    res.status(201).json({
      success: true,
      data: user
    });
  } catch (error) {
    if (error.code === 11000) {
      const message = 'User already exists with this email';
      return res.status(400).json({
        success: false,
        message
      });
    }
    next(error);
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private (Admin, Tenant, or user themselves)
exports.updateUser = async (req, res, next) => {
  try {
    let user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check authorization
    if (req.user.role !== 'admin' && 
        req.user.role !== 'tenant' && 
        req.user._id.toString() !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this user'
      });
    }

    // Don't allow password updates through this endpoint
    delete req.body.password;

    user = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).select('-password');

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (Admin or Tenant)
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Soft delete by setting isActive to false
    user.isActive = false;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'User deactivated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Search service providers
// @route   GET /api/users/providers/search
// @access  Private
exports.searchProviders = async (req, res, next) => {
  try {
    const { name, specialization, location, rating } = req.query;
    
    let query = {
      role: 'service_provider',
      isActive: true
    };

    // Add tenant filter if not admin
    if (req.user.role !== 'admin' && req.tenantId) {
      query.tenant = req.tenantId;
    }

    // Add search filters
    if (name) {
      query.$or = [
        { firstName: { $regex: name, $options: 'i' } },
        { lastName: { $regex: name, $options: 'i' } }
      ];
    }

    if (specialization) {
      query['profile.specializations'] = { $in: [specialization] };
    }

    if (rating) {
      query['profile.rating.average'] = { $gte: parseFloat(rating) };
    }

    const providers = await User.find(query)
      .select('-password')
      .populate('tenant', 'name subdomain')
      .sort({ 'profile.rating.average': -1 });

    res.status(200).json({
      success: true,
      count: providers.length,
      data: providers
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update provider availability
// @route   PUT /api/users/:id/availability
// @access  Private (Service Provider or Tenant)
exports.updateAvailability = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check authorization
    if (req.user.role !== 'tenant' && req.user._id.toString() !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this user availability'
      });
    }

    user.availability = req.body.availability;
    await user.save();

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get provider schedule
// @route   GET /api/users/:id/schedule
// @access  Private
exports.getProviderSchedule = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('firstName lastName availability')
      .populate('tenant', 'name');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Provider not found'
      });
    }

    if (user.role !== 'service_provider') {
      return res.status(400).json({
        success: false,
        message: 'User is not a service provider'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        provider: user,
        schedule: user.availability?.schedule || {},
        timeOff: user.availability?.timeOff || []
      }
    });
  } catch (error) {
    next(error);
  }
};