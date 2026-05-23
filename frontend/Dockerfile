# Stage 1: Build the React Application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and install dependencies cleanly
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy remaining source code and build the application
COPY . .
RUN npm run build

# Stage 2: Serve the application with Nginx
FROM nginx:alpine

# Remove default Nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Custom Nginx configuration for single-page applications
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port (Internal to Docker network)
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
