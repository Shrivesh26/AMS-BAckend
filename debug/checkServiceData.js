// debug/checkServiceData.js
const mongoose = require('mongoose');
const Service = require('../src/models/Service');
const User = require('../src/models/User');

require('dotenv').config();

const checkServiceData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('=== SERVICE DATA DEBUG ===');
    
    // Find all services
    const allServices = await Service.find({});
    console.log('Total services in database:', allServices.length);
    
    // Find services with providers
    const servicesWithProviders = await Service.find({
      providers: { $exists: true, $ne: [] }
    });
    console.log('Services with providers assigned:', servicesWithProviders.length);
    
    // Find all service providers
    const providers = await User.find({ role: 'service_provider' });
    console.log('Total service providers:', providers.length);
    
    // Show sample data
    if (allServices.length > 0) {
      console.log('\n=== SAMPLE SERVICE ===');
      console.log('Service ID:', allServices[0]._id);
      console.log('Service name:', allServices[0].name);
      console.log('Service providers:', allServices[0].providers);
      console.log('Service tenant:', allServices[0].tenant);
      console.log('Service isActive:', allServices[0].isActive);
    }
    
    if (providers.length > 0) {
      console.log('\n=== SAMPLE PROVIDER ===');
      console.log('Provider ID:', providers[0]._id);
      console.log('Provider name:', providers[0].firstName, providers[0].lastName);
      console.log('Provider tenant:', providers[0].tenant);
    }
    
    // Check for tenant matching issues
    const customers = await User.find({ role: 'customer' });
    if (customers.length > 0) {
      console.log('\n=== SAMPLE CUSTOMER ===');
      console.log('Customer ID:', customers[0]._id);
      console.log('Customer tenant:', customers[0].tenant);
      
      // Check if customer and providers have same tenant
      const sameTenatProviders = await User.find({
        tenant: customers[0].tenant,
        role: 'service_provider'
      });
      console.log('Providers in customer tenant:', sameTenatProviders.length);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Debug error:', error);
    process.exit(1);
  }
};

checkServiceData();