#!/bin/bash

# GiftAPI Integration Setup Script
# This script sets up the database for GiftAPI integration

echo "🚀 Setting up GiftAPI integration..."

echo "📦 Installing dependencies..."
npm install

echo "🗄️  Running Prisma migrations..."
npx prisma migrate deploy

echo "📊 Syncing GiftAPI catalog..."
echo "Make sure GIFTAPI_BASE_URL, GIFTAPI_TOKEN, and GIFTAPI_SECRET are set in .env"

echo "\n✅ Setup complete!"
echo "\nNext steps:"
echo "1. Add these env variables to your .env file:"
echo "   GIFTAPI_BASE_URL=https://api.giftapi.io/v1/partner"
echo "   GIFTAPI_TOKEN=your_token"
echo "   GIFTAPI_SECRET=your_secret"
echo ""
echo "2. Sync the catalog: curl -X POST http://localhost:5000/api/giftapi/sync"
echo ""
echo "3. Get available products: curl http://localhost:5000/api/giftapi/categories"
