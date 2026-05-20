# AGENTS.md — DataMapper Pro

## Project Overview

DataMapper Pro is a self-hosted ETL pipeline builder for structured data transformation. Users upload CSV or Excel files, visually map source fields to destination fields, apply transformation functions, define output templates, validate rows, and export in 8 formats.

**Architecture**: Two-tier REST app — NestJS backend + React SPA frontend, backed by PostgreSQL 16 and Redis 7 (Bull job queue). Everything runs in Docker.

**Key technologies**:
- Backend: NestJS 10, Prisma 5 (ORM), Passport/JWT auth, Bull/Redis job queue, `csv-parse`, `xlsx` (SheetJS)
- Frontend: React 18, Vite 5, Tailwind CSS 3, Zustand (state), TanStack React Table, Monaco Editor, Recharts, Lucide React, Axios, react-dropzone, react-hot-toast
- Database: PostgreSQL 16, Prisma schema in `backend/prisma/schema.prisma`
- Containerization: Multi-stage Docker builds with dev (hot-reload) and prod (nginx + compiled JS) targets

## Project Structure

```
DataMapperPro/
├── backend/                     # NestJS API server (port 3001)
│   ├── prisma/
│   │   ├── schema.prisma        # 4 models: User, MappingProfile, UploadedFile, ProcessingJob
│   │   └── seed.ts              # Seeds demo user: admin@datamapperpro.com / admin123
│   └── src/
│       ├── app.module.ts        # Root module — imports all feature modules
│       ├── main.ts              # Bootstrap — sets global prefix 'api', CORS, helmet, compression, ValidationPipe
│       ├── auth/                # JWT auth: register, login, profile (Passport + bcryptjs)
│       ├── common/              # Shared: JwtAuthGuard, CurrentUser decorator, PaginationDto
│       ├── prisma/              # PrismaModule (global), PrismaService (extends PrismaClient)
│       ├── files/               # CSV/XLSX upload, column type detection, paginated preview
│       ├── mappings/            # CRUD for mapping profiles + mapping engine (field resolution, conditions)
│       ├── transformations/     # Safe expression parser + 16 function handlers
│       ├── templates/           # Handlebars-like template engine ({{token}}, {{#if}}/{{/if}}, {{#each}})
│       ├── validation/          # Rule-based row validation (9 rule types)
│       ├── profiles/            # Full profile lifecycle (CRUD, clone, export/import JSON)
│       ├── export/              # 4 serializer services: CSV, JSON, XML, flat-file
│       └── jobs/                # Job CRUD + FileProcessorService (streaming row-by-row pipeline)
├── frontend/                    # React SPA (port 5173 dev, port 80 prod via nginx)
│   └── src/
│       ├── main.tsx             # Entry — React.StrictMode + BrowserRouter
│       ├── App.tsx              # Routes: /login, /, /upload, /mapping/:fileId?, /template/:profileId?,
│       │                       #         /jobs, /profiles, /settings
│       ├── pages/               # 8 page components
│       ├── components/          # 11 shared components
│       ├── stores/              # 3 Zustand stores: appStore, mappingStore, jobStore
│       ├── services/            # 7 Axios service modules (api, auth, files, jobs, mappings, profiles, templates)
│       ├── types/index.ts       # All TypeScript interfaces
│       └── hooks/               # 2 custom hooks: useFileUpload, useMapping
├── docker-compose.yml           # Dev: postgres + redis + backend (hot-reload) + frontend (hot-reload)
├── docker-compose.prod.yml      # Prod: nginx on port 80, compiled backend, no volume mounts for source
├── Dockerfile.backend           # Multi-stage: builder → development → production
├── Dockerfile.frontend          # Multi-stage: development → builder → production (nginx)
└── spec/                        # Specification documents
```

### Backend Module Pattern

Every feature module follows this structure:
```
module/
├── *.module.ts           # @Module({ controllers: [...], providers: [...], exports: [...] })
├── *.controller.ts       # @Controller('name') with @UseGuards(JwtAuthGuard) at class level
├── *.service.ts          # Business logic injected with @Injectable()
├── dto/                  # class-validator DTOs (one file per DTO)
└── engine/               # (optional) Engine service classes for complex logic
```

