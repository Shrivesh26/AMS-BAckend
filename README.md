# AMS API - Appointment Management System

A comprehensive SaaS Multi-Tenant Appointment Management System API built with Node.js, Express, and MongoDB.

## Overview

This API provides a complete solution for managing appointments in a multi-tenant environment. It supports multiple businesses (tenants) with their own service providers, customers, and booking management systems.

### Key Features

- 🏢 **Multi-Tenant Architecture** - Complete data isolation between businesses
- 👥 **Role-Based Access Control** - Admin, Tenant, Service Provider, Customer roles
- 📅 **Appointment Management** - Full booking lifecycle with calendar integration
- 🔍 **Advanced Search** - Search by service type, provider name, location, and cost
- 💰 **Flexible Pricing** - Service variations with dynamic pricing
- 📱 **RESTful API** - 25+ endpoints covering all business needs
- 🔐 **JWT Authentication** - Secure authentication with role-based permissions
- 🌍 **Location-Based Search** - Find providers near customer location

## Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd AMSAPI

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your MongoDB URI

# Start development server
npm run dev

# Test the API
curl http://localhost:3000/health
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update user profile

### Tenants (Businesses)
- `GET /api/tenants` - List tenants (admin only)
- `GET /api/tenants/:id` - Get tenant details
- `GET /api/tenants/me/stats` - Get tenant statistics

### Services
- `GET /api/services` - List services
- `POST /api/services` - Create service
- `PUT /api/services/:id` - Update service
- `GET /api/services/:id/availability` - Get service availability

### Bookings
- `GET /api/bookings` - List bookings
- `POST /api/bookings` - Create booking
- `PUT /api/bookings/:id/status` - Update booking status
- `GET /api/bookings/calendar/:providerId` - Provider calendar

### Search
- `GET /api/search/services` - Search services
- `GET /api/search/providers` - Search providers
- `GET /api/search/providers/nearby` - Location-based provider search

## Documentation

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for complete API documentation with examples.

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **Security**: bcrypt, helmet, cors, rate limiting
- **Validation**: express-validator

## Project Structure

```
src/
├── app.js                 # Main application
├── config/
│   └── database.js        # Database configuration
├── controllers/           # Business logic
├── middleware/           # Auth, validation, error handling
├── models/              # Database schemas
└── routes/              # API route definitions
```

## Development

```bash
# Install dependencies
npm install

# Start development server with auto-reload
npm run dev

# Start production server
npm start
```

## Environment Setup

Required environment variables:

```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/amsapi
JWT_SECRET=your-super-secret-key
JWT_EXPIRE=7d
```

## License

ISC License
