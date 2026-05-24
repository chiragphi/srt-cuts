# SRT Cuts

Next.js booking site for SRT Cuts.

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Netlify Deploy

This repo is configured for Netlify with `netlify.toml`.

Netlify settings:

- Build command: `npm run build`
- Publish directory: `.next`
- Node version: `22`

Add these environment variables in Netlify before deploying:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`
- `ADMIN_PHONE`
- `NEXT_PUBLIC_SITE_URL`
- `AUTH_ADMIN_BYPASS_CODE`
- `AUTH_CUSTOMER_BYPASS_CODE`

Use `https://srtcuts.hair` for `NEXT_PUBLIC_SITE_URL` when your domain is connected.

The bypass variables are server-side only. Use them as a temporary fallback if SMS is unavailable.

To avoid typing them one by one, import the local `.env` file with the Netlify CLI:

```bash
npx netlify login
npx netlify link
npx netlify env:import .env
```

Netlify does not read `.env` files from the repo during cloud builds. The import command copies the values into your Netlify site's environment variable settings.