Key conventions:
- Controllers are thin — they validate input via DTOs, call a service method, and return the result.
- Services use `PrismaService` for all database access (injected via constructor).
- All endpoints except `auth/register` and `auth/login` are guarded by `JwtAuthGuard`.
- The `@CurrentUser('id')` parameter decorator extracts the authenticated user's ID from the JWT payload.
- Global `ValidationPipe` with `transform: true` and `whitelist: true` auto-transforms and validates DTOs.

## Setup Commands

### Docker (recommended — one command for full stack)

```bash
# Start all services with hot-reload
docker compose up -d

# Seed the demo user (one-time, after backend starts)
docker compose exec backend npx ts-node prisma/seed.ts

# View logs
docker compose logs -f backend frontend

# Rebuild after dependency changes
docker compose build --no-cache backend

# Stop everything
docker compose down
```

Services after `docker compose up`:
| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3001 |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

**Demo credentials**: `admin@datamapperpro.com` / `admin123`

### Local development (without Docker)

```bash
# Terminal 1 — Database (requires local PostgreSQL and Redis)
# Set up .env from .env.example
cd backend
cp ../.env.example .env
npm install
npx prisma generate
npx prisma db push
npx ts-node prisma/seed.ts
npm run start:dev

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev
```

### Production

```bash
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
# Frontend at http://localhost:80, API proxied through nginx
# REQUIRED: Set JWT_SECRET in environment before deploying
```

## Development Commands

### Backend (`backend/`)

| Command | Description |
|---|---|
| `npm run start:dev` | Start with hot-reload (nest start --watch) |
| `npm run build` | Compile to `dist/` |
| `npm run start:prod` | Run compiled `dist/main` |
| `npx prisma generate` | Regenerate Prisma client after schema change |
| `npx prisma db push` | Push schema to DB (dev only — no migration files) |
| `npx ts-node prisma/seed.ts` | Seed demo user |

### Frontend (`frontend/`)

