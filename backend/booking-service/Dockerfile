FROM python:3.12-slim
RUN apt-get update && apt-get install -y gcc libpq-dev gdal-bin libgdal-dev && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY ../common /app/common
COPY . .
RUN mkdir -p /app/uploads
EXPOSE 8002
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import httpx; httpx.get('http://localhost:8002/health')" || exit 1
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8002", "--workers", "2", "--loop", "uvloop"]
