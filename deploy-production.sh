#!/bin/bash

echo "🚀 Starting Production Deployment..."
echo "=================================="

# Check if required tools are installed
if ! command -v partykit &> /dev/null; then
    echo "❌ PartyKit CLI not found. Installing..."
    npm install -g partykit
fi

if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Deploy Backend
echo ""
echo "☁️ Deploying Backend to Cloudflare..."
cd party-server
./deploy.sh
cd ..

# Get the backend URL from user
echo ""
echo "📝 Please enter your deployed PartyKit backend URL:"
echo "   (e.g., https://gacha-game-server.your-username.partykit.dev)"
read -p "Backend URL: " BACKEND_URL

# Update environment file
echo "🔧 Updating environment configuration..."
cat > .env.local << EOF
NEXT_PUBLIC_PARTYKIT_HOST=$BACKEND_URL
NEXT_PUBLIC_APP_ENV=production
EOF

echo "✅ Environment file created with backend URL: $BACKEND_URL"

# Deploy Frontend
echo ""
echo "🌐 Deploying Frontend to Vercel..."
vercel --prod

echo ""
echo "🎉 Deployment Complete!"
echo "======================"
echo "Backend: $BACKEND_URL"
echo "Frontend: Check Vercel dashboard for your URL"
echo ""
echo "📋 Next Steps:"
echo "1. Update CORS origins in party-server/partykit.json with your Vercel domain"
echo "2. Redeploy backend: cd party-server && npx partykit deploy"
echo "3. Test the complete application"
echo ""
echo "🔗 For detailed instructions, see DEPLOYMENT.md"
