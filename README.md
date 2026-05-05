# zero quebra

Full-stack functional demo of an AI-driven markdown decision engine for FLV (perishables) in retail. Postgres + Express + React + WebSocket. Multi-role auth, real CRUD, real decision engine running against live DB rows.

## Stack

- **Frontend**: React 18 + TypeScript + Vite + React Router + Zustand + Recharts + i18next (PT-BR primary)
- **Backend**: Node 20 + Express + Prisma + JWT + bcrypt + ws
- **Database**: PostgreSQL 16+
- **Workspaces**: npm workspaces monorepo (`backend`, `frontend`)

## Prerequisites

- Node 20 LTS
- PostgreSQL 16+ running on `localhost:5432` (Homebrew or Docker)

## First-time setup

```bash
# 1. Install all workspace deps
npm install

# 2. Create the Postgres role + database
psql -U <your-superuser> -d postgres <<'SQL'
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'zero_quebra') THEN
    CREATE ROLE zero_quebra LOGIN PASSWORD 'zero_quebra_dev';
  END IF;
END $$;
SQL
createdb -U <your-superuser> -O zero_quebra zero_quebra
psql -U <your-superuser> -d postgres -c "ALTER ROLE zero_quebra CREATEDB;"

# 3. Run migrations + seed
npm run db:migrate
npm run db:seed

# 4. Start everything
npm run dev
```

Open http://localhost:5173

## Demo accounts

All accounts use password **`zero1234`**.

| Email | Role | Scope |
|---|---|---|
| `admin@zeroquebra.dev` | Admin | Everything |
| `coo@zeroquebra.dev` | COO | Executive dashboard, all stores |
| `manager.l07@zeroquebra.dev` | Store Manager | Loja 7 only |
| `manager.l14@zeroquebra.dev` | Store Manager | Loja 14 only |
| `sup.l07@zeroquebra.dev` | Supervisor | Loja 7 alerts (mobile frame) |
| `sup.l14@zeroquebra.dev` | Supervisor | Loja 14 alerts |

## What's in the demo

- **Login** — JWT auth, demo accounts pre-seeded for instant role switching
- **Role-aware shell** — sidebar shows only what each role can do
- **Inventory** (Admin, Manager) — full CRUD, restock action, real-time urgency tier from engine
- **Alerts** (Admin, Manager, Supervisor) — confirm/dismiss; confirming creates an `ActionLog`
- **Mobile (frame)** (Supervisor) — phone-shaped UI showing pending alerts with PT-BR copy and 60px confirm button
- **Painel COO** (Admin, COO) — real KPIs from DB: today's shrinkage, 30-day baseline, weekly savings, store comparison, learning-loop chart in Scenario C
- **Histórico** — every confirmed markdown, queryable
- **Admin** — Stores, Suppliers, SKUs (catalog), Users — all CRUD
- **Modo apresentação** (Admin) — scripted "trigger Morango · Loja 7" that flips real DB state and lets the engine react naturally

## Architecture highlights

```
Browser (React 18, TS, Vite)              ──── /api/* (REST)
  ├── login + JWT in localStorage          ──── /ws (WebSocket)
  ├── role-aware router                                │
  └── Zustand auth store                               │
                                                       ▼
                                ┌──────────────────────────────────────┐
                                │  Express + ws (port 4321)            │
                                │  • bcrypt password hash              │
                                │  • JWT auth middleware               │
                                │  • role middleware (ADMIN/COO/etc)   │
                                │  • Prisma ORM                        │
                                │  • Decision engine (TS module)       │
                                │  • Background scanner every 15s      │
                                │  • broadcasts ALERT_RAISED,          │
                                │      ACTION_CONFIRMED, etc.          │
                                └──────────────────┬───────────────────┘
                                                   │
                                ┌──────────────────▼───────────────────┐
                                │  PostgreSQL (zero_quebra)            │
                                │  Users · Stores · Suppliers · SKUs   │
                                │  Inventory · Alerts · ActionLogs     │
                                │  CooDailyMetric · LearningWeek       │
                                └──────────────────────────────────────┘
```

The **decision engine** is a deterministic rule-based module (`backend/src/engine.ts`). It runs every 15s against live DB rows, classifies each inventory item SAFE/AMBER/CRITICAL, and inserts `Alert` rows. WebSocket pushes `ALERT_RAISED` so any open browser tab updates instantly. When a supervisor confirms in the mobile-frame view, an `ActionLog` row is inserted in a transaction, the alert flips to CONFIRMED, and `ACTION_CONFIRMED` is broadcast — the operator dashboard, COO, and history all reflect it without a page refresh.

## Repo layout

