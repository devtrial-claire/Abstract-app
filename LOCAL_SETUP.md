# Local Development Setup Guide

This guide will help you set up and run this project locally with both the backend (PartyKit server) and frontend (Next.js app).

## Prerequisites

Before you begin, make sure you have the following installed on your system:

- **Node.js** (version 18 or higher)
- **pnpm** (version 9.15.4 or higher) - This project uses pnpm as the package manager
- **Git**

## Step 1: Clone the Project

```bash
git clone <your-repository-url>
cd my-app
```

## Step 2: Install Dependencies

This project has two main components that need their dependencies installed:

### Install Frontend Dependencies

```bash
pnpm install
```

### Install Backend (PartyKit Server) Dependencies

```bash
cd party-server
pnpm install
cd ..
```

## Step 3: Environment Configuration

1. Copy the environment example file:

```bash
cp env.example .env.local
```

2. Edit `.env.local` and configure the following variables:

```bash
# For local development, you can use localhost
NEXT_PUBLIC_PARTYKIT_HOST=localhost:1999

# Set to development for local testing
NEXT_PUBLIC_APP_ENV=development

# Wallet Connect Project ID (optional for basic testing)
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_wallet_connect_project_id
```

## Step 4: Start the Backend Server

In a new terminal window, start the PartyKit backend server:

```bash
cd party-server
pnpm dev
```

The backend server will start on `http://localhost:1999` by default.

**Keep this terminal running!** The backend needs to stay active while you're developing.

## Step 5: Start the Frontend

In another terminal window, start the Next.js frontend:

```bash
pnpm dev
```

The frontend will start on `http://localhost:3000`.

## Step 6: Access Your Application

- **Frontend**: Open [http://localhost:3000](http://localhost:3000) in your browser
- **Backend**: The PartyKit server is running on [http://localhost:1999](http://localhost:1999)

## Project Structure

```
my-app/
├── src/                    # Next.js frontend source code
├── party-server/          # PartyKit backend server
├── public/                # Static assets
├── package.json           # Frontend dependencies
└── party-server/package.json  # Backend dependencies
```

## Available Scripts

### Frontend (from root directory)

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint

### Backend (from party-server directory)

- `pnpm dev` - Start development server with live reload
- `pnpm build` - Build for production
- `pnpm deploy` - Deploy to PartyKit

## Troubleshooting

### Common Issues

1. **Port Already in Use**

   - If port 3000 is busy, Next.js will automatically use the next available port
   - If port 1999 is busy, check if another PartyKit server is running

2. **Dependencies Issues**

   - Make sure you're using pnpm (not npm or yarn)
   - Try deleting `node_modules` and `pnpm-lock.yaml`, then run `pnpm install` again

3. **Environment Variables**

   - Ensure `.env.local` exists and has the correct values
   - Restart both servers after changing environment variables

4. **Backend Connection Issues**
   - Verify the backend is running on port 1999
   - Check that `NEXT_PUBLIC_PARTYKIT_HOST` in `.env.local` matches the backend URL

### Getting Help

- Check the console for error messages
- Ensure both servers are running simultaneously
- Verify all environment variables are set correctly

## Development Workflow

1. **Start both servers** (backend first, then frontend)
2. **Make changes** to your code
3. **Save files** - both servers have hot reload enabled
4. **Test changes** in your browser
5. **Stop servers** with `Ctrl+C` when done

## Next Steps

Once you have the basic setup running, you can:

- Explore the codebase structure
- Modify components in `src/components/`
- Update the backend logic in `party-server/src/`
- Add new features and test them locally

Happy coding! 🚀
