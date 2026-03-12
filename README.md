# 人事CREW Smart Onboarding

AIを活用した従業員オンボーディング自動化システム — Built for Railway deployment.

## What It Does

End-to-end employee onboarding automation:
- Admin builds and sends employment contracts
- Employee signs digitally and uploads identity documents (日本語対応)
- Claude AI reads and extracts data from: マイナンバーカード, 在留カード, 住民票, 運転免許証, パスポート
- Commute route is automatically calculated
- AI validates all submitted data and flags issues for admin review
- Admin approves and exports to CSV

## Prerequisites

- Node.js 18+
- PostgreSQL database (or Railway managed PostgreSQL)
- Anthropic API key
- Cloudinary account (free tier, 25GB — cloudinary.com)
- (Optional) Google Maps API key with Directions API enabled

## Local Setup

### Step 1 — Get PostgreSQL running locally

You have three options. Pick the easiest for you:

**Option A: Docker (recommended — no install needed if you have Docker)**
```bash
docker run --name jinjiCrew-db \
  -e POSTGRES_USER=jinjiCrew \
  -e POSTGRES_PASSWORD=localpass \
  -e POSTGRES_DB=jinjiCrew \
  -p 5432:5432 \
  -d postgres:15
```
Your DATABASE_URL will be: `postgresql://jinjiCrew:localpass@localhost:5432/jinjiCrew`

**Option B: Homebrew (Mac)**
```bash
brew install postgresql@15
brew services start postgresql@15
createdb jinjiCrew
```
Your DATABASE_URL will be: `postgresql://localhost:5432/jinjiCrew`

**Option C: Postgres.app (Mac, easiest GUI)**
Download from https://postgresapp.com, start it, then in the app click "+" to create a new database called `jinjiCrew`.
Your DATABASE_URL will be: `postgresql://localhost:5432/jinjiCrew`

---

### Step 2 — Get your API keys

Before running the app you need these accounts set up:

**Anthropic API key** (required)
- Go to https://console.anthropic.com → API Keys → Create Key
- Copy the `sk-ant-...` key

**Cloudinary** (required for document uploads)
- Sign up free at https://cloudinary.com
- Go to Dashboard → copy Cloud Name, API Key, API Secret
- Free tier gives 25GB storage and 25GB bandwidth/month — more than enough for MVP

**Google Maps** (optional)
- Go to https://console.cloud.google.com → APIs → Enable "Directions API"
- Create credentials → API Key
- If you skip this, the app uses mock commute data automatically — fine for local testing

---

### Step 3 — Create your .env.local

Create a file called `.env.local` in the project root with this exact content, filling in your values:
```bash
# Database — local PostgreSQL
DATABASE_URL="postgresql://jinjiCrew:localpass@localhost:5432/jinjiCrew"
# (adjust user/password/host based on your setup from Step 1)

# Anthropic
ANTHROPIC_API_KEY="sk-ant-your-key-here"

# Cloudinary
CLOUDINARY_CLOUD_NAME="your_cloud_name"
CLOUDINARY_API_KEY="your_api_key"
CLOUDINARY_API_SECRET="your_api_secret"

# Google Maps (leave blank to use mock data)
GOOGLE_MAPS_API_KEY=""

# App URL — always this value for local dev
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

### Step 4 — Install and run
```bash
npm install

# Generate Prisma client and create database tables
npx prisma migrate dev --name init

# Verify database connected and tables were created
npx prisma studio
# Opens a browser GUI at http://localhost:5555 where you can see your empty tables

# Start the dev server
npm run dev
```

App is now running at **http://localhost:3000**

---

### Step 5 — Verify everything works

Open http://localhost:3000 and run through this quick smoke test:

1. Go to `/admin/new-contract` — fill in a test contract and click Send. Copy the onboarding link.
2. Open the onboarding link in a new tab — you should see the employee wizard.
3. Upload any photo as a test document — Cloudinary should receive it and Claude should attempt OCR.
4. Complete all steps and submit.
5. Go back to `/admin/dashboard` — you should see the submitted record with AI review.
6. Click "CSVエクスポート" — a CSV file should download.

If step 3 fails with a Cloudinary error, double-check your `CLOUDINARY_*` env vars.
If step 3 fails with an Anthropic error, check your `ANTHROPIC_API_KEY`.
If the app won't start at all, run `npx prisma migrate dev` again and check for DB connection errors.

---

### Useful local dev commands
```bash
# View and edit your database in a browser GUI
npx prisma studio