```
.
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma            # 9 models, 4 enums
│   │   ├── seed.ts                  # 16 stores, 4 suppliers, ~50 SKUs, 30d COO, 8w learning, 6 users
│   │   └── migrations/
│   ├── src/
│   │   ├── index.ts                 # Express + ws bootstrap
│   │   ├── prisma.ts                # PrismaClient singleton
│   │   ├── engine.ts                # Decision engine (Scenarios A/B/C)
│   │   ├── scanner.ts               # Background scan + alert generation
│   │   ├── ws.ts                    # WebSocket setup + broadcast helper
│   │   ├── middleware/
│   │   │   ├── auth.ts              # JWT signing + requireAuth + requireRole
│   │   │   └── error.ts             # Zod + HttpError handler
│   │   └── routes/
│   │       ├── auth.ts              # /login, /me, /signup
│   │       ├── stores.ts · suppliers.ts · skus.ts · users.ts
│   │       ├── inventory.ts · alerts.ts · actions.ts
│   │       ├── coo.ts               # /dashboard aggregation
│   │       └── demo.ts              # Guided-demo orchestration
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── main.tsx · App.tsx
│   │   ├── store/authStore.ts
│   │   ├── lib/
│   │   │   ├── api.ts               # auth-aware fetch wrapper
│   │   │   ├── useWs.ts             # shared WS hook
│   │   │   ├── i18n.ts · brand.css
│   │   ├── layout/Shell.tsx         # role-aware sidebar shell
│   │   ├── components/              # Modal, PageHeader, UrgencyBadge, page.css
│   │   ├── pages/
│   │   │   ├── Login/               # demo-account quick picker
│   │   │   ├── Inventory/           # CRUD + restock
│   │   │   ├── Alerts/              # confirm / dismiss
│   │   │   ├── Mobile/              # supervisor phone frame
│   │   │   ├── COO/                 # KPIs + charts
│   │   │   ├── ActionLog/           # history
│   │   │   ├── Admin/               # Stores, Suppliers, SKUs, Users
│   │   │   └── GuidedDemo/          # presenter trigger
│   │   └── locales/                 # pt-BR.json, en.json
│   └── package.json
├── docs/                            # Architecture writeup, dev plan
├── docker-compose.yml               # Optional: Postgres in Docker
├── package.json                     # workspaces
└── README.md
```

## Common commands

```bash
npm run dev              # both backend + frontend, auto-reload
npm run db:migrate       # prisma migrate dev
npm run db:seed          # reseed (idempotent — clears + seeds)
npm run db:reset         # nuke pgdata volume (Docker only)
npm -w backend run prisma:studio    # Prisma Studio at :5555
npm test                 # run backend + frontend tests (none yet)
```

## Live demo flow (recommended)

Open four browser windows, log in to each as a different role:

1. **Admin** at http://localhost:5173 — go to **Modo apresentação**
2. **Store Manager** (Loja 7) — go to **Estoque** (you'll see Morango among 47 items)
3. **Supervisor** (Loja 7) — go to **Mobile (frame)**
4. **COO** — go to **Painel COO**

In the Admin "Modo apresentação" page, click **"1 · Disparar Morango · Loja 7"**. Within seconds:

- Background scanner picks up the changed inventory state
- An `Alert` is inserted in the DB
- The supervisor's Mobile frame shows a Morango alert with countdown
- The store manager's inventory tab shows Morango as AMBER
- WebSocket pushes update everything in real time

The supervisor taps **"Confirmar markdown"** → action logged, COO updates, history populates, alert flips to CONFIRMED.

Click **"Reiniciar demo"** to reset the headline SKU back to safe state.

## Notes

- White-label: only the `zero quebra` brand appears in any user-facing surface or repo file. Brand tokens are in `frontend/src/lib/brand.css`.
- Offline: scanner runs locally; no external API calls.
- PT-BR: all team-facing UI is Portuguese. Operator/admin pages are bilingual where appropriate.

## Deploying to Railway

The repository ships in two flavours so each service can be deployed independently:

- **`main` branch** — full monorepo (frontend + backend, for local development).
- **`backend` branch** — only the backend at the root, with `prisma/`, `package.json`, `Procfile`, `railway.json`. Point a Railway service at this branch.
- **`frontend` branch** — only the frontend at the root, with `vite.config.ts`, `package.json`, `railway.json`. Point a separate Railway service at this branch.

### Backend service

1. Create a new Railway project, attach a **PostgreSQL** plugin.
2. Add a **service** and connect this repo, branch `backend`.
3. Railway will read `railway.json` and `package.json`. Required env vars:
   - `DATABASE_URL` — auto-provided by the Postgres plugin.
   - `JWT_SECRET` — set to a strong random string. Generate with: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
   - `PORT` — auto-provided by Railway; defaults to `4321` locally.
4. Deploy. The `start` script runs `prisma migrate deploy` then boots the API+WS.
5. After first deploy, run the seed script once via Railway's shell: `npx tsx prisma/seed.ts`.
6. Note the public URL (e.g. `https://zero-quebra-backend.up.railway.app`). You'll set this on the frontend service next.

### Frontend service

1. Add another service in the same project, connect this repo, branch `frontend`.
2. Set the env var:
   - `VITE_API_BASE_URL` — the public URL of the backend service from the previous step (no trailing slash).
3. Deploy. Build runs `npm install && npm run build`, deploy serves the static `dist/` folder via `serve`.

### One-shot fresh deploy checklist

- [ ] Postgres plugin attached
- [ ] `JWT_SECRET` set on backend
- [ ] `DATABASE_URL` reaches backend (Railway's auto-link)
- [ ] First seed run: `npx tsx prisma/seed.ts` from backend's Railway shell
- [ ] `VITE_API_BASE_URL` on frontend points at backend's public URL
- [ ] Frontend build succeeded and `serve` is up
- [ ] Open the frontend URL and log in as `admin@zeroquebra.dev` / `zero1234`
