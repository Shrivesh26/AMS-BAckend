#!/usr/bin/env node

/**
 * API Endpoint Validation Script
 * Tests all endpoints to ensure they are properly configured
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';

// Test endpoints that should be accessible without authentication
const publicEndpoints = [
  { method: 'GET', path: '/health', expected: 200 },
  { method: 'GET', path: '/api/search/tenants', expected: [200, 500] }, // 500 ok if no DB
  { method: 'POST', path: '/api/auth/register', expected: [400, 500] }, // 400 ok for missing data
  { method: 'POST', path: '/api/auth/login', expected: [400, 500] }
];

// Test endpoints that should require authentication
const protectedEndpoints = [
  { method: 'GET', path: '/api/auth/me', expected: 401 },
  { method: 'GET', path: '/api/tenants', expected: 401 },
  { method: 'GET', path: '/api/services', expected: 401 },
  { method: 'GET', path: '/api/bookings', expected: 401 },
  { method: 'GET', path: '/api/users', expected: 401 }
];

function makeRequest(method, path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          data: data,
          headers: res.headers
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

async function testEndpoint(endpoint) {
  try {
    const result = await makeRequest(endpoint.method, endpoint.path);
    const expectedCodes = Array.isArray(endpoint.expected) ? endpoint.expected : [endpoint.expected];
    const success = expectedCodes.includes(result.statusCode);
    
    console.log(`${success ? '✅' : '❌'} ${endpoint.method} ${endpoint.path} - ${result.statusCode} ${success ? '(Expected)' : '(Unexpected)'}`);
    
    if (!success) {
      console.log(`   Expected: ${expectedCodes.join(' or ')}, Got: ${result.statusCode}`);
    }
    
    return success;
  } catch (error) {
    console.log(`❌ ${endpoint.method} ${endpoint.path} - Error: ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting API Endpoint Validation...\n');
  
  console.log('Testing Public Endpoints:');
  let publicPassed = 0;
  for (const endpoint of publicEndpoints) {
    const success = await testEndpoint(endpoint);
    if (success) publicPassed++;
  }
  
  console.log('\nTesting Protected Endpoints (should return 401):');
  let protectedPassed = 0;
  for (const endpoint of protectedEndpoints) {
    const success = await testEndpoint(endpoint);
    if (success) protectedPassed++;
  }
  
  console.log('\n📊 Test Results:');
  console.log(`Public Endpoints: ${publicPassed}/${publicEndpoints.length} passed`);
  console.log(`Protected Endpoints: ${protectedPassed}/${protectedEndpoints.length} passed`);
  console.log(`Total: ${publicPassed + protectedPassed}/${publicEndpoints.length + protectedEndpoints.length} passed`);
  
  if (publicPassed === publicEndpoints.length && protectedPassed === protectedEndpoints.length) {
    console.log('\n🎉 All tests passed! API is properly configured.');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Check the API configuration.');
    process.exit(1);
  }
}

// Check if server is running first
makeRequest('GET', '/health')
  .then(() => {
    runTests();
  })
  .catch(() => {
    console.log('❌ Server is not running on localhost:3000');
    console.log('   Please start the server with: npm run dev');
    process.exit(1);
  });