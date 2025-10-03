const mongoose = require('mongoose');
const Service = require('../src/models/Service');
const User = require('../src/models/User');
require('dotenv').config();

const assignProviders = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    // Fetch all providers in tenant X (replace tenant id accordingly)
    const tenantId = '68c2a1fcc87ca1a31b562aeb'; // Replace with your tenant ID
    const providers = await User.find({ tenant: tenantId, role: 'service_provider' });
    if (!providers.length) {
      console.log('No providers found');
      return;
    }

    // Fetch all services for tenant
    const services = await Service.find({ tenant: tenantId });
    if (!services.length) {
      console.log('No services found');
      return;
    }

    // Assign providers to all services (you can customize logic here)
    for (const service of services) {
      service.providers = providers.map(p => p._id);
      await service.save();
      console.log(`Assigned providers to service: ${service.name}`);
    }

    console.log('Done assigning providers');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
};

assignProviders();