# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files (build context = repo root)
COPY apps/customer-web/package.json apps/customer-web/package-lock.json* ./

# Install dependencies
RUN npm install

# Copy source code
COPY apps/customer-web/. .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# SPA routing config
COPY apps/customer-web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
