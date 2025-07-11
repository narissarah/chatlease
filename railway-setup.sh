#!/bin/bash

# ChatLease Railway Setup Script
# This script helps set up and deploy ChatLease to Railway

echo "🚀 ChatLease Railway Setup"
echo "=========================="

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Please install it first:"
    echo "   curl -fsSL https://railway.app/install.sh | sh"
    exit 1
fi

# Check if logged in
if ! railway whoami &> /dev/null; then
    echo "❌ Not logged in to Railway. Please run: railway login"
    exit 1
fi

echo "✅ Railway CLI ready"

# Create or select project
echo ""
echo "📦 Setting up Railway project..."
echo "1. If you haven't created a project yet, go to https://railway.app/new"
echo "2. Create a new project with PostgreSQL database"
echo "3. Come back here and continue"
echo ""
read -p "Press Enter when ready..."

# Link to service
echo ""
echo "🔗 Linking to Railway service..."
echo "Run: railway link"
echo "Select your project and service when prompted"
echo ""
read -p "Press Enter after linking..."

# Set up environment variables
echo ""
echo "⚙️  Setting up environment variables..."
echo "Railway provides these PostgreSQL variables automatically:"
echo "- PGHOST"
echo "- PGPORT"
echo "- PGUSER"
echo "- PGPASSWORD"
echo "- PGDATABASE"
echo "- DATABASE_URL"
echo ""
echo "Setting additional required variables..."

# Set production environment variables
railway variables --set "NODE_ENV=production" \
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
  --set "AI_CHAT_ENABLED=true"

echo ""
echo "🔐 Set your admin API key:"
read -p "Enter admin API key (or press Enter to generate): " admin_key
if [ -z "$admin_key" ]; then
    admin_key=$(openssl rand -hex 32)
    echo "Generated: $admin_key"
fi
railway variables --set "ADMIN_API_KEY=$admin_key"

echo ""
echo "✅ Environment variables set"

# Deploy
echo ""
echo "🚂 Ready to deploy!"
echo "Run: railway up"
echo ""
echo "After deployment:"
echo "1. Check logs: railway logs"
echo "2. Open app: railway open"
echo "3. Get URL: railway domain"
echo ""
echo "📝 Notes:"
echo "- Database will auto-migrate on first run"
echo "- Initial seed data will be added if database is empty"
echo "- Proxy pool will initialize automatically"
echo "- Health check available at /health endpoint"