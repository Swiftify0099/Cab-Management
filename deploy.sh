#!/bin/bash
# CabBooking - Local Docker Deployment Script
# This script spins up the entire microservice architecture using Docker Compose

echo "==========================================="
echo " Starting CabBooking Docker Infrastructure"
echo "==========================================="

# Check if docker is installed
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed. Please install Docker first."
    exit 1
fi

echo "[1/3] Building all Docker images..."
docker compose build

echo "[2/3] Starting database and cache layers..."
docker compose up -d postgres redis
echo "Waiting for Postgres and Redis to initialize..."
sleep 5

echo "[3/3] Starting Python Microservices, React Web Panels, and Nginx Gateway..."
docker compose up -d

echo "==========================================="
echo " Deployment Complete!"
echo "==========================================="
echo "Services are starting. You can view logs using: docker compose logs -f"
echo "To stop the cluster later, run: docker compose down"
