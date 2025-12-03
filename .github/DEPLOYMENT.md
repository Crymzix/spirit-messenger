# Backend Deployment Guide

This guide explains how to deploy the Spirit Messenger backend to Fly.io.

## Overview

The deployment is automated via GitHub Actions and deploys two separate instances:
1. **Server** (`spirit-messenger-server`) - Main Fastify API server
2. **Worker** (`spirit-messenger-worker`) - BullMQ job queue processor

## Automatic Deployment

The workflow is automatically triggered on:
- Pushes to `main` branch
- Changes in the `backend/` directory
- Changes to the workflow file itself

## Prerequisites

### 1. Fly.io Setup

Create two Fly.io apps:
```bash
# Create the server app
flyctl apps create spirit-messenger-server

# Create the worker app
flyctl apps create spirit-messenger-worker
```

### 2. GitHub Secrets

Add **only these secrets** to your GitHub repository (`Settings > Secrets and variables > Actions`). These are used only for running database migrations before deployment:

| Secret Name | Description |
|---|---|
| `FLY_API_TOKEN` | Your Fly.io API token (get from `flyctl auth token`) |
| `DATABASE_URL` | PostgreSQL connection string (Supabase) - **for migrations only** |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key - **for migrations only** |

### 3. Fly.io Secrets (Runtime Environment)

For each app, set all the application secrets that the app needs at runtime. These are separate from GitHub Actions:

```bash
# For server app
flyctl secrets set -a spirit-messenger-server \
  DATABASE_URL="postgres://..." \
  SUPABASE_URL="https://..." \
  SUPABASE_SERVICE_ROLE_KEY="..." \
  SUPABASE_ANON_KEY="..." \
  REDIS_URL="redis://..." \
  OPENROUTER_API_KEY="..." \
  ORCHESTRATOR_MODEL="..." \
  TWILIO_ACCOUNT_SID="..." \
  TWILIO_AUTH_TOKEN="..." \
  KLIPY_API_KEY="..." \
  NEWS_API_KEY="..."

# For worker app (same variables)
flyctl secrets set -a spirit-messenger-worker \
  DATABASE_URL="postgres://..." \
  SUPABASE_URL="https://..." \
  SUPABASE_SERVICE_ROLE_KEY="..." \
  SUPABASE_ANON_KEY="..." \
  REDIS_URL="redis://..." \
  OPENROUTER_API_KEY="..." \
  ORCHESTRATOR_MODEL="..." \
  TWILIO_ACCOUNT_SID="..." \
  TWILIO_AUTH_TOKEN="..." \
  KLIPY_API_KEY="..." \
  NEWS_API_KEY="..."
```

## Environment Variable Summary

**Quick Reference:**
- **GitHub Actions** (3 secrets): Only for running migrations before deployment
  - `FLY_API_TOKEN` - To authenticate with Fly.io
  - `DATABASE_URL` - To run migrations
  - `SUPABASE_SERVICE_ROLE_KEY` - To run migrations

- **Fly.io** (all secrets): Your running app reads these at runtime
  - All 12 secrets set on both `spirit-messenger-server` and `spirit-messenger-worker` apps

The app does **not** read from GitHub Actions secrets after deployment—only from Fly.io.

## Deployment Process

When code is pushed to the `main` branch with changes in the `backend/` directory:

1. **Checkout Code** - Latest commit is checked out
2. **Setup Node.js** - Node 20 is installed with cached dependencies
3. **Install Dependencies** - `npm ci` installs exact versions
4. **Run Migrations** - `npm run db:setup` executes all pending database migrations (uses GitHub Actions secrets)
5. **Deploy Server** - `flyctl deploy` builds and deploys the server instance (app reads Fly.io secrets)
6. **Deploy Worker** - `flyctl deploy` builds and deploys the worker instance (app reads Fly.io secrets)

## Files Created

### Workflow
- `.github/workflows/deploy-backend.yml` - GitHub Actions workflow

### Fly.io Configuration
- `backend/fly.toml` - Server configuration
- `backend/fly.worker.toml` - Worker configuration

### Docker
- `backend/Dockerfile` - Multi-stage build for both server and worker
- `backend/.dockerignore` - Docker build optimization

## Configuration Details

### Server (fly.toml)
- **App**: `spirit-messenger-server`
- **Region**: `sjc` (San Jose)
- **Port**: 1056 (internal)
- **Resources**: 1 shared CPU, 512MB RAM
- **Auto-scaling**: Min 1 machine, auto start/stop enabled

### Worker (fly.worker.toml)
- **App**: `spirit-messenger-worker`
- **Region**: `sjc` (San Jose)
- **Process**: `npm run workers`
- **Resources**: 1 shared CPU, 512MB RAM
- **Note**: No HTTP service (worker-only)

## Manual Deployment

To manually deploy without waiting for GitHub Actions:

```bash
# Deploy server
cd backend
flyctl deploy --config fly.toml --remote-only

# Deploy worker
flyctl deploy --config fly.worker.toml --remote-only
```

## Viewing Logs

```bash
# Server logs
flyctl logs -a spirit-messenger-server

# Worker logs
flyctl logs -a spirit-messenger-worker
```

## Scaling

To adjust resources or minimum machines:

```bash
# Scale server
flyctl scale memory 1024 -a spirit-messenger-server
flyctl scale vm shared-cpu-2x -a spirit-messenger-server

# Scale worker
flyctl scale memory 1024 -a spirit-messenger-worker
flyctl scale vm shared-cpu-2x -a spirit-messenger-worker
```

## Health Checks

The server includes a health check endpoint:
- **Endpoint**: `GET /health`
- **Check Interval**: 30 seconds
- **Timeout**: 3 seconds
- **Retries**: 3

The health check is automatically performed by Fly.io to ensure the server is running correctly.

## Database Migrations

Migrations are automatically run before each deployment via `npm run db:setup`. This command:
1. Connects to the PostgreSQL database
2. Applies any pending migrations
3. Seeds initial data if needed

To manually run migrations in production:

```bash
# SSH into the server
flyctl ssh console -a spirit-messenger-server

# Run migrations
npm run db:setup
```

## Troubleshooting

### Deployment Fails
Check the GitHub Actions logs for the specific error. Common issues:
- Database connection failed - verify `DATABASE_URL` secret
- Migration failed - check database permissions
- Docker build failed - verify Dockerfile and dependencies

### Worker Not Processing Jobs
- Check Redis connection with `REDIS_URL` secret
- Verify worker logs: `flyctl logs -a spirit-messenger-worker`
- Ensure worker is running: `flyctl status -a spirit-messenger-worker`

### Server Not Starting
- Check health check endpoint: `flyctl ssh console -a spirit-messenger-server && curl localhost:1056/health`
- Verify environment variables are set
- Check server logs: `flyctl logs -a spirit-messenger-server`

## Cost Estimates

- **Server**: ~$6-10/month (shared-cpu, 512MB RAM)
- **Worker**: ~$6-10/month (shared-cpu, 512MB RAM)
- **Total**: ~$12-20/month for both instances

Costs vary based on outbound data transfer and actual resource usage.
