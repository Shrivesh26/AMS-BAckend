require('dotenv').config();

// Test basic imports and functionality
async function testBasicFunctionality() {
  console.log('Testing shared library imports...');
  
  try {
    const { 
      MongoRepository, 
      AuthUtils, 
      Validator, 
      DatabaseConfig,
      logger 
    } = require('./microservices/shared');
    
    console.log('✓ Shared library imports successful');
    
    // Test AuthUtils
    const password = 'TestPassword123';
    const hashedPassword = await AuthUtils.hashPassword(password);
    const isValid = await AuthUtils.comparePassword(password, hashedPassword);
    
    if (isValid) {
      console.log('✓ AuthUtils password hashing works');
    } else {
      console.log('✗ AuthUtils password hashing failed');
      return false;
    }
    
    // Test JWT
    const payload = { id: '123', email: 'test@test.com', role: 'user' };
    const token = AuthUtils.generateToken(payload);
    const decoded = AuthUtils.verifyToken(token);
    
    if (decoded.id === payload.id) {
      console.log('✓ AuthUtils JWT works');
    } else {
      console.log('✗ AuthUtils JWT failed');
      return false;
    }
    
    // Test Validator
    const Joi = require('joi');
    const schema = Joi.object({
      email: Joi.string().email().required(),
      age: Joi.number().min(18).required()
    });
    
    const validData = Validator.validate({ email: 'test@test.com', age: 25 }, schema);
    console.log('✓ Validator works');
    
    // Test User Service
    const UserService = require('./microservices/user-service/src/services/UserService');
    const userService = new UserService();
    console.log('✓ User Service instantiated');
    
    // Test Tenant Service
    const TenantService = require('./microservices/tenant-service/src/services/TenantService');
    const tenantService = new TenantService();
    console.log('✓ Tenant Service instantiated');
    
    console.log('\n🎉 All basic tests passed! Microservices architecture is working.');
    return true;
    
  } catch (error) {
    console.error('✗ Test failed:', error.message);
    console.error(error.stack);
    return false;
  }
}

// Run the test
testBasicFunctionality()
  .then(success => {
    if (success) {
      console.log('\n✅ Microservices architecture validation completed successfully');
      process.exit(0);
    } else {
      console.log('\n❌ Microservices architecture validation failed');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });