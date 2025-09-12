#!/bin/bash

# Big Yellow Jacket Security - Production Server Startup Script
# This script builds the frontend and starts the production server

echo "🚀 Starting Big Yellow Jacket Security Production Server..."

# Check if we're in the right directory
if [ ! -f "server/production-server.py" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Build the frontend
echo "📦 Building frontend..."
cd frontend/bigyellowjacket-ui
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Frontend build failed"
    exit 1
fi

# Go back to project root
cd ../..

# Initialize security systems
echo "🔒 Initializing security systems..."
cd server
python3 initialize_security.py
if [ $? -ne 0 ]; then
    echo "❌ Security initialization failed"
    exit 1
fi

# Start the production server
echo "🌐 Starting production server..."
python3 production-server.py
