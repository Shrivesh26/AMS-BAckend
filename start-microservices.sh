#!/bin/bash

# AMS Microservices Startup Script
echo "🚀 Starting AMS Microservices..."

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker to run the microservices."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose."
    exit 1
fi

# Create logs directory
mkdir -p logs/{user-service,tenant-service}

# Set environment variables for development
export JWT_SECRET=development-secret-key-change-in-production
export MONGODB_URI=mongodb://admin:password123@localhost:27017/amsapi?authSource=admin

echo "📦 Building and starting services..."

# Start services with Docker Compose
if docker-compose up -d; then
    echo "✅ Services started successfully!"
    echo ""
    echo "🌐 Available endpoints:"
    echo "  - API Gateway: http://localhost"
    echo "  - User Service: http://localhost:3001"
    echo "  - Tenant Service: http://localhost:3002"
    echo ""
    echo "🔍 Health checks:"
    echo "  - API Gateway: curl http://localhost/health"
    echo "  - User Service: curl http://localhost:3001/health"
    echo "  - Tenant Service: curl http://localhost:3002/health"
    echo ""
    echo "📊 View logs:"
    echo "  - All services: docker-compose logs -f"
    echo "  - User service: docker-compose logs -f user-service"
    echo "  - Tenant service: docker-compose logs -f tenant-service"
    echo ""
    echo "🛑 Stop services:"
    echo "  - docker-compose down"
    echo ""
    echo "📖 For API documentation, see:"
    echo "  - MICROSERVICES_DOCUMENTATION.md"
    echo "  - ARCHITECTURE_TRANSFORMATION.md"
else
    echo "❌ Failed to start services. Check the logs:"
    echo "  docker-compose logs"
    exit 1
fi