| Command | Description |
|---|---|
| `npm run dev` | Vite dev server with HMR on port 5173 |
| `npm run build` | TypeScript check + Vite production build to `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint on all files |

### No test framework is configured yet. Both backend and frontend lack test files, test runners, and CI configuration.

## Code Style

### General

- **Language**: TypeScript (strict mode for frontend, relaxed for backend — `noImplicitAny: false`)
- **Formatting**: No Prettier config. Follow existing conventions — 2-space indentation, semicolons, single quotes.
- **Imports**: Group by: 1) external libraries, 2) NestJS/React imports, 3) local modules. No blank line separators within groups.

### Backend

- **Module files**: Named `*.module.ts`, use `@Module()` decorator. Import feature-specific modules only (no barrel/index files).
- **Controllers**: `*.controller.ts`. Decorate class with `@Controller('name')` and `@UseGuards(JwtAuthGuard)`. Methods use explicit decorators (`@Post()`, `@Get(':id')`, etc.). Inject service via constructor.
- **Services**: `*.service.ts`. Use `@Injectable()`. Inject `PrismaService` and any other services via constructor. Business logic only — no HTTP concerns.
- **DTOs**: `*.dto.ts` in `dto/` subfolder. Use `class-validator` decorators (`@IsString()`, `@IsEmail()`, `@MinLength(6)`, etc.). One class per file.
- **Engine services**: Complex algorithms go in `engine/` subfolder (e.g., `mapping-engine.service.ts`, `transformation-engine.service.ts`).
- **Prisma**: `PrismaService` is a global module — no need to import `PrismaModule` in feature modules. Use `this.prisma.modelName.findUnique()`, `findMany()`, `create()`, `update()`, etc.
- **Error handling**: Throw NestJS HTTP exceptions (`NotFoundException`, `ConflictException`, `BadRequestException`, `UnauthorizedException`) from services. Let the global exception filter handle them.
- **UUIDs**: All model IDs use `@id @default(uuid())`. Generate UUIDs with `uuid` package if needed outside Prisma.
- **JSON columns**: Use `Prisma.InputJsonValue` / `Prisma.JsonNull` via `JSON.parse(JSON.stringify(obj)) as Prisma.InputJsonValue` for JSON column writes.
- **File naming**: kebab-case for all files. Class names are PascalCase.

### Frontend

- **Components**: PascalCase files (`Dashboard.tsx`). Export as named functions (not `export default` except `App.tsx` and `main.tsx`).
- **Pages**: Full-page components in `pages/`. Use `.tsx` extension.
- **Shared components**: Reusable UI in `components/`. Use `.tsx` extension.
- **Stores**: Zustand stores in `stores/`. One store per file, named `useXxxStore`.
- **Services**: Axios service modules in `services/`. Each exports a plain object with methods (e.g., `jobsService.list()`, `jobsService.create()`).
- **Types**: All interfaces in `types/index.ts`. Import via `import type { X } from '../types'`.
- **Hooks**: Custom hooks in `hooks/`.
- **Styling**: Tailwind CSS utility classes. Custom component classes in `index.css` under `@layer components` (`.btn-primary`, `.btn-secondary`, `.btn-danger`, `.input-field`, `.card`, `.badge-*`).
- **Icons**: Lucide React. Import individual icons: `import { Upload } from 'lucide-react'`.
- **Dark mode**: `class` strategy. Toggle `dark` class on `<html>`. Use `dark:` prefix in Tailwind classes. Theme preference persisted in `localStorage`.
- **Routing**: React Router v6 with nested `<Layout>` component. Protected routes via `<ProtectedRoute>` wrapper that checks auth state.
- **API client**: `services/api.ts` creates an Axios instance with base URL from `VITE_API_URL` env var (falls back to Vite proxy `/api`). Auto-attaches Bearer token from `localStorage`. Redirects to `/login` on 401.
- **State management**: Zustand with `create` from `zustand`. Define interface for state + actions, use `set()` for immutable updates.
- **Path aliases**: `@/*` maps to `src/*` (configured in both `tsconfig.json` and `vite.config.ts`).
- **Charts**: Recharts (`ResponsiveContainer`, `AreaChart`, etc.) with dark-themed tooltips.
- **No barrel files** (`index.ts`). Import directly from the module file.

### Engine Architecture Patterns

The pipeline follows a modular strategy pattern with no base class — each engine is a standalone `@Injectable()` service:

1. **MappingEngineService.executeMapping(row, mappings)** → resolves each mapping's sourceField/constant/expression, applies conditions (equals/notEquals/contains/greaterThan/lessThan/isEmpty/isNotEmpty), returns mapped row.
2. **TransformationEngineService.apply(expression, row)** → replaces `{{field}}` tokens with row values, parses function calls like `upper(field)` or `formatDate(dob, 'yyyyMMdd')`, dispatches to one of 16 handlers.
3. **TemplateEngineService.processTemplate(template, row, mappings)** → Handlebars-style: `{{token}}`, `{{#if field}}...{{else}}...{{/if}}`, `{{#each list}}...{{/each}}`.
4. **ValidationEngineService.validateRow(row, rules)** → checks required/maxLength/minLength/regex/date/email/number/lookup/enum rules, returns `{ valid, errors, fieldErrors }`.
5. **FileProcessorService.processJob(jobId)** → orchestrates the pipeline: load rows → for each row: map → transform → template → validate → collect. Updates progress per row.

When adding a new feature:
- Add a new module directory under `backend/src/` with module/controller/service/dto/engine structure
- Register the module in `app.module.ts`
- For new export formats, add a serializer to `backend/src/export/engines/` implementing the same interface pattern
- For new transformation functions, add a private method to `TransformationEngineService` and register it in the switch statement

## Database

**Schema** (`backend/prisma/schema.prisma`): 4 models — `User`, `MappingProfile`, `UploadedFile`, `ProcessingJob`.

- All models use `@id @default(uuid())` for primary keys.
- `MappingProfile.configurationJson` is a `Json` column storing mappings array, transformation config, output options, and validation rules.
- `UploadedFile.columns` and `UploadedFile.preview` are `Json` columns for column metadata and sample rows.
- `ProcessingJob.errorLog` is a `Json` column storing per-row error arrays.
- All user-scoped queries filter by `createdById` to enforce data isolation.

Schema changes:
```bash
# After editing schema.prisma:
cd backend
npx prisma generate    # Regenerate Prisma client
npx prisma db push     # Push schema changes to dev DB
```

## API Overview

All endpoints prefixed with `/api`. Full path: `http://localhost:3001/api/<route>`.

### Auth (no JWT required for register/login)

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/api/auth/register` | `{ email, password, name }` | `{ access_token, user }` |
| POST | `/api/auth/login` | `{ email, password }` | `{ access_token, user }` |
| GET | `/api/auth/profile` | — | User object (JWT required) |

### Files (JWT required)

| Method | Path | Params | Returns |
|---|---|---|---|
| POST | `/api/files/upload` | FormData: `file` (CSV/XLSX) | `UploadedFileInfo` |
| GET | `/api/files/:id` | — | File metadata |
| GET | `/api/files/:id/preview` | `?page=1&limit=20` | Paginated rows with column info |

### Mappings (JWT required)

| Method | Path | Notes |
|---|---|---|
| POST | `/api/mappings` | Create profile |
| GET | `/api/mappings` | List all for user |
| GET | `/api/mappings/:id` | Get one |
| PUT | `/api/mappings/:id` | Update |
| DELETE | `/api/mappings/:id` | Delete |
| POST | `/api/mappings/:id/clone` | Clone with version bump |

### Jobs (JWT required)

| Method | Path | Notes |
|---|---|---|
| POST | `/api/jobs` | Start processing job |
| GET | `/api/jobs` | List (filter by `?status=`) |
| GET | `/api/jobs/:id` | Job details |
| GET | `/api/jobs/:id/progress` | Progress counters |
| GET | `/api/jobs/:id/download` | Download output file (blob) |

### Templates, Profiles, Transformations, Validation (JWT required)

| Method | Path | Notes |
|---|---|---|
| POST | `/api/templates/:id/render` | Test-render a template |
| POST | `/api/profiles` | Save profile |
| POST | `/api/profiles/:id/clone` | Clone profile |
| GET | `/api/profiles/:id/export` | Export profile as JSON |
| POST | `/api/profiles/import` | Import profile from JSON |
| POST | `/api/transformations/apply` | Test a transformation |
| POST | `/api/validation/row` | Validate single row |
| POST | `/api/validation/rows` | Validate batch of rows |

## Environment Variables

### Backend (`backend/.env` or Docker environment)

| Variable | Default (dev) | Notes |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/datamapperpro` | Prisma connection string |
| `REDIS_URL` | `redis://localhost:6379` | Bull queue backend |
| `JWT_SECRET` | `datamapper-pro-secret-change-in-prod` | **Must be changed in production** |
| `JWT_EXPIRATION` | `24h` | Token expiry |
| `PORT` | `3001` | Listen port |
| `UPLOAD_DIR` | `./uploads` | File upload storage |
| `OUTPUT_DIR` | `./output` | Job output storage |
| `MAX_FILE_SIZE` | `500mb` | Upload size limit |
| `CORS_ORIGIN` | `http://localhost:5173` | CORS allowed origin |

### Frontend

| Variable | Default | Notes |
|---|---|---|
| `VITE_API_URL` | (uses Vite proxy) | Set to `http://localhost:3001` in Docker |

## Common Tasks

### Add a new backend endpoint

1. Add DTO in `dto/` (if needed): create a class with `class-validator` decorators
2. Add method to service: implement business logic using `this.prisma`
3. Add handler to controller: decorate with HTTP method decorator, inject DTO with `@Body()`
4. If it's a new feature module, create module dir with `module.ts`, register in `app.module.ts`

### Add a new transformation function

1. Add a private method to `TransformationEngineService` (e.g., `fnReverse`)
2. Add the function name to the switch statement in `executeFunction()`
3. The expression parser handles argument parsing automatically

### Add a new export format

1. Create `backend/src/export/engines/<name>-export.service.ts` following the pattern of existing engines
2. Inject it into `FileProcessorService`
3. Add a case to the `writeOutput` switch statement

### Add a new frontend page

1. Create component in `frontend/src/pages/`
2. Add route in `App.tsx` inside the `<Layout>` route group
3. Add nav item to `Layout.tsx` navItems array

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Backend logs "ECONNREFUSED" for Postgres/Redis | Containers not healthy yet | Docker healthcheck retries; wait 10s or check `docker compose logs postgres redis` |
| Login returns "Invalid credentials" | Demo user not seeded | Run `docker compose exec backend npx ts-node prisma/seed.ts` |
| Prisma client errors after schema change | Outdated client | Run `npx prisma generate` in backend directory |
| Frontend can't reach backend | Wrong `VITE_API_URL` | In Docker it's set to `http://localhost:3001`; outside Docker, remove it to use Vite proxy |
| File upload fails with large files | Default limit 500 MB | Set `MAX_FILE_SIZE` env var |
| "Cannot find module '@prisma/client'" | Prisma client not generated | Run `npx prisma generate` |
| Docker build fails with npm errors | package-lock.json out of sync | Use `docker compose build --no-cache backend` |

## Transformation Functions Reference

| Function | Syntax | Example |
|---|---|---|
| `trim` | `trim(field)` | `trim(last_name)` |
| `upper` | `upper(field)` | `upper(city)` |
| `lower` | `lower(field)` | `lower(email)` |
| `substring` | `substring(field, start, end?)` | `substring(phone, 0, 3)` |
| `replace` | `replace(field, search, replacement)` | `replace(phone, '-', '')` |
| `padStart` | `padStart(field, len, char?)` | `padStart(id, 5, '0')` |
| `padEnd` | `padEnd(field, len, char?)` | `padEnd(code, 8, ' ')` |
| `concat` | `concat(...fields)` | `concat(first, ' ', last)` |
| `formatDate` | `formatDate(field, pattern)` | `formatDate(dob, 'yyyyMMdd')` |
| `parseDate` | `parseDate(field)` | `parseDate(date_str)` |
| `round` | `round(field, decimals?)` | `round(amount, 2)` |
| `formatNumber` | `formatNumber(field, format?)` | `formatNumber(price, '0,0.00')` |
| `parseInt` | `parseInt(field)` | `parseInt(age)` |
| `parseFloat` | `parseFloat(field)` | `parseFloat(weight)` |
| `coalesce` | `coalesce(...fields)` | `coalesce(phone, email, 'N/A')` |
| `if` | `if(condition, trueVal, falseVal)` | `if(status, 'Active', 'Inactive')` |
| `case` | `case(value, match1, out1, ..., default?)` | `case(type, 'A', 'Type A', 'B', 'Type B', 'Unknown')` |
| `switch` | `switch(value, obj, default?)` | `switch(dept, {"HR":"Human Resources"}, "Other")` |

## Template Syntax

| Syntax | Description |
|---|---|
| `{{field}}` or `{{row.field}}` | Insert field value |
| `{{#if field}}...{{/if}}` | Conditional block |
| `{{#if field}}...{{else}}...{{/if}}` | Conditional with else |
| `{{#each list}}{{field}}{{/each}}` | Iterate over array |

## Validation Rules

| Rule | Value | Behavior |
|---|---|---|
| `required` | — | Fails if null/undefined/empty |
| `maxLength` | number | Fails if length exceeds value |
| `minLength` | number | Fails if length under value |
| `regex` | string (pattern) | Tests against RegExp |
| `date` | — | Fails if not a valid Date |
| `email` | — | Fails if not valid email format |
| `number` | — | Fails if NaN |
| `lookup` | string[] | Fails if not in allowed values |
| `enum` | string[] | Same as lookup |

## Mapping Field Types

Each mapping entry supports these properties on the `FieldMapping` interface:

```typescript
interface FieldMapping {
  destinationField: string;     // Output field name
  sourceField?: string;        // Direct mapping from source column
  constant?: string;           // Static value (supports {{token}} replacement)
  expression?: string;         // Expression like `concat(first, ' ', last)`
  transformation?: string;     // Simple transform like `upper`, `trim`, `formatDate(yyyyMMdd)`
  condition?: {                // Conditional skip
    field: string;
    operator: 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan' | 'isEmpty' | 'isNotEmpty';
    value?: any;
  };
}
```

## Output Formats

| Format | Config Options | File Extension |
|---|---|---|
| CSV | `delimiter`, `includeHeader` | `.csv` |
| JSON | `pretty`, `delimiter` (ndjson vs array) | `.json` |
| XML | `rootElement`, `itemElement` | `.xml` |
| Fixed-width | `fields: [{ name, width, align, padChar }]` | `.txt` |
| Pipe-delimited | — | `.txt` |
| Tab-delimited | — | `.tsv` |
| Plain text | — | `.txt` |
| HL7-style | — | `.hl7` |
