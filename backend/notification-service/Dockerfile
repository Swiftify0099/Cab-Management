FROM python:3.12-slim

# System dependencies (no libgdal-dev - avoids broken libpoppler on Ubuntu 24.04)
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy common shared library first (build context = repo root)
COPY backend/common /app/common

# Install Python dependencies
COPY backend/notification-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy service application code
COPY backend/notification-service/app /app/app

# Create upload directory
RUN mkdir -p /app/uploads

EXPOSE 8007

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import httpx; httpx.get('http://localhost:8007/health')" || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8007", "--workers", "2", "--loop", "uvloop"]
