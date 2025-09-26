# SaaS Multi-Tenant Appointment Management System API

A comprehensive Node.js API for managing appointments in a multi-tenant SaaS environment. This system supports multiple businesses (tenants) with their own service providers, customers, and booking management.

## Features

- **Multi-Tenant Architecture**: Complete data isolation between tenants
- **Role-Based Access Control**: Admin, Tenant, Service Provider, Customer roles
- **Appointment Management**: Full booking lifecycle with calendar integration
- **Service Management**: Services with quality variations and pricing
- **Search Functionality**: Search services, providers by location, cost, etc.
- **User Management**: Provider availability and customer profiles
- **Authentication**: JWT-based authentication system

## Quick Start

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud instance)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd AMSAPI
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your MongoDB URI and other configuration
```

4. Start the development server:
```bash
npm run dev
```

The API will be available at `http://localhost:3000`

### Health Check

Test the API is running:
```bash
curl http://localhost:3000/health
```

## API Documentation

### Authentication

All protected routes require a Bearer token in the Authorization header:
```
Authorization: Bearer <jwt-token>
```

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "customer",
  "tenantId": "tenant-id" // Required for non-tenant roles
}
```

For tenant registration, include `tenantData`:
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane@business.com",
  "password": "password123",
  "role": "tenant",
  "tenantData": {
    "name": "Beauty Salon",
    "subdomain": "beauty-salon",
    "business": {
      "type": "salon",
      "description": "Full service beauty salon"
    }
  }
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

### Tenant Management

#### Get Tenants (Admin only)
```http
GET /api/tenants
Authorization: Bearer <admin-token>
```

#### Get Tenant Statistics
```http
GET /api/tenants/me/stats
Authorization: Bearer <tenant-token>
```

### Service Management

#### Create Service
```http
POST /api/services
Authorization: Bearer <tenant-token>
Content-Type: application/json

{
  "name": "Haircut",
  "description": "Professional haircut service",
  "category": "beauty",
  "duration": 60,
  "pricing": {
    "basePrice": 50.00,
    "currency": "USD"
  },
  "qualityVariations": [
    {
      "name": "Premium",
      "description": "Premium styling products",
      "priceModifier": {
        "type": "percentage",
        "value": 25
      }
    }
  ]
}
```

#### Get Services
```http
GET /api/services?category=beauty&isActive=true
Authorization: Bearer <token>
```

### Booking Management

#### Create Booking
```http
POST /api/bookings
Authorization: Bearer <token>
Content-Type: application/json

{
  "service": "service-id",
  "provider": "provider-id",
  "customer": "customer-id",
  "appointmentDate": "2024-03-15",
  "startTime": "10:00",
  "customerNotes": "First time customer"
}
```

#### Get Provider Calendar
```http
GET /api/bookings/calendar/provider-id?startDate=2024-03-01&endDate=2024-03-31
Authorization: Bearer <token>
```

#### Update Booking Status
```http
PUT /api/bookings/booking-id/status
Authorization: Bearer <provider-or-tenant-token>
Content-Type: application/json

{
  "status": "completed"
}
```

### Search Functionality

#### Search Services
```http
GET /api/search/services?query=haircut&category=beauty&minPrice=20&maxPrice=100
```

#### Search Providers by Location
```http
GET /api/search/providers/nearby?latitude=40.7128&longitude=-74.0060&radius=10&specialization=hair
```

#### Search Tenants/Businesses
```http
GET /api/search/tenants?query=salon&businessType=beauty&location=NYC
```

### User Management

#### Search Service Providers
```http
GET /api/users/providers/search?name=john&specialization=hair&minRating=4.0
Authorization: Bearer <token>
```

#### Update Provider Availability
```http
PUT /api/users/provider-id/availability
Authorization: Bearer <provider-or-tenant-token>
Content-Type: application/json

{
  "availability": {
    "schedule": {
      "monday": [
        { "start": "09:00", "end": "17:00" }
      ],
      "tuesday": [
        { "start": "09:00", "end": "17:00" }
      ]
    }
  }
}
```

## Data Models

### User Roles
- **admin**: System administrator with full access
- **tenant**: Business owner managing their services and providers
- **service_provider**: Individual providing services under a tenant
- **customer**: End user booking services

### Service Categories
- beauty, wellness, healthcare, fitness, consulting, automotive, home_services, other

### Booking Status
- pending, confirmed, in_progress, completed, cancelled, no_show

### Payment Status
- pending, paid, partially_paid, refunded, failed

## Multi-Tenant Isolation

The system ensures complete data isolation between tenants:

1. **Database Level**: All models include a `tenant` field
2. **Middleware Level**: `tenantIsolation` middleware automatically filters queries
3. **Route Level**: Access control based on user roles and tenant membership

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting
- CORS protection
- Helmet security headers
- Input validation with express-validator
- Role-based access control

## Error Handling

The API returns consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [] // Validation errors when applicable
}
```

HTTP Status Codes:
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error

## Development

### Project Structure
```
src/
├── app.js              # Main application file
├── config/
│   └── database.js     # Database configuration
├── controllers/        # Route controllers
├── middleware/         # Custom middleware
├── models/            # Mongoose models
└── routes/            # Route definitions
```

### Environment Variables
```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/amsapi
JWT_SECRET=your-secret-key
JWT_EXPIRE=7d
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
CORS_ORIGIN=http://localhost:3000
```

### Scripts
- `npm start`: Start production server
- `npm run dev`: Start development server with nodemon

## Testing

The API includes comprehensive endpoint testing. Use tools like Postman, Thunder Client, or curl to test the endpoints.

Example test flow:
1. Register a tenant
2. Login and get JWT token
3. Create services
4. Register service providers
5. Create bookings
6. Test search functionality

## Future Enhancements

- Payment gateway integration (Stripe, PayPal)
- Email notifications
- SMS reminders
- Real-time calendar updates with WebSockets
- Mobile app API extensions
- Advanced analytics and reporting
- Multi-language support

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the ISC License.