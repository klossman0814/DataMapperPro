# Transferring DataMapper Pro to Another Computer

## Prerequisites

- **Git**
- **Docker** + **Docker Compose** (v2+)
- Ports 3002, 5175, 5438, 6382 must be free

## Step-by-Step

### 1. Clone the Repository

```bash
git clone https://github.com/klossman0814/DataMapperPro.git
cd DataMapperPro
```

### 2. Create Environment File

```bash
cp .env.example .env
```

Edit `.env` and set a secure `JWT_SECRET` and `DB_ENCRYPTION_KEY`:

```env
JWT_SECRET=replace-with-a-random-secret
DB_ENCRYPTION_KEY=replace-with-a-32-char-key
```

### 3. Start All Services

```bash
docker compose up -d
```

This starts PostgreSQL, Redis, the NestJS backend (port 3002), and the React frontend (port 5175). The backend auto-runs `prisma generate` + `prisma db push` on startup.

### 4. Seed the Database

```bash
docker compose exec backend npx ts-node prisma/seed.ts
```

Creates two users:
| Email | Password | Role |
|---|---|---|
| `admin@datamapperpro.com` | `admin123` | ADMIN |
| `demo@datamapperpro.com` | `admin123` | USER |

### 5. Verify

| Service | URL |
|---|---|
| Frontend | http://localhost:5175 |
| Backend API | http://localhost:3002/api |

Login as `admin@datamapperpro.com` / `admin123`.

### 6. Migrate Existing Data (optional)

If you have a workspace backup from the other machine:

1. On the **old** machine: Settings → Backup & Restore → **Export Workspace**
2. On the **new** machine: Settings → Backup & Restore → **Import Workspace**

This transfers all mapping profiles and database connection definitions. Uploaded files, processing jobs, and job output files are **not** included in the workspace export — copy them manually if needed.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Backend won't start (ECONNREFUSED) | Postgres/Redis not ready yet. Wait 10s, then `docker compose logs -f backend` |
| `prisma: error` on first load | Run `docker compose exec backend npx prisma db push` manually |
| Login says "Invalid credentials" | Seed not run → `docker compose exec backend npx ts-node prisma/seed.ts` |
| Frontend shows blank page | Check `docker compose logs frontend`; may need `docker compose build --no-cache frontend` |
| File upload fails with large files | Increase `MAX_FILE_SIZE` in `docker-compose.yml` environment |

## Updating

```bash
git pull
docker compose build --no-cache backend frontend
docker compose up -d
docker compose exec backend npx prisma db push
```
