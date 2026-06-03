# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Structure

Monorepo with two separate projects:

- `backend/` — NestJS API with Clean Architecture
- `frontend/` — Next.js 16 App Router with Feature-Sliced Design (FSD)
- `docker-compose.yml` — PostgreSQL 15 for local development

## Backend

### Commands (run from `backend/`)

```bash
npm run start:dev       # Dev server with hot reload (port 3001)
npm run build           # Compile TypeScript
npm run lint            # ESLint
npx prisma db push      # Sync schema to DB (используется вместо migrate из-за drift)
npx prisma generate     # Regenerate Prisma client
npx prisma db seed      # Create admin user (login: admin, password: admin1234)
npx prisma studio       # Visual DB browser
```

### Architecture — Clean Architecture

```
src/
  domain/           # Entities + repository interfaces (NO NestJS/Prisma imports)
  application/      # Services + DTOs
  infrastructure/   # Controllers, Prisma repositories, NestJS modules
```

Dependency rule: `infrastructure` → `application` → `domain`. Domain has zero framework dependencies.

**Repository pattern:** каждый модуль использует token-based DI:
```typescript
// domain: export const COMPANY_REPOSITORY = 'COMPANY_REPOSITORY'
// module:  { provide: COMPANY_REPOSITORY, useClass: PrismaCompanyRepository }
// service: @Inject(COMPANY_REPOSITORY) private repo: ICompanyRepository
```

**Prisma 7 особенности:**
- `url` вынесен из `schema.prisma` в `prisma.config.ts` (breaking change v7)
- `PrismaService` использует `@prisma/adapter-pg` через `PrismaPg(pool)`
- Seed-команда прописана в `prisma.config.ts` → `migrations.seed`

### Реализованные модули

**Auth:** `POST /api/auth/login`, `GET /api/auth/me` — JWT + bcrypt, `JwtAuthGuard`, `RolesGuard`, `@Roles()`, `@CurrentUser()`

**Users:** `GET/POST/PATCH/DELETE /api/users` — ADMIN/DEPUTY_DIRECTOR создают/редактируют

**Справочники (8 модулей)** — все эндпоинты `GET/POST /api/{entity}`, `PATCH /api/{entity}/:id`, `PATCH /api/{entity}/:id/deactivate`:
- `/api/companies` — CompanyFunction enum (CUSTOMER/SUPPLIER/ALL), CompanyType (TOO/IP/CHL)
- `/api/objects` — привязан к Company, join возвращает `company: {id, name}`; фильтр `?companyId=`
- `/api/materials` — MaterialType enum (CONCRETE/SAND/GRAVEL/CEMENT/OTHER), density float
- `/api/constructions`, `/api/delivery-methods`, `/api/carriers` — name + note
- `/api/drivers` — fullName (не name)
- `/api/transports` — plateNumber @unique, join driver+carrier; фильтры `?carrierId=&driverId=`

Все справочники: `?isActive=true&search=` (case-insensitive contains). Soft delete — `isActive=false`.
Запись/деактивация требует роль `ADMIN | DEPUTY_DIRECTOR`.

## Frontend

### Commands (run from `frontend/`)

```bash
npm run dev     # Dev server (localhost:3000)
npm run build   # Production build
npm run lint    # ESLint
```

### Tech stack

- Next.js 16.2, React 19, TypeScript strict
- Tailwind CSS v4 (PostCSS), shadcn/ui (new-york, slate)
- Zustand (auth store), TanStack Query (data fetching), react-hook-form
- Sonner для toast-уведомлений (`import { toast } from 'sonner'`)
- `@next/swc-darwin-arm64` — установлен вручную (Apple Silicon)
- `tw-animate-css` импортируется через относительный путь в `globals.css` (обход exports map)

### Стили — только CSS-переменные

Строго тёмная тема. Никаких `bg-gray-*`, `text-white`, хардкода цветов.
Использовать: `bg-background`, `bg-card`, `bg-background-elevated`, `text-foreground`, `text-muted-foreground`, `border-border`, `text-success`, `text-destructive`, `text-primary`.

### Architecture — Feature-Sliced Design (FSD)

```
src/
  app/        # Next.js App Router: layout, providers, middleware, страницы-роуты
  views/      # Страницы (page-level компоненты)
  widgets/    # Самодостаточные UI-блоки (sidebar, tab-виджеты)
  features/   # Фичи с бизнес-ценностью (auth, формы справочников)
  entities/   # Бизнес-объекты: model/types.ts + api/*Api.ts
  shared/     # utils, UI kit (shadcn), API client, store, types
```

Импорт только вниз по слоям: `widgets` → `features` → `entities` → `shared`.

shadcn/ui компоненты в `src/shared/ui/`. Добавлять: `npx shadcn@latest add <component>` из `frontend/`.

### Auth

- **Zustand store** `src/shared/store/auth.store.ts` — persist в localStorage, синхронизирует cookie `is_authed=1` для middleware
- **Middleware** `src/middleware.ts` — защищает все роуты кроме `/login` по cookie
- **API client** `src/shared/api/client.ts` — добавляет `Authorization: Bearer` из стора; на 401 → авто-logout

### API-клиент

```typescript
import { apiFetch } from '@/shared/api/client'
// Автоматически добавляет JWT-заголовок. Все запросы через этот клиент.
apiFetch<T>('/endpoint', { method: 'POST', body: JSON.stringify(dto) })
```

### Реализованные страницы

| Роут | View | Описание |
|------|------|----------|
| `/login` | `views/login` | Авторизация, toast при ошибке |
| `/journal` | `views/applications-journal` | Журнал заявок (моки) |
| `/plan` | `views/applications-plan` | План заявок (моки) |
| `/weighing` | `views/weighing-journal` | Журнал отвесов (моки) |
| `/users` | `views/users` | Управление пользователями → реальный API |
| `/dictionaries` | `views/dictionaries` | Справочники → реальный API |
| `/dictionaries` | `views/dictionaries` | 8 табов, все подключены к API |

### Справочники (`/dictionaries`)

8 табов: Компании, Объекты, Материалы, Конструкция, Способ приёмки, Перевозчик, Водители, Транспорт.

**Структура каждого таба:**
```
entities/{entity}/model/types.ts     — интерфейсы + Label-маппинги enum
entities/{entity}/api/{entity}Api.ts — get/create/update/deactivate через apiFetch
features/dictionaries/ui/*Form.tsx   — react-hook-form форма
widgets/dictionaries/ui/*Tab.tsx     — полный таб: загрузка, поиск, таблица, Sheet
```

**`DictionarySheet`** (`features/dictionaries/ui/DictionarySheet.tsx`) — переиспользуемая обёртка Sheet для добавления/редактирования. Вызов: `formRef.current?.requestSubmit()`.

**`SearchableSelect`** (`shared/ui/SearchableSelect.tsx`) — Popover + Command с debounce 300ms. Используется в ObjectForm (companyId) и TransportForm (driverId, carrierId).

**Паттерн Tab-компонента:**
- debounce 300ms на поиск через `useEffect` + `setTimeout`
- `isActive = statusFilter === 'all' ? undefined : statusFilter === 'active'`
- Skeleton пока загружается, `overflow-x-auto` на таблице
- Клик по строке → открывает Sheet на редактирование
- DropdownMenu: Редактировать / Деактивировать

## Database

```bash
docker compose up -d   # Поднять PostgreSQL
```

`DATABASE_URL` в `backend/.env`. Все таблицы уже созданы через `prisma db push`.
