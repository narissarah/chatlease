#!/bin/bash
cd "$(dirname "$0")"

# Kill any existing process on port 3000
lsof -ti:3000 | xargs kill -9 2>/dev/null

# Wait a moment
sleep 1

# Start the server
echo "Starting ChatLease server..."
node server/server.js