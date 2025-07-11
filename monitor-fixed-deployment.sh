#!/bin/bash

echo "🚀 Monitoring Fixed ChatLease Deployment"
echo "======================================"
echo ""
echo "Critical fixes applied:"
echo "✅ Added missing database methods (initializeData, waitForConnection)"
echo "✅ Server now waits for database before starting"
echo "✅ Health check works without database connection"
echo "✅ Proper async initialization throughout"
echo ""
echo "🔗 Build logs: https://railway.com/project/c2f5e41a-67ff-449b-ae35-a75461fff283"
echo ""

# Function to check deployment
check_deployment() {
    echo -n "$(date +%H:%M:%S) - "
    
    # Check health endpoint
    response=$(curl -s -w "\nHTTP_CODE:%{http_code}" https://chatlease-production-a26c.up.railway.app/health 2>/dev/null)
    http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2)
    body=$(echo "$response" | grep -v "HTTP_CODE:")
    
    if [ "$http_code" = "200" ]; then
        echo "✅ App is running!"
        echo "$body" | python -m json.tool 2>/dev/null || echo "$body"
        return 0
    elif [ "$http_code" = "503" ]; then
        echo "🔄 App is starting (503 Service Unavailable)..."
        return 1
    elif [ "$http_code" = "502" ]; then
        echo "🔄 App is deploying (502 Bad Gateway)..."
        return 1
    elif [ "$http_code" = "404" ]; then
        echo "⏳ Deployment in progress (404)..."
        return 1
    else
        echo "❓ Unexpected response: HTTP $http_code"
        echo "Body: $body"
        return 1
    fi
}

# Main monitoring loop
echo "Checking deployment status..."
echo "Press Ctrl+C to stop"
echo ""

success=false
for i in {1..60}; do  # Try for up to 10 minutes
    if check_deployment; then
        success=true
        break
    fi
    sleep 10
done

echo ""
if [ "$success" = true ]; then
    echo "🎉 Deployment successful!"
    echo "📱 Your app is live at: https://chatlease-production-a26c.up.railway.app"
    echo ""
    echo "Testing endpoints:"
    echo -n "GET /: "
    curl -s -o /dev/null -w "%{http_code}" https://chatlease-production-a26c.up.railway.app/
    echo ""
    echo -n "GET /health: "
    curl -s -o /dev/null -w "%{http_code}" https://chatlease-production-a26c.up.railway.app/health
    echo ""
else
    echo "❌ Deployment did not succeed within 10 minutes"
    echo "Check logs at: https://railway.com/project/c2f5e41a-67ff-449b-ae35-a75461fff283"
fi