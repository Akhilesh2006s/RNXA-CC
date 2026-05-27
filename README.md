# RNXA-CC

Next.js frontend for **RNXA Digital** (App Router, Tailwind, React Query).

## Local development

```bash
npm install
cp .env.example .env
# .env should use http://localhost:5000/api/v1 for local backend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production API

Default production backend:

`https://rnxa-cc-backend-production.up.railway.app/api/v1`

Configured in `.env.production` and `next.config.ts`.

## Deploy (Vercel)

1. Import this repo into Vercel.
2. Set environment variable:

```env
NEXT_PUBLIC_API_BASE_URL=https://rnxa-cc-backend-production.up.railway.app/api/v1
```

3. On Railway backend, set `CLIENT_ORIGIN` to your Vercel URL (and `http://localhost:3000` for local testing).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server on port 3000 |
| `npm run build` | Production build |
| `npm start` | Run production build |
