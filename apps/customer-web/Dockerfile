# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files (build context = repo root)
COPY apps/customer-web/package.json apps/customer-web/package-lock.json* ./

# Install dependencies
RUN npm ci

# Copy source code
COPY apps/customer-web/. .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# SPA routing config
RUN printf 'server {\n    listen 80;\n    location / {\n        root /usr/share/nginx/html;\n        index index.html index.htm;\n        try_files \ \/ /index.html;\n    }\n}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
