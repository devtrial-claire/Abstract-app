# Manual Backend Deployment Guide

This guide shows you how to manage your PartyKit backend deployment manually in Cloudflare.

## 🔐 **Current Deployment Status**

- **Project Name**: `gacha-game-server`
- **Backend URL**: `https://gacha-game-server.elmobbb.partykit.dev`
- **Account**: `elmobbb` (clerk)

## 🛠️ **Manual Deployment Commands**

### **1. Deploy/Update Backend**

```bash
cd party-server
npx partykit deploy
```

### **2. Force Redeploy (Overwrite)**

```bash
cd party-server
npx partykit deploy --force
```

### **3. View Deployment Status**

```bash
cd party-server
npx partykit status
```

### **4. View Project Information**

```bash
cd party-server
npx partykit info
```

### **5. List All Deployments**

```bash
npx partykit list
```

### **6. View Live Logs**

```bash
cd party-server
npx partykit tail
```

### **7. Delete Deployment**

```bash
cd party-server
npx partykit delete
```

## 🌐 **Cloudflare Dashboard Access**

### **Direct Access:**

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Sign in with your Cloudflare account
3. Look for **"Workers & Pages"** in the sidebar
4. Find your PartyKit deployment (appears as a Worker)

### **PartyKit Dashboard:**

- PartyKit deployments are managed through their platform
- Your deployment is hosted on Cloudflare's edge network
- You can monitor performance and logs through Cloudflare

## 🔧 **Configuration Management**

### **Current CORS Configuration:**

```json
{
  "cors": {
    "origins": [
      "https://gacha-game-server.elmobbb.partykit.dev",
      "http://localhost:3000"
    ],
    "methods": ["GET", "POST", "OPTIONS"],
    "credentials": true
  }
}
```

### **Update CORS for Frontend:**

After deploying your frontend to Vercel, update the CORS origins:

1. **Edit** `party-server/partykit.json`
2. **Add your Vercel domain** to the origins array:
   ```json
   "origins": [
     "https://your-app.vercel.app",
     "https://gacha-game-server.elmobbb.partykit.dev",
     "http://localhost:3000"
   ]
   ```
3. **Redeploy**:
   ```bash
   cd party-server
   npx partykit deploy
   ```

## 📊 **Monitoring and Debugging**

### **Check Backend Health:**

```bash
# Test HTTP connection
curl -I https://gacha-game-server.elmobbb.partykit.dev

# Test WebSocket connection
# Use browser dev tools or a WebSocket client
```

### **View Real-time Logs:**

```bash
cd party-server
npx partykit tail
```

### **Check Deployment Status:**

```bash
cd party-server
npx partykit status
```

## 🚨 **Troubleshooting**

### **Common Issues:**

1. **CORS Errors:**

   - Check origins in `partykit.json`
   - Ensure frontend domain is included
   - Redeploy after changes

2. **WebSocket Connection Fails:**

   - Verify backend URL is correct
   - Check if backend is running
   - Use correct room path: `/parties/main/room-name`

3. **Deployment Fails:**
   - Check for syntax errors in code
   - Verify `partykit.json` configuration
   - Try force deploy: `npx partykit deploy --force`

### **Debug Commands:**

```bash
# Check if logged in
npx partykit whoami

# List all deployments
npx partykit list

# View project info
cd party-server && npx partykit info

# Check deployment status
cd party-server && npx partykit status
```

## 🔄 **Deployment Workflow**

### **Typical Update Process:**

1. **Make code changes** in `src/server.ts`
2. **Update configuration** in `partykit.json` if needed
3. **Deploy changes**:
   ```bash
   cd party-server
   npx partykit deploy
   ```
4. **Verify deployment**:
   ```bash
   npx partykit status
   ```
5. **Test functionality** in your application

### **Environment Variables:**

- Set in `partykit.json` under the `vars` section
- Changes require redeployment
- Example:
  ```json
  "vars": {
    "DEBUG": "false",
    "API_KEY": "your-api-key"
  }
  ```

## 📱 **Mobile/Remote Management**

You can manage deployments from anywhere using:

- **Terminal/SSH** with PartyKit CLI
- **Cloudflare mobile app**
- **Web dashboard** on any device

## 🔒 **Security Considerations**

- **Never commit sensitive data** to Git
- **Use environment variables** for secrets
- **Regularly update dependencies**
- **Monitor access logs** through Cloudflare
- **Use HTTPS only** (automatically handled by Cloudflare)

## 💰 **Cost Management**

- **PartyKit**: Free tier available
- **Cloudflare**: Generous free tier
- **Monitor usage** through Cloudflare dashboard
- **Set up alerts** for usage limits
