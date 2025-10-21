const { validationResult } = require('express-validator');
const User = require('../models/User');
const ServiceProvider = require('../models/ServiceProvider');
const Tenant = require('../models/Tenant');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    // Handle validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // Parse the complex data payload
    let data;
    try {
      data = req.body.parsedData;
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: 'Invalid JSON in `data` field'
      });
    }

    const { firstName, lastName, email, password, role, tenantId, tenantData } = data;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists with this email' });
    }

    if (role === 'service_provider') {
      const existingProvider = await ServiceProvider.findOne({ email });
      if (existingProvider) {
        return res.status(400).json({ success: false, message: 'Service provider already exists with this email' });
      }
    }

    // ✅ CHECK FOR EXISTING TENANT
    if (role === 'tenant') {
      const existingTenant = await Tenant.findOne({ email });
      if (existingTenant) {
        return res.status(400).json({ success: false, message: 'Tenant already exists with this email' });
      }
    }

    // ✅ ADD SUBDOMAIN CHECK FOR TENANTS
    if (role === 'tenant' && tenantData?.subdomain) {
      const existingSubdomain = await Tenant.findOne({ subdomain: tenantData.subdomain });
      if (existingSubdomain) {
        return res.status(400).json({ 
          success: false, 
          message: 'Subdomain is already taken. Please choose another.' 
        });
      }
    }

    let tenant = null;
    // ✅ IMPROVED VERSION with better error handling
    const avatarFile = req.file;
    let avatarUrl = null; // Changed from '' to null for consistency

    if (avatarFile) {
      // Validate file exists
      avatarUrl = `${req.protocol}://${req.get('host')}/uploads/${avatarFile.filename}`;
    } else if (data.profile?.avatar) {
      // Fallback to provided URL
      avatarUrl = data.profile.avatar;
    }

    // Create profile object with null check
    const profile = {
      avatar: avatarUrl,
      bio: data.profile?.bio || '',
      ...(data.profile?.specializations && { specializations: data.profile.specializations }),
      ...(data.profile?.experience && { experience: data.profile.experience })
    };

    if (role === 'tenant') {
      if (!tenantData) {
        return res.status(400).json({ success: false, message: 'Tenant data is required for tenant registration' });
      }

      // ✅ INCLUDE AVATAR IN TENANT CREATION
      tenant = await Tenant.create({
        firstName,
        lastName,
        role: 'tenant',
        name: tenantData.name,
        subdomain: tenantData.subdomain,
        email,
        password: password,
        phone: tenantData.phone,
        business: tenantData.business,
        address: tenantData.address,
        settings: tenantData.settings,
        avatarUrl: avatarUrl
      });

      // Don't create a user if it's just a tenant registration
      return res.status(201).json({
        success: true,
        message: 'Tenant created successfully. Create a service provider to manage it.',
        data: {
          tenantId: tenant._id,
          tenant
        }
      });
    } else if (role === 'customer') {
      tenant = await Tenant.findOne();
      if (!tenant) {
        return res.status(400).json({ success: false, message: 'No tenants exist to assign customer to' });
      }
    } else {
      if (!tenantId) {
        return res.status(400).json({ success: false, message: 'Tenant ID is required for this role' });
      }
      tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        return res.status(400).json({ success: false, message: 'Invalid tenant ID' });
      }
    }

    let newUser;

    if (role === 'service_provider') {
      newUser = await ServiceProvider.create({
        firstName,
        lastName,
        email,
        password,
        phone: data.phone,
        role: 'service_provider',
        tenant: tenant._id,
        bio: profile.bio,
        specializations: data.profile?.specializations || [],
        experience: data.profile?.experience || 0,
        profile: {
          avatar: profile.avatar,
          rating: { average: 0, count: 0 }
        },
        availability: data.availability,
        address: data.address,
        preferences: data.preferences
      });

      return sendTokenResponse(newUser, 201, res);
    }

    // Default user creation (customer or admin)
    newUser = await User.create({
      firstName,
      lastName,
      email,
      password,
      phone: data.phone,
      role,
      tenant: tenant._id,
      profile,
      availability: data.availability,
      address: data.address,
      preferences: data.preferences
    });

    return sendTokenResponse(newUser, 201, res);
  } catch (error) {
    if (!res.headersSent) {
      if (error.code === 11000) {
        return res.status(400).json({ success: false, message: 'Duplicate field value entered' });
      }
      return next(error);
    } else {
      console.error('Error after response was sent:', error);
    }
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Check for user in User collection first
    let user = await User.findOne({ email }).select('+password').populate('tenant');

    // If not found in User, check ServiceProvider collection
    if (!user) {
      user = await ServiceProvider.findOne({ email }).select('+password').populate('tenant');
    }

    // ✅ If not found in ServiceProvider, check Tenant collection
    if (!user) {
      user = await Tenant.findOne({ email }).select('+password');
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Optional: add isActive check if you added that to Tenant schema
    if (user.isActive === false) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Update lastLogin if needed
    user.lastLogin = new Date();
    await user.save();

    // ✅ Modify sendTokenResponse to support Tenant if needed
    sendTokenResponse(user, 200, res);

  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
// exports.getMe = async (req, res, next) => {
//   try {
//     // Fetch whichever model holds this user
//     let user = await User.findById(req.user.id).populate('tenant').lean();
//     let isTenantUser = false;

//     if (!user) {
//       user = await ServiceProvider.findById(req.user.id).populate('tenant').lean();
//     }
    
//     if (!user) {
//       user = await Tenant.findById(req.user.id).lean();
//       isTenantUser = true; // ✅ Mark that this IS a tenant user
//     }
    
//     if (!user) {
//       return res.status(404).json({ success: false, message: 'User not found' });
//     }

//     // Normalize avatarUrl across all models
//     const avatarUrl =
//       // User and ServiceProvider store under profile.avatar
//       (user.profile && user.profile.avatar) ||
//       // Tenant stores directly as avatarUrl
//       user.avatarUrl ||
//       null;

//     // Attach back to returned object
//     user.avatarUrl = avatarUrl;
    
//     // ✅ FIX: If this IS a tenant user, set tenant field to their own ID
//     if (isTenantUser) {
//       user.tenant = user._id;
//     }
    
//     // Remove the old profile field if you like
//     delete user.profile;

//     return res.status(200).json({ success: true, data: user });
//   } catch (err) {
//     console.error('Error in getMe:', err);
//     next(err);
//   }
// };
// ✅ IMPROVED VERSION
exports.getMe = async (req, res, next) => {
  try {
    let user = await User.findById(req.user.id).populate('tenant').lean();
    let userType = 'user';

    if (!user) {
      user = await ServiceProvider.findById(req.user.id).populate('tenant').lean();
      userType = 'service_provider';
    }
    
    if (!user) {
      user = await Tenant.findById(req.user.id).lean();
      userType = 'tenant';
    }
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Normalize response structure across all models
    const response = {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role || userType,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      
      // Handle avatar from different sources
      avatarUrl: user.profile?.avatar || user.avatarUrl || null,
      
      // Handle tenant relationship
      tenant: userType === 'tenant' ? user._id : (user.tenant?._id || user.tenant || null),
      
      // Include type-specific fields
      ...(userType === 'service_provider' && {
        bio: user.bio,
        specializations: user.specializations,
        experience: user.experience,
        availability: user.availability,
        rating: user.profile?.rating
      }),
      
      ...(userType === 'tenant' && {
        name: user.name,
        subdomain: user.subdomain,
        business: user.business,
        subscription: user.subscription,
        settings: user.settings
      }),
      
      // Common fields
      address: user.address,
      preferences: user.preferences
    };

    return res.status(200).json({ success: true, data: response });
  } catch (err) {
    console.error('Error in getMe:', err);
    next(err);
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res, next) => {
  try {
    const fieldsToUpdate = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      phone: req.body.phone,
      profile: req.body.profile,
      address: req.body.address,
      preferences: req.body.preferences
    };

    // Remove undefined fields
    Object.keys(fieldsToUpdate).forEach(key => 
      fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]
    );

    const user = await User.findByIdAndUpdate(
      req.user.id,
      fieldsToUpdate,
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update password
// @route   PUT /api/auth/password
// @access  Private
exports.updatePassword = async (req, res, next) => {
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

    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    if (!(await user.matchPassword(req.body.currentPassword))) {
      return res.status(401).json({
        success: false,
        message: 'Password is incorrect'
      });
    }

    user.password = req.body.newPassword;
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res, next) => {
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

    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'There is no user with that email'
      });
    }

    // For now, just return success (implement email sending later)
    res.status(200).json({
      success: true,
      message: 'Password reset email sent'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password
// @route   PUT /api/auth/reset-password/:resettoken
// @access  Public
exports.resetPassword = async (req, res, next) => {
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

    // Implementation would verify reset token and update password
    res.status(200).json({
      success: true,
      message: 'Password reset successful'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Log user out
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      message: 'User logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};

// const sendTokenResponse = (user, statusCode, res) => {
//   // Generate token from the model's method
//   const token = user.getSignedJwtToken();

//   // Determine the role: fallback to "tenant" if undefined
//   const role = user.role || 'tenant';

//   // Determine tenant ID
//   const tenantId = user.tenant?._id || user.tenant || (role === 'tenant' ? user._id : null);

//   // ✅ GET AVATAR FROM DIFFERENT SOURCES BASED ON MODEL
//   let avatar = null;
//   if (user.profile?.avatar) {
//     avatar = user.profile.avatar;  // For User and ServiceProvider
//   } else if (user.avatarUrl) {
//     avatar = user.avatarUrl;       // For Tenant
//   }

//   res.status(statusCode).json({
//     success: true,
//     token,
//     data: {
//       id: user._id,
//       firstName: user.firstName || '', 
//       lastName: user.lastName || '',
//       email: user.email,
//       role,
//       tenant: tenantId,
//       avatarUrl: avatar  // ✅ CHANGED FROM 'avatar' to 'avatarUrl' FOR CONSISTENCY
//     }
//   });
// };
// ✅ IMPROVED VERSION
const sendTokenResponse = (user, statusCode, res) => {
  const token = user.getSignedJwtToken();
  const role = user.role || 'customer';
  
  // Determine tenant ID based on role
  let tenantId = null;
  if (role === 'tenant') {
    tenantId = user._id; // Tenant's own ID
  } else if (user.tenant) {
    tenantId = user.tenant._id || user.tenant; // Populated or ID
  }

  // Get avatar from appropriate field
  const avatarUrl = user.profile?.avatar || user.avatarUrl || null;

  // ✅ Consistent response structure
  const responseData = {
    id: user._id,
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    email: user.email,
    phone: user.phone || '',
    role: role,
    tenant: tenantId,
    avatarUrl: avatarUrl,
    
    // Add tenant-specific fields if role is tenant
    ...(role === 'tenant' && {
      name: user.name,
      subdomain: user.subdomain,
      business: user.business,
      settings: user.settings
    }),
    
    // Add service provider specific fields
    ...(role === 'service_provider' && {
      bio: user.bio,
      specializations: user.specializations,
      experience: user.experience
    })
  };

  res.status(statusCode).json({
    success: true,
    token,
    data: responseData
  });
};