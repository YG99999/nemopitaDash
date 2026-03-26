# Pita 22 NemoClaw Dashboard

Single-page operational dashboard for the Pita 22 NemoClaw agent.

## Stack

- Next.js Pages Router
- TypeScript
- Supabase Auth + PostgreSQL + Realtime

## Local setup

1. Copy `.env.example` to `.env.local`
2. Add your Supabase project values
3. Run the SQL in `database/migrations.sql`
4. Optionally run `database/seed.sql`
5. Start the app:

```bash
npm install
npm run dev
```

If Supabase env vars are missing, the app falls back to demo data so the dashboard UI can still be previewed locally.

## Required environment variables

- `SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_SECRET_KEY` (optional fallback)
- `WEBHOOK_SECRET`
- `NEXT_PUBLIC_SITE_URL`

This app also still accepts the older `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` names, but it now prefers the Vercel Supabase integration variables above.

## API routes

- `GET /api/dashboard`
- `POST /api/suggestions/[id]/approve`
- `POST /api/suggestions/[id]/dismiss`
- `GET /api/settings`
- `POST /api/settings`
- `POST /api/webhook/agent-update`
- `GET /api/approvals/pending`
- `POST /api/approvals/[id]/executed`

## Roles

- `owner`: can approve suggestions and update settings
- `manager`: read-only dashboard access
