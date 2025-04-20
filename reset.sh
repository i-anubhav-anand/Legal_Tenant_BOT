#!/bin/bash

# Set colors for prettier output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored logs
log() {
    echo -e "${BLUE}[$(date +"%T")]${NC} $1"
}

error() {
    echo -e "${RED}[$(date +"%T")] ERROR:${NC} $1"
}

success() {
    echo -e "${GREEN}[$(date +"%T")] SUCCESS:${NC} $1"
}

warning() {
    echo -e "${YELLOW}[$(date +"%T")] WARNING:${NC} $1"
}

# Determine Docker Compose command
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
elif docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
else
    error "Docker Compose is not installed. Please install Docker Compose and try again."
    exit 1
fi

# Stop all containers
echo "Stopping all containers..."
docker compose down

# Ask if user wants to remove volumes
read -p "Do you want to remove all data (documents, vector databases)? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Removing data directories..."
    rm -rf ./data/documents/* ./data/vector_db/*
    echo "Data directories cleaned!"
fi

# Remove Docker images
read -p "Do you want to remove Docker images to rebuild from scratch? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Removing Docker images..."
    docker rmi legal-tech-backend legal-tech-frontend 2>/dev/null || true
    echo "Docker images removed!"
fi

echo "Reset completed successfully!"
echo "To restart the application, run: ./start.sh" 