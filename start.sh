#!/bin/bash
set -e

echo "🔨 Building React widgets..."
cd server/ui-widget && npm run build && cd ../..

echo "🚀 Starting MCP server..."
source .venv/bin/activate
python -m server.main &
SERVER_PID=$!

echo "⏳ Waiting for server to start..."
sleep 3

echo "🌐 Starting ngrok tunnel..."
ngrok http 8080 &
NGROK_PID=$!

echo ""
echo "✅ Server running on http://localhost:8080"
echo "✅ Ngrok tunnel active - check http://localhost:4040 for public URL"
echo ""
echo "Press Ctrl+C to stop all services"

# Cleanup on exit
trap "kill $SERVER_PID $NGROK_PID 2>/dev/null" EXIT

# Wait for user interrupt
wait
