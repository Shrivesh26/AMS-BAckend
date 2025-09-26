const Service = require('../models/Service');
const User = require('../models/User');
const Tenant = require('../models/Tenant');

// @desc    Search services
// @route   GET /api/search/services
// @access  Public/Private
exports.searchServices = async (req, res, next) => {
  try {
    const { 
      query: searchQuery, 
      category, 
      minPrice, 
      maxPrice, 
      duration,
      tenant: tenantId 
    } = req.query;

    let query = { isActive: true };

    // Add tenant filter if specified or from context
    if (tenantId) {
      query.tenant = tenantId;
    } else if (req.tenantId) {
      query.tenant = req.tenantId;
    }

    // Text search
    if (searchQuery) {
      query.$or = [
        { name: { $regex: searchQuery, $options: 'i' } },
        { description: { $regex: searchQuery, $options: 'i' } },
        { tags: { $in: [new RegExp(searchQuery, 'i')] } }
      ];
    }

    // Category filter
    if (category) {
      query.category = category;
    }

    // Price range filter
    if (minPrice || maxPrice) {
      query['pricing.basePrice'] = {};
      if (minPrice) query['pricing.basePrice'].$gte = parseFloat(minPrice);
      if (maxPrice) query['pricing.basePrice'].$lte = parseFloat(maxPrice);
    }

    // Duration filter
    if (duration) {
      const durationRange = duration.split('-');
      if (durationRange.length === 2) {
        query.duration = {
          $gte: parseInt(durationRange[0]),
          $lte: parseInt(durationRange[1])
        };
      }
    }

    const services = await Service.find(query)
      .populate('tenant', 'name subdomain business')
      .populate('providers', 'firstName lastName profile.rating')
      .sort({ 'statistics.rating.average': -1, createdAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      count: services.length,
      data: services
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Search service providers
// @route   GET /api/search/providers
// @access  Public/Private
exports.searchProviders = async (req, res, next) => {
  try {
    const { 
      query: searchQuery, 
      specialization, 
      minRating,
      experience,
      tenant: tenantId 
    } = req.query;

    let query = { 
      role: 'service_provider',
      isActive: true 
    };

    // Add tenant filter if specified or from context
    if (tenantId) {
      query.tenant = tenantId;
    } else if (req.tenantId) {
      query.tenant = req.tenantId;
    }

    // Name search
    if (searchQuery) {
      query.$or = [
        { firstName: { $regex: searchQuery, $options: 'i' } },
        { lastName: { $regex: searchQuery, $options: 'i' } }
      ];
    }

    // Specialization filter
    if (specialization) {
      query['profile.specializations'] = { $in: [specialization] };
    }

    // Minimum rating filter
    if (minRating) {
      query['profile.rating.average'] = { $gte: parseFloat(minRating) };
    }

    // Experience filter
    if (experience) {
      query['profile.experience'] = { $gte: parseInt(experience) };
    }

    const providers = await User.find(query)
      .select('-password')
      .populate('tenant', 'name subdomain business')
      .sort({ 'profile.rating.average': -1, 'profile.experience': -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      count: providers.length,
      data: providers
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Search providers by location
// @route   GET /api/search/providers/nearby
// @access  Public/Private
exports.searchProvidersByLocation = async (req, res, next) => {
  try {
    const { 
      latitude, 
      longitude, 
      radius = 10, // default 10 km
      specialization,
      minRating 
    } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    let query = { 
      role: 'service_provider',
      isActive: true,
      'address.coordinates': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: parseFloat(radius) * 1000 // Convert km to meters
        }
      }
    };

    // Specialization filter
    if (specialization) {
      query['profile.specializations'] = { $in: [specialization] };
    }

    // Minimum rating filter
    if (minRating) {
      query['profile.rating.average'] = { $gte: parseFloat(minRating) };
    }

    const providers = await User.find(query)
      .select('-password')
      .populate('tenant', 'name subdomain business')
      .sort({ 'profile.rating.average': -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      count: providers.length,
      data: providers
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Search tenants/businesses
// @route   GET /api/search/tenants
// @access  Public
exports.searchTenants = async (req, res, next) => {
  try {
    const { 
      query: searchQuery, 
      businessType, 
      location 
    } = req.query;

    let query = { isActive: true };

    // Text search
    if (searchQuery) {
      query.$or = [
        { name: { $regex: searchQuery, $options: 'i' } },
        { 'business.description': { $regex: searchQuery, $options: 'i' } },
        { subdomain: { $regex: searchQuery, $options: 'i' } }
      ];
    }

    // Business type filter
    if (businessType) {
      query['business.type'] = businessType;
    }

    // Location filter (basic city/state search)
    if (location) {
      query.$or = [
        { 'address.city': { $regex: location, $options: 'i' } },
        { 'address.state': { $regex: location, $options: 'i' } }
      ];
    }

    const tenants = await Tenant.find(query)
      .select('name subdomain business address')
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      count: tenants.length,
      data: tenants
    });
  } catch (error) {
    next(error);
  }
};