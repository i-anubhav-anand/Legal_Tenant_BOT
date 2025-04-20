#!/bin/bash

set -e  # Exit on error

# Kill any processes using ports 3000 and 8000
echo "Closing any processes on ports 3000 and 8000..."
kill -9 $(lsof -t -i:3000,8000) 2>/dev/null || echo "No processes found on these ports"

# Create data directories if they don't exist
mkdir -p data/documents data/vector_db

# Build and start containers
echo "Building and starting containers..."
docker compose down
docker compose build
docker compose up -d

echo "===== Setup completed successfully! ====="
echo "Frontend is running at: http://localhost:3000"
echo "Backend is running at: http://localhost:8000/api"
echo "To view logs, run: docker compose logs -f"
echo "To stop all services, run: docker compose down" 