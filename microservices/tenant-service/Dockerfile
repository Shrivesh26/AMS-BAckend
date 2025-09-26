# Tenant Service Dockerfile
FROM node:18-alpine

# Install curl for health checks
RUN apk add --no-cache curl

WORKDIR /app

# Copy shared libraries
COPY microservices/shared ./shared

# Copy tenant service package files
COPY microservices/tenant-service/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy tenant service source code
COPY microservices/tenant-service/src ./src

# Create logs directory
RUN mkdir -p logs

# Expose port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3002/health || exit 1

# Start the service
CMD ["npm", "start"]