#!/bin/bash

echo "🚀 Deploying PartyKit backend to Cloudflare..."

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build the project
echo "🔨 Building project..."
npm run build

# Deploy to Cloudflare
echo "☁️ Deploying to Cloudflare..."
npx partykit deploy

echo "✅ Deployment complete!"
echo "🌐 Your backend is now running on Cloudflare!"
echo "📝 Update your frontend with the new backend URL"