# Reset database completely (wipes all data)
npx prisma migrate reset

# If you change prisma/schema.prisma, apply the changes
npx prisma migrate dev --name describe_your_change

# Check TypeScript errors
npx tsc --noEmit

# Run linter
npm run lint
```

---

### Common local issues

**"Can't reach database server"**
→ PostgreSQL isn't running. If using Docker: `docker start jinjiCrew-db`. If Homebrew: `brew services start postgresql@15`.

**"Environment variable not found: DATABASE_URL"**
→ Make sure your file is named exactly `.env.local` (with the dot), not `env.local` or `.env`.

**"PrismaClientInitializationError"**
→ Run `npx prisma generate` to regenerate the Prisma client after any schema changes.

**Cloudinary upload fails silently**
→ Check that `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` are all set correctly with no extra spaces or quotes around the values.

**next.config.js `output: 'standalone'` breaks hot reload**
→ This is a known minor issue locally. If hot reload feels slow, you can temporarily comment out `output: 'standalone'` during local development and re-enable before pushing to Railway. Everything else still works.

## Railway Deployment

1. Push code to GitHub
2. Go to railway.com → New Project → Deploy from GitHub Repo
3. Select your repository
4. Click **Add Service** → select **Database** → **PostgreSQL**
5. In the Next.js service **Variables** tab, add:

| Variable | Value |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `ANTHROPIC_API_KEY` | `sk-ant-...` |
| `CLOUDINARY_CLOUD_NAME` | from cloudinary.com |
| `CLOUDINARY_API_KEY` | from cloudinary.com |
| `CLOUDINARY_API_SECRET` | from cloudinary.com |
| `NEXT_PUBLIC_APP_URL` | your Railway domain (set after first deploy) |
| `GOOGLE_MAPS_API_KEY` | optional |

6. In service **Settings**, click **Generate Domain**
7. Update `NEXT_PUBLIC_APP_URL` with that domain
8. Redeploy — migrations run automatically on startup

**Cost estimate on Railway Hobby plan ($5/month included):**
- Next.js service: ~$2-3/month (idle most of the time)
- PostgreSQL: ~$1-2/month (small DB)
- Typically fits within the $5 included credits

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `ANTHROPIC_API_KEY` | Yes | Claude API key |
| `CLOUDINARY_CLOUD_NAME` | Yes | Cloudinary cloud name for document storage |
| `CLOUDINARY_API_KEY` | Yes | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Yes | Cloudinary API secret |
| `NEXT_PUBLIC_APP_URL` | Yes | App base URL (for shareable links) |
| `GOOGLE_MAPS_API_KEY` | No | Maps API (mock data used if absent) |

## Architecture


# 人事CREW Smart Onboarding

Next.js + TypeScript + Tailwind CSS Japanese HR onboarding system for TECH CREW株式会社.

## Getting Started

```bash
npm install
cp .env.local.example .env.local   # then fill in your keys
npx prisma migrate dev             # set up the database
npm run dev                        # http://localhost:3000
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `ANTHROPIC_API_KEY` | Yes | Claude API key for OCR + validation |
| `CLOUDINARY_CLOUD_NAME` | Yes | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Yes | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Yes | Cloudinary API secret |
| `NEXT_PUBLIC_APP_URL` | Yes | Public URL (e.g. `https://your-app.up.railway.app`) |
| `GOOGLE_MAPS_API_KEY` | No | For commute route lookup |

## Railway Deployment

1. Push code to GitHub
2. Create a Railway project → add your GitHub repo as a service
3. Add a PostgreSQL service to the same project
4. In the Next.js service settings, add environment variable:
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}` (Railway reference variable)
5. Add all other env vars: `ANTHROPIC_API_KEY`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `NEXT_PUBLIC_APP_URL`
6. Railway auto-deploys. The start command in `railway.json` runs Prisma migrations automatically before starting.
7. Generate a domain in Railway service settings → that becomes your `NEXT_PUBLIC_APP_URL`
