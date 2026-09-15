# Deployment Guide

## Prerequisites
- Node.js 20+
- MySQL database (local or managed)
- Cloudflare Pages account

## Local Development
1. Copy `.env.example` to `C:\Dev\.env` and fill in real values.
2. `npm install`
3. `npm run db:push` — create database tables
4. `npm run dev` — start dev server on port 3000

## Local Preview (Cloudflare Pages)
1. `npx wrangler pages dev` — preview the production build locally using the
   Cloudflare Pages runtime, including the Functions in `functions/`.
2. This serves the static assets from `dist/public/` and routes all other
   requests through the Hono app served via the `hono/cloudflare-pages` adapter
   at `functions/[[routes]].ts`.

## Production (Cloudflare Pages)
1. Push to the `main` branch.
2. In the Cloudflare Pages dashboard, set these environment variables:
   - `DATABASE_URL` — your MySQL connection string
   - `APP_ID`, `APP_SECRET` — JWT signing secrets
   - `KIMI_AUTH_URL`, `KIMI_OPEN_URL` — OAuth server URLs
   - `OWNER_UNION_ID` — your admin user ID
   - `VITE_KIMI_AUTH_URL`, `VITE_APP_ID` — frontend OAuth config
   - `CF_PAGES` — set to `true`
3. Cloudflare Pages auto-builds on push. Build command: `npm run build`
   (configured in `cloudflare.toml`).
4. Static assets are served from `dist/public/` (the `pages_build_output_dir`
   in `cloudflare.toml`). All other routes go through the Hono serverless
   function at `functions/[[routes]].ts`, which imports the app from
   `api/boot` and serves it via the `hono/cloudflare-pages` adapter.

## Secrets Policy
- Real credentials live in `C:\Dev\.env` for local dev.
- For production, set env vars in the Cloudflare Pages dashboard.
- NEVER commit `.env` to git. It is gitignored.
- NEVER copy secret values into tracked files, config files, or commit messages.
