#!/bin/bash

echo "🔍 Checking ChatLease Deployment Status"
echo "======================================"
echo ""
echo "🌐 Your app URL: https://chatlease-production-a26c.up.railway.app"
echo ""

# Check if PostgreSQL database exists
echo "📊 Checking for PostgreSQL database..."
railway variables | grep -E "(PGHOST|DATABASE_URL)" > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ PostgreSQL variables found"
else
    echo "❌ No PostgreSQL database found!"
    echo "   You need to add PostgreSQL to your Railway project:"
    echo "   1. Go to https://railway.app/dashboard"
    echo "   2. Open your project"
    echo "   3. Click 'New Service' → 'Database' → 'PostgreSQL'"
    echo ""
fi

echo ""
echo "🔄 Testing health endpoint..."
response=$(curl -s -w "\n%{http_code}" https://chatlease-production-a26c.up.railway.app/health)
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" = "200" ]; then
    echo "✅ App is running!"
    echo "Response: $body"
elif [ "$http_code" = "404" ]; then
    echo "⏳ App is still deploying or build failed"
    echo "   Check build logs: https://railway.com/project/c2f5e41a-67ff-449b-ae35-a75461fff283"
elif [ "$http_code" = "502" ] || [ "$http_code" = "503" ]; then
    echo "⚠️  App is starting up, please wait..."
else
    echo "❌ Unexpected response: HTTP $http_code"
    echo "Response: $body"
fi

echo ""
echo "📋 Next steps:"
echo "1. View build logs in Railway dashboard"
echo "2. Check if PostgreSQL is added to your project"
echo "3. Run: railway logs (once deployment completes)"
echo "4. Visit: https://chatlease-production-a26c.up.railway.app"