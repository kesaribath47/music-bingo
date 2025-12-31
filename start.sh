#!/bin/bash

# Music Bingo Quick Start Script
# This script builds the React app and starts the production server

echo "🎵 Music Bingo - Quick Start 🎵"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
  cd client && npm install && cd ..
fi

# Check if build exists
if [ ! -d "client/build" ]; then
  echo "🔨 Building React app..."
  npm run build
fi

echo ""
echo "🚀 Starting Music Bingo server..."
echo ""
echo "Players can now connect at:"
echo "  Local:   http://localhost:3001"
echo "  Network: http://$(ipconfig getifaddr en0 2>/dev/null || hostname -I | awk '{print $1}'):3001"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

npm start
