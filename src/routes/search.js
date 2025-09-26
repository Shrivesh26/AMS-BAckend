const express = require('express');
const searchController = require('../controllers/searchController');
const { optionalTenantContext } = require('../middleware/auth');

const router = express.Router();

// Apply optional tenant context (for public searches)
router.use(optionalTenantContext);

// @route   GET /api/search/services
// @desc    Search services
// @access  Public/Private
router.get('/services', searchController.searchServices);

// @route   GET /api/search/providers
// @desc    Search service providers
// @access  Public/Private
router.get('/providers', searchController.searchProviders);

// @route   GET /api/search/providers/nearby
// @desc    Search providers by location
// @access  Public/Private
router.get('/providers/nearby', searchController.searchProvidersByLocation);

// @route   GET /api/search/tenants
// @desc    Search tenants/businesses
// @access  Public
router.get('/tenants', searchController.searchTenants);

module.exports = router;