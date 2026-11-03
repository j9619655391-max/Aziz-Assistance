# Production Dockerfile for Aziz AI Platform
FROM node:18-alpine

# Install system dependencies needed for native node modules
RUN apk add --no-cache python3 make g++ gcc

WORKDIR /app

# Copy dependencies manifest
COPY package*.json ./

# Install npm packages
RUN npm install

# Copy source code files
COPY . .

# Compile application and server assets to production-ready bundle
RUN npm run build

# Expose the mandatory standard reverse-proxied ingress port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV REPOSITORY_TYPE=POSTGRES

# Launch the production-compiled CommonJS server bundle
CMD ["npm", "start"]
