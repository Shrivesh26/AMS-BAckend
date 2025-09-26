# AMS Microservices API Documentation

## Overview

The AMS (Appointment Management System) has been transformed from a monolithic architecture to a microservices architecture following SOLID principles. The system now consists of independent services that can be deployed, scaled, and maintained separately.

## Architecture

### Services

1. **User Service** (Port 3001)
   - User registration and authentication
   - Profile management
   - Role-based access control

2. **Tenant Service** (Port 3002)
   - Business/tenant management
   - Subscription handling
   - Settings configuration

3. **API Gateway** (Port 80)
   - Request routing
   - Rate limiting
   - Security headers
   - Load balancing

### Shared Libraries

- **Repository Pattern**: Data access abstraction with MongoDB
- **Service Layer**: Business logic separation
- **Authentication**: JWT-based security
- **Validation**: Joi-based input validation
- **Logging**: Structured logging with Winston
- **Error Handling**: Centralized error management

## API Endpoints

### User Service (`/api/users`)

#### Authentication
- `POST /api/users/register` - Register new user
- `POST /api/users/login` - User login
- `POST /api/users/refresh-token` - Refresh access token
- `POST /api/users/logout` - User logout

#### Profile Management
- `GET /api/users/me` - Get current user profile
- `PUT /api/users/profile` - Update user profile
- `PUT /api/users/change-password` - Change password

#### User Management (Admin/Tenant)
- `GET /api/users/tenant/:tenantId` - Get users by tenant
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id/deactivate` - Deactivate user

### Tenant Service (`/api/tenants`)

#### Public
- `GET /api/tenants/subdomain/:subdomain` - Get tenant by subdomain

#### Current Tenant
- `GET /api/tenants/me` - Get current tenant info
- `PUT /api/tenants/me` - Update current tenant
- `PUT /api/tenants/me/settings` - Update tenant settings

#### Admin Management
- `GET /api/tenants` - List all tenants
- `POST /api/tenants` - Create new tenant
- `GET /api/tenants/:id` - Get tenant by ID
- `PUT /api/tenants/:id` - Update tenant
- `PUT /api/tenants/:id/settings` - Update tenant settings
- `PUT /api/tenants/:id/subscription` - Update subscription
- `GET /api/tenants/:id/statistics` - Get tenant statistics
- `PUT /api/tenants/:id/suspend` - Suspend tenant
- `PUT /api/tenants/:id/reactivate` - Reactivate tenant
- `GET /api/tenants/statistics/global` - Get global statistics

## Authentication

All services use JWT-based authentication with the following claims:
```json
{
  "id": "user_id",
  "email": "user@example.com", 
  "role": "admin|tenant|service_provider|customer",
  "tenant": "tenant_id"
}
```

### Authorization Headers
```
Authorization: Bearer <jwt_token>
```

## Request/Response Format

### Standard Response Format
```json
{
  "success": true|false,
  "message": "Description",
  "data": {}, // Response data
  "errors": [] // Validation errors (if any)
}
```

### Pagination Format
```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10
  }
}
```

## Error Handling

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request / Validation Error
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Too Many Requests
- `500` - Internal Server Error

### Error Response Format
```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ]
}
```

## Security Features

### Database Transactions
- All write operations use MongoDB transactions
- Automatic rollback on failures
- Data consistency guaranteed

### Input Validation
- Joi schema validation
- Data sanitization
- Type checking
- Length restrictions

### Rate Limiting
- 100 requests per 15 minutes per IP
- Configurable limits per service
- DDoS protection

### Security Headers
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security`

## Deployment

### Docker Compose
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Scale services
docker-compose up -d --scale user-service=3
```

### Health Checks
- `/health` endpoint on each service
- Database connectivity check
- Service uptime information

### Environment Variables

#### Shared Configuration
```env
NODE_ENV=production
MONGODB_URI=mongodb://localhost:27017/amsapi
JWT_SECRET=your-super-secret-key
LOG_LEVEL=info
```

#### Service-Specific
```env
# User Service
PORT=3001
SERVICE_NAME=user-service

# Tenant Service  
PORT=3002
SERVICE_NAME=tenant-service
```

## SOLID Principles Implementation

### Single Responsibility Principle (SRP)
- Controllers: Handle HTTP requests/responses only
- Services: Handle business logic only
- Repositories: Handle data access only
- Models: Define data structure only

### Open/Closed Principle (OCP)
- Base interfaces can be extended
- New services implement existing interfaces
- No modification of existing code for extensions

### Liskov Substitution Principle (LSP)
- All repositories implement IRepository
- All services implement IService
- Implementations are interchangeable

### Interface Segregation Principle (ISP)
- Small, focused interfaces
- No forced dependencies on unused methods
- Specific contracts for each concern

### Dependency Inversion Principle (DIP)
- Services depend on repository abstractions
- Controllers depend on service abstractions
- No direct dependencies on concrete implementations

## Monitoring and Logging

### Structured Logging
```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "level": "info",
  "message": "User authenticated",
  "service": "user-service",
  "userId": "123",
  "meta": {
    "ip": "192.168.1.1",
    "userAgent": "Mozilla/5.0..."
  }
}
```

### Health Monitoring
- Service health endpoints
- Database connectivity
- Response time tracking
- Error rate monitoring

## Development

### Local Setup
```bash
# Install dependencies
cd microservices/shared && npm install
cd ../user-service && npm install
cd ../tenant-service && npm install

# Start services
npm run dev # In each service directory
```

### Testing
```bash
# Run unit tests
npm test

# Test API endpoints
curl http://localhost/health
```