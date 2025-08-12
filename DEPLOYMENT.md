# Production Deployment Guide

This guide will help you deploy your Gacha game application to production.

## Prerequisites

- [Cloudflare account](https://dash.cloudflare.com/sign-up)
- [Vercel account](https://vercel.com/signup)
- [GitHub account](https://github.com) (recommended for CI/CD)

## 1. Deploy PartyKit Backend to Cloudflare

### Step 1: Install PartyKit CLI

```bash
npm install -g partykit
```

### Step 2: Login to Cloudflare

```bash
npx partykit login
```

### Step 3: Deploy Backend

```bash
cd party-server
chmod +x deploy.sh
./deploy.sh
```

Or manually:

```bash
cd party-server
npm install
npm run build
npx partykit deploy
```

### Step 4: Get Your Backend URL

After deployment, you'll get a URL like: `https://gacha-game-server.your-username.partykit.dev`

## 2. Deploy Next.js Frontend to Vercel

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Login to Vercel

```bash
vercel login
```

### Step 3: Configure Environment Variables

Create a `.env.local` file in your project root:

```bash
NEXT_PUBLIC_PARTYKIT_HOST=https://gacha-game-server.your-username.partykit.dev
NEXT_PUBLIC_APP_ENV=production
```

### Step 4: Deploy Frontend

```bash
vercel --prod
```

Or use the Vercel dashboard:

1. Connect your GitHub repository
2. Set environment variables in the dashboard
3. Deploy automatically on push

## 3. Update CORS Configuration

After getting your frontend URL, update the CORS origins in `party-server/partykit.json`:

```json
{
  "cors": {
    "origins": ["https://your-app.vercel.app", "http://localhost:3000"]
  }
}
```

Then redeploy the backend:

```bash
cd party-server
npx partykit deploy
```

## 4. Verify Deployment

1. **Backend**: Test WebSocket connection at your PartyKit URL
2. **Frontend**: Visit your Vercel URL and test the game functionality
3. **Integration**: Ensure frontend can connect to backend

## 5. Continuous Deployment (Optional)

### GitHub Actions for Backend

Create `.github/workflows/deploy-backend.yml`:

```yaml
name: Deploy Backend
on:
  push:
    branches: [main]
    paths: ["party-server/**"]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "18"
      - run: |
          cd party-server
          npm install
          npm run build
          npx partykit deploy
        env:
          PARTYKIT_TOKEN: ${{ secrets.PARTYKIT_TOKEN }}
```

### Vercel Auto-Deploy

- Connect your GitHub repository to Vercel
- Set environment variables in Vercel dashboard
- Frontend will auto-deploy on every push to main branch

## Troubleshooting

### Common Issues:

1. **CORS errors**: Ensure CORS origins are correctly set
2. **WebSocket connection fails**: Check backend URL and CORS configuration
3. **Environment variables not working**: Verify they're set in Vercel dashboard

### Debug Commands:

```bash
# Test backend locally
cd party-server
npm run dev

# Test frontend locally
npm run dev

# Check PartyKit status
npx partykit status
```

## Security Considerations

1. **Environment Variables**: Never commit sensitive data to Git
2. **CORS**: Restrict origins to only your production domains
3. **Rate Limiting**: Consider implementing rate limiting for production
4. **Monitoring**: Set up logging and monitoring for production

## Cost Optimization

- **Cloudflare**: Free tier available for PartyKit
- **Vercel**: Generous free tier for Next.js apps
- **Monitoring**: Use free tier services for basic monitoring
