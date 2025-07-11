#!/bin/bash

echo "🚀 Quick Railway Deployment for ChatLease"
echo "========================================"

# Generate admin key if needed
ADMIN_KEY=$(openssl rand -hex 32)

echo "Setting environment variables..."

# Set all variables in one command
railway variables \
  --set "NODE_ENV=production" \
  --set "PORT=3000" \
  --set "SCRAPING_ENABLED=true" \
  --set "SCRAPING_INTERVAL_HOURS=6" \
  --set "SCRAPING_RATE_LIMIT_MS=2000" \
  --set "SCRAPING_DAILY_LIMIT=1000" \
  --set "PROXY_ROTATION_ENABLED=true" \
  --set "PROXY_RETRY_COUNT=3" \
  --set "PROXY_TIMEOUT_MS=10000" \
  --set "CACHE_TTL_SECONDS=300" \
  --set "CACHE_ENABLED=true" \
  --set "LOG_LEVEL=info" \
  --set "LOG_FILE_ENABLED=false" \
  --set "REAL_CENTRIS_SCRAPING=true" \
  --set "MOCK_DATA_FALLBACK=true" \
  --set "FINANCIAL_CALCULATOR=true" \
  --set "AI_CHAT_ENABLED=true" \
  --set "ADMIN_API_KEY=$ADMIN_KEY"

echo ""
echo "✅ Variables set! Your admin API key: $ADMIN_KEY"
echo ""
echo "📦 Deploying to Railway..."
railway up

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Check logs: railway logs"
echo "2. Get URL: railway domain"
echo "3. Test health: curl YOUR_URL/health"