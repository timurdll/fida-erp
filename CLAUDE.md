# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Structure

Monorepo with two separate projects:

- `backend/` — NestJS API with Clean Architecture
- `frontend/` — Next.js 14 App Router with Feature-Sliced Design (FSD)
- `docker-compose.yml` — PostgreSQL 15 for local development

## Backend

### Commands (run from `backend/`)

```bash
npm run start:dev       # Dev server with hot reload
npm run build           # Compile TypeScript
npm run lint            # ESLint
npm run test            # Unit tests
npm run test:e2e        # E2E tests
npx prisma migrate dev  # Apply migrations
npx prisma studio       # Visual DB browser
```

### Architecture — Clean Architecture

```
src/
  domain/           # Entities, value objects, repository interfaces, domain events
  application/      # Use cases, DTOs, application services
  infrastructure/   # Prisma repositories, external services, NestJS modules
```

Dependency rule: `infrastructure` → `application` → `domain`. Domain has zero framework dependencies.

## Frontend

### Commands (run from `frontend/`)

```bash
npm run dev     # Dev server (localhost:3000)
npm run build   # Production build
npm run lint    # ESLint
```

### Architecture — Feature-Sliced Design (FSD)

```
src/
  app/        # Next.js App Router (layouts, pages, providers) — created by Next.js
  pages/      # FSD page compositions
  widgets/    # Self-contained UI blocks composed from features/entities
  features/   # User interactions with business value (e.g. auth, create-order)
  entities/   # Business objects with their UI/model (e.g. user, product)
  shared/     # Reusable utilities, UI kit (shadcn), API client, types
```

Strict import rule: layers can only import from layers below them (`widgets` → `features` → `entities` → `shared`). Cross-slice imports within the same layer are forbidden.

shadcn/ui components live in `src/shared/ui/`. Add new components with `npx shadcn@latest add <component>` from `frontend/`.

## Database

Start PostgreSQL locally:

```bash
docker compose up -d
```

Connection string goes in `backend/.env` as `DATABASE_URL`.
