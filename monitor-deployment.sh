#!/bin/bash

echo "🚀 Monitoring ChatLease Deployment"
echo "=================================="
echo ""
echo "Build logs: https://railway.com/project/c2f5e41a-67ff-449b-ae35-a75461fff283"
echo ""

# Function to check health
check_health() {
    response=$(curl -s -w "\n%{http_code}" https://chatlease-production-a26c.up.railway.app/health 2>/dev/null)
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "200" ]; then
        echo "✅ App is running!"
        echo "$body" | python -m json.tool 2>/dev/null || echo "$body"
        return 0
    elif [ "$http_code" = "404" ]; then
        echo "⏳ Still deploying..."
        return 1
    elif [ "$http_code" = "502" ] || [ "$http_code" = "503" ]; then
        echo "🔄 App is starting up..."
        return 1
    else
        echo "❌ HTTP $http_code"
        return 1
    fi
}

# Monitor deployment
echo "Checking deployment status every 10 seconds..."
echo "Press Ctrl+C to stop monitoring"
echo ""

attempt=1
while true; do
    echo -n "Attempt $attempt: "
    if check_health; then
        echo ""
        echo "🎉 Deployment successful!"
        echo "Your app is live at: https://chatlease-production-a26c.up.railway.app"
        break
    fi
    
    attempt=$((attempt + 1))
    sleep 10
done