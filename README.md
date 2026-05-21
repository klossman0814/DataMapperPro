<!-- prettier-ignore -->
<div align="center">

# DataMapper Pro

**Self-hosted ETL pipeline builder for structured data transformation**

[![Node version](https://img.shields.io/badge/Node.js-20-3c873a?style=flat-square)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-blue?style=flat-square&logo=typescript&logoColor=white)]()
[![React](https://img.shields.io/badge/React-18-087ea4?style=flat-square&logo=react)]()
[![NestJS](https://img.shields.io/badge/NestJS-10-ea2845?style=flat-square&logo=nestjs)]()
[![Prisma](https://img.shields.io/badge/Prisma-5-2d3748?style=flat-square&logo=prisma)]()
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=flat-square&logo=postgresql)]()
[![Docker](https://img.shields.io/badge/Docker-2496ed?style=flat-square&logo=docker)]()

[Overview](#overview) • [Features](#features) • [Architecture](#architecture) • [Getting started](#getting-started) • [API](#api) • [Configuration](#configuration)

</div>

**DataMapper Pro** is a self-hosted web application for building data transformation pipelines. Upload CSV or Excel files, visually map source fields to destination fields, apply transformation functions, define output templates, and generate formatted output files — all through a modern web UI.

It is designed for healthcare ETL, HL7-style exports, financial data feeds, and any structured data transformation use case that needs a flexible, on-premises solution.

## Overview

DataMapper Pro replaces ad-hoc scripting and fragile one-off ETL tools with a reusable, versioned mapping workflow. The core flow is:

```
Upload File → Map Fields → Apply Transforms → Render Template → Validate → Export
```

Each step is decoupled and independently configurable. Mappings, transformations, templates, and validation rules are saved as reusable **Mapping Profiles** that can be cloned, versioned, exported as JSON, and shared across teams.

> [!TIP]
> The entire application runs in Docker with hot-reload for development. You can be up and running with `docker compose up` in under a minute.

## Features

<div align="center">

| | Feature | Description |
|---|---|---|
| 📥 | **File Ingestion** | CSV and Excel (.xlsx/.xls) with column type detection, multi-sheet support, drag-and-drop upload |
| 🗺️ | **Mapping Designer** | Visual split-screen interface with drag-and-drop field mapping, auto-suggest by name similarity, and four mapping types (direct, constant, expression, conditional) |
| 🔄 | **Transformation Functions** | 16 built-in functions across string, date, numeric, and logic categories — all accessible via safe expression syntax (no eval) |
| 📝 | **Template Engine** | Handlebars-like syntax (`{{token}}`, `{{#if}}`/`{{else}}`/`{{/if}}`, `{{#each}}`) with Monaco code editor and live preview |
| ✅ | **Validation Engine** | Rule-based validation (required, regex, maxLength, date, lookup) with per-row error collection |
| 📤 | **Export Formats** | CSV, JSON, XML, flat-file (fixed-width), pipe/tab delimited, HL7-style, plain text |
| 💾 | **Profile Management** | Save, load, clone, version, export, and import mapping profiles as JSON |
| 📊 | **Job Processing** | Background processing with real-time progress tracking, error logging, and output download |
| 🌙 | **Dark Mode** | Full dark/light theme support persisted to localStorage |
| 🐳 | **Dockerized** | Multi-stage Docker builds with hot-reload development and production-optimized deployment |

</div>

## Architecture

The application is split into two tiers — a NestJS API backend and a React frontend — communicating over REST.

```
┌─────────────────────┐      ┌──────────────────────────────────────┐
│   Browser           │      │   Docker Compose                     │
│   localhost:5175    │      │                                      │
│         │           │      │   ┌──────────┐  ┌───────────────┐   │
│         ▼           │      │   │ Frontend │  │   Backend     │   │
│   Axios  │          │      │   │  Vite    │──│   NestJS :3002 │   │
│   ────────────────  │──────┼──▶│ :5175    │  │               │   │
│         │           │      │   └──────────┘  └───────┬───────┘   │
│         ▼           │      │                          │          │
│   http://localhost  │      │              ┌────────────┴──────┐  │
│   :3002/api/...     │      │              │  PostgreSQL 16    │  │
│                     │      │              └─────────────────┘  │
└─────────────────────┘      └──────────────────────────────────────┘
```

### Backend modules

The NestJS backend is organized into self-contained feature modules:

| Module | Responsibility |
|---|---|
| **Auth** | JWT-based registration, login, profile |
| **Files** | CSV/Excel upload, parsing, column type detection, preview |
| **Mappings** | CRUD for mapping profiles, auto-mapping suggestions |
| **Transformations** | Expression parser and 16 function handlers |
| **Templates** | Handlebars-like template engine with conditionals and loops |
| **Validation** | Rule-based row validation (5 rule types) |
| **Export** | Format serializers for 8 output formats |
| **Jobs** | Processing job orchestration with progress tracking |
| **Profiles** | Full profile lifecycle (CRUD, clone, export, import) |

### Pipeline execution order

```
Load Row → Apply Mappings → Apply Transforms → Render Template → Validate → Write Output
```

The pipeline is **row-by-row streaming** — source files are never loaded entirely into memory. Failed rows are collected with error messages while processing continues, making the system resilient to data quality issues in large files.

## Getting started

### Prerequisites

- [Docker](https://www.docker.com/products/docker-desktop) and [Docker Compose](https://docs.docker.com/compose/install/)
- [Git](https://git-scm.com/downloads)

### Quick start with Docker

```bash
# Clone the repository
git clone <repo-url> DataMapperPro
cd DataMapperPro

# Start all services (PostgreSQL, Redis, Backend, Frontend)
docker compose up -d

# Seed the demo user (one-time)
docker compose exec backend npx ts-node prisma/seed.ts
```

The services will be available at:

| Service | URL |
|---|---|
| Frontend | http://localhost:5175 |
| Backend API | http://localhost:3002 |
| PostgreSQL | localhost:5438 |
| Redis | localhost:6382 |

> [!NOTE]
> The demo credentials are `admin@datamapperpro.com` / `admin123`.

### Development without Docker

```bash
# Terminal 1 — Database
docker run -d --name datamapper-pg \
  -e POSTGRES_DB=datamapperpro \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5438:5432 postgres:16-alpine

# Terminal 2 — Backend
cd backend
cp ../.env.example .env
npm install
npx prisma generate && npx prisma db push
npm run start:dev

# Terminal 3 — Frontend
cd frontend
npm install
npm run dev
```

### Production deployment

```bash
docker compose -f docker-compose.prod.yml up --build
```

This builds optimized production images:
- Backend runs compiled JavaScript (`dist/main`) instead of `ts-node`
- Frontend assets are minified and served by nginx on port 80
- No source code volumes are mounted

> [!IMPORTANT]
> Production requires `JWT_SECRET` environment variable to be set. See `docker-compose.prod.yml` for all required configuration.

## API

All endpoints are prefixed with `/api` and protected by JWT authentication (except `auth/login` and `auth/register`).

### Authentication

```bash
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@datamapperpro.com","password":"admin123"}'
```

### Files

```bash
# Upload a CSV file
curl -X POST http://localhost:3002/api/files/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@data.csv"

# View file preview
curl http://localhost:3002/api/files/<id>/preview?page=1&limit=50 \
  -H "Authorization: Bearer <token>"
```

### Jobs

```bash
# Create and start a processing job
curl -X POST http://localhost:3002/api/jobs \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "fileId": "<file-id>",
    "profileId": "<profile-id>",
    "outputFormat": "csv"
  }'

# Download completed output
curl http://localhost:3002/api/jobs/<id>/download \
  -H "Authorization: Bearer <token>" \
  -o output.csv
```

### Full endpoint reference

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/profile` | Current user profile |
| POST | `/api/files/upload` | Upload file (multipart) |
| GET | `/api/files/:id` | File metadata |
| GET | `/api/files/:id/preview` | Paginated row preview |
| POST | `/api/mappings` | Create mapping profile |
| GET | `/api/mappings` | List profiles |
| GET / PUT / DELETE | `/api/mappings/:id` | Profile CRUD |
| POST | `/api/mappings/:id/clone` | Clone profile |
| POST | `/api/jobs` | Create + start job |
| GET | `/api/jobs` | List jobs (filter by status) |
| GET | `/api/jobs/:id` | Job details |
| GET | `/api/jobs/:id/progress` | Progress counter |
| GET | `/api/jobs/:id/download` | Download output file |
| POST | `/api/templates/:id/render` | Test-render a template |
| POST | `/api/profiles` | Save profile |
| GET / PUT / DELETE | `/api/profiles/:id` | Profile CRUD |
| POST | `/api/profiles/:id/clone` | Clone profile |
| GET | `/api/profiles/:id/export` | Export as JSON |
| POST | `/api/profiles/import` | Import from JSON |
| POST | `/api/transformations/apply` | Test a transformation expression |
| POST | `/api/validation/row` | Validate a single row |
| POST | `/api/validation/rows` | Validate a batch of rows |

## Configuration

Key environment variables (`.env`):

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5438/datamapperpro` | PostgreSQL connection string |
| `JWT_SECRET` | — | **Required in production.** JWT signing key |
| `JWT_EXPIRATION` | `24h` | Token lifetime |
| `PORT` | `3002` | Backend listen port |
| `MAX_FILE_SIZE` | `500mb` | Maximum upload file size |
| `CORS_ORIGIN` | `http://localhost:5175` | Allowed CORS origin |

### Transformation function reference

| Category | Functions |
|---|---|
| **String** | `trim`, `upper`, `lower`, `substring`, `replace`, `padStart`, `padEnd`, `concat` |
| **Date** | `formatDate(date, 'yyyyMMdd')`, `parseDate(str, pattern)` |
| **Numeric** | `round`, `formatNumber`, `parseInt`, `parseFloat` |
| **Logic** | `coalesce(...)` (first non-null), `if(cond, trueVal, falseVal)`, `case(val, pairs...)`, `switch(val, map, default?)` |

## Project structure

```
DataMapperPro/
├── docker-compose.yml          # Dev: Postgres + Redis + Backend + Frontend
├── docker-compose.prod.yml     # Production overrides (nginx, compiled backend)
├── Dockerfile.backend          # Multi-stage: builder → development → production
├── Dockerfile.frontend         # Multi-stage: development → builder → production (nginx)
├── spec/                       # AI-ready specification documents
│   └── spec-data-pipeline-engine.md
├── backend/
│   ├── prisma/schema.prisma    # 4 models: User, MappingProfile, UploadedFile, ProcessingJob
│   │                             # UUID primary keys, JSON columns for flexible config
│   └── src/
│       ├── auth/               # JWT + Passport authentication
│       ├── files/              # CSV/XLSX parsing with type detection
│       ├── mappings/engine/    # Field mapping logic
│       ├── templates/engine/   # Handlebars-like template parser
│       ├── transformations/    # Safe expression evaluator with 16 functions
│       ├── validation/engine/  # Rule-based row validation
│       ├── export/engines/     # 8 format serializers (strategy pattern)
│       └── jobs/processors/    # Pipeline orchestrator (streaming row-by-row)
└── frontend/
    └── src/
        ├── pages/              # 8 pages (Dashboard, Upload, MappingDesigner, etc.)
        ├── components/         # 11 reusable components (DataPreviewGrid, MappingCanvas, etc.)
        ├── stores/             # 3 Zustand stores (app, mapping, job)
        └── services/           # 6 API service modules
```

## Resources

- [REST API specification](spec/spec-data-pipeline-engine.md) — Detailed data pipeline contracts and interfaces
- [PostgreSQL with Prisma](https://www.prisma.io/docs/orm/overview/databases/postgresql) — ORM documentation
- [NestJS documentation](https://docs.nestjs.com/) — Backend framework reference
- [React Table](https://tanstack.com/table/v8) — Data grid component

## Troubleshooting

**Login returns "Invalid credentials" even after seeding.**
The seed command must be run after the backend is fully started. Run `docker compose exec backend npx ts-node prisma/seed.ts` and confirm the output shows "Demo user created".

**Frontend cannot reach the backend in Docker.**
The frontend calls the backend directly at `localhost:3002` (not through a Vite proxy) when `VITE_API_URL` is set in the Docker environment. Ensure the backend container port `3002` is not already in use on the host.

**"ECONNREFUSED" errors in frontend logs during development.**
This indicates the Vite proxy cannot reach the backend. The development compose file sets `VITE_API_URL=http://localhost:3002` which makes the browser call the backend directly — this requires the backend container port to be mapped to the host.

**File uploads fail with files over 500 MB.**
Adjust the `MAX_FILE_SIZE` environment variable in `docker-compose.yml` or `.env`.

## Getting help

If you encounter issues or have questions:

- [Open an issue](https://github.com/anomalyco/DataMapperPro/issues) on GitHub
- Review the [specification](spec/spec-data-pipeline-engine.md) for design details

---

<div align="center">
  <sub>Built with NestJS, React, and PostgreSQL</sub>
</div>
