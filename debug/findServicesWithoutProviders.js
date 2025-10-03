const mongoose = require('mongoose');
const Service = require('../src/models/Service'); // adjust path as per your project
require('dotenv').config();

const findServicesWithoutProviders = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const servicesWithoutProviders = await Service.find({
      providers: { $exists: true, $eq: [] } // empty array
    });

    console.log('Services without providers:', servicesWithoutProviders.length);
    servicesWithoutProviders.forEach(svc => {
      console.log(`Service ID: ${svc._id}, Name: ${svc.name}`);
    });

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

findServicesWithoutProviders();
