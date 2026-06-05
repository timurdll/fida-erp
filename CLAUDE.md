# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Structure

Монорепо: `backend/` (NestJS), `frontend/` (Next.js), `docker-compose.yml` (PostgreSQL 15).

---

## Backend

### Commands (run from `backend/`)

```bash
npm run start:dev       # Dev server with hot reload (port 3001)
npm run build           # Compile TypeScript
npm run lint            # ESLint
npx prisma db push      # Sync schema to DB (использовать вместо migrate — drift)
npx prisma generate     # Regenerate Prisma client
npx prisma db seed      # Create admin user: login=admin, password=admin1234
npx prisma studio       # Visual DB browser
```

### Architecture — Clean Architecture

```
src/
  domain/           # Entities + repository interfaces — NO NestJS/Prisma imports
  application/      # Services + DTOs
  infrastructure/   # Controllers, Prisma repositories, NestJS modules
```

Dependency direction: `infrastructure` → `application` → `domain`.

**Repository pattern (token-based DI):**
```typescript
// domain:  export const COMPANY_REPOSITORY = 'COMPANY_REPOSITORY'
// module:  { provide: COMPANY_REPOSITORY, useClass: PrismaCompanyRepository }
// service: @Inject(COMPANY_REPOSITORY) private repo: ICompanyRepository
```

**Prisma 7 особенности:**
- `url` вынесен из `schema.prisma` в `prisma.config.ts` (breaking change v7)
- `PrismaService` использует `@prisma/adapter-pg` через `PrismaPg(pool)`
- Seed-команда прописана в `prisma.config.ts` → `migrations.seed`

### API эндпоинты

**Auth:** `POST /api/auth/login` → `{ accessToken, user }`, `GET /api/auth/me`
Декораторы: `JwtAuthGuard`, `RolesGuard`, `@Roles()`, `@CurrentUser()`

**Users:** `GET/POST/PATCH/DELETE /api/users` — создание/редактирование только `ADMIN | DEPUTY_DIRECTOR`

**Applications:** `GET/POST /api/applications`, `PATCH /api/applications/:id`, `PATCH /api/applications/:id/complete`, `PATCH /api/applications/:id/deactivate`
- Создание/редактирование: `ADMIN | DEPUTY_DIRECTOR | SALES_HEAD | MANAGER`
- Завершение: `ADMIN | DEPUTY_DIRECTOR | DISPATCHER`
- Деактивация: `ADMIN | DEPUTY_DIRECTOR`
- Фильтры: `?deliveryDate=&status=&supplierId=&customerId=&materialId=&isActive=`
- `GET /api/applications/:id` возвращает `progress: { shippedVolume, loadingVolume, remainVolume, totalPlumbs }` и `plumbLogs[]`

**Справочники — 8 модулей:** `GET/POST /api/{entity}`, `PATCH /api/{entity}/:id`, `PATCH /api/{entity}/:id/deactivate`

| Модуль | Особенности |
|--------|-------------|
| `companies` | enum `function` (CUSTOMER/SUPPLIER/ALL), enum `type` (TOO/IP/CHL) |
| `objects` | `companyId → Company`; join `company{id,name}`; фильтр `?companyId=` |
| `materials` | enum `type` (CONCRETE/SAND/GRAVEL/CEMENT/OTHER), `density` float |
| `constructions`, `delivery-methods`, `carriers` | `name`, `note` |
| `drivers` | `fullName` (не `name`) |
| `transports` | `plateNumber` @unique; join driver+carrier; фильтры `?carrierId=&driverId=` |

Все справочники: `?isActive=true&search=` (case-insensitive contains). Soft delete — `isActive=false`. Запись/деактивация: только `ADMIN | DEPUTY_DIRECTOR`.

---

## Frontend

### Commands (run from `frontend/`)

```bash
npm run dev     # Dev server (port 3000, autoPort enabled in .claude/launch.json)
npm run build   # Production build
npm run lint    # ESLint
```

**Node.js PATH для bash-скриптов:** `/opt/homebrew/opt/node@24/bin`

### Tech stack

- Next.js 16.2, React 19, TypeScript strict
- Tailwind CSS v4, shadcn/ui (new-york, slate) — компоненты в `src/shared/ui/`
- Zustand (auth store), TanStack Query, react-hook-form + Controller
- Sonner: `import { toast } from 'sonner'` — не использовать `use-toast.ts`
- `tw-animate-css` импортируется через относительный путь в `globals.css`

**Добавить shadcn компонент:** `npx shadcn@latest add <component>` из `frontend/`

### Стили — только CSS-переменные

Строго тёмная тема. Использовать: `bg-background`, `bg-card`, `bg-background-elevated`, `text-foreground`, `text-muted-foreground`, `border-border`, `text-success`, `text-destructive`, `text-primary`, `text-warning`. Никаких `bg-gray-*`, `text-white`, хардкода цветов. CSS-переменные `--success`, `--warning`, `--destructive` маппятся в Tailwind через `@theme inline` в `globals.css`.

### Architecture — Feature-Sliced Design (FSD)

```
src/
  app/        # Next.js App Router: layout, providers, middleware, page routes (тонкие)
  views/      # Page-level компоненты (named exports)
  widgets/    # Самодостаточные UI-блоки (Sidebar, Tab-виджеты)
  features/   # Фичи с бизнес-ценностью (ApplicationForm, DictionarySheet)
  entities/   # Бизнес-объекты: model/types.ts + api/*Api.ts + model/queryKeys.ts
  shared/     # UI kit (shadcn), API client, Zustand store, utils
```

Импорт строго вниз: `widgets` → `features` → `entities` → `shared`. Страницы в `app/` импортируют из `views/`.

### Auth & API

- **Zustand store** `shared/store/auth.store.ts` — persist в localStorage, синхронизирует cookie `is_authed=1`
- **Middleware** `src/middleware.ts` — защищает все роуты кроме `/login` по cookie
- **API client** `shared/api/client.ts` — добавляет `Authorization: Bearer` из стора; на 401 → авто-logout

```typescript
import { apiFetch } from '@/shared/api/client'
apiFetch<T>('/endpoint', { method: 'POST', body: JSON.stringify(dto) })
```

### Реализованные страницы

| Роут | View | Статус |
|------|------|--------|
| `/login` | `views/login` | Реальный API |
| `/journal` | `views/applications-journal` | Реальный API, аккордеон с plumbLogs, refetchInterval 30s |
| `/plan` | `views/applications-plan` | Реальный API, список + календарный вид (неделя/день) |
| `/plan/add` | `PlanApplicationFormView` | Форма создания; пресет `?date=&time=` из URL |
| `/plan/view/[id]` | `PlanApplicationView` | Детали + прогресс-бар + журнал отвесов |
| `/plan/edit/[id]` | `PlanApplicationFormView` | Предзаполненная форма |
| `/weighing` | `views/weighing-journal` | Моки |
| `/users` | `views/users` | Реальный API |
| `/dictionaries` | `views/dictionaries` | 8 табов, реальный API |

### Модуль Заявок (Applications)

**Entity layer:**
- `entities/application/model/types.ts` — `Application`, `ApplicationStatus`, `APP_STATUS_LABEL`, `PlumbLogSummary`, `ApplicationProgress`, `CreateApplicationDto`, `ApplicationFilters`
- `entities/application/model/queryKeys.ts` — `applicationKeys.all/lists/list(filters)/detail(id)`
- `entities/application/api/applicationApi.ts` — `getApplications`, `getApplicationById`, `createApplication`, `updateApplication`, `completeApplication`, `deactivateApplication`

**`ApplicationForm`** (`features/applications/ui/ApplicationForm.tsx`):
- Props: `defaultValues?`, `onSubmit`, `isLoading?`, `submitLabel?`, `onCancel?`
- DatePicker: Popover + Calendar (react-day-picker v10, без `initialFocus`); конвертация YYYY-MM-DD ↔ local Date без UTC-сдвига через ручной `new Date(y, m-1, d)`
- TimePicker: два Select (часы 06–22, минуты 00/15/30/45) с иконкой Clock
- Объект зависит от заказчика: `enabled: !!customerId`, сброс через `useEffect` при смене
- `deliveryDate` с бэкенда приходит как полная ISO-строка — всегда `.slice(0, 10)` перед использованием

**`ApplicationProgressBar`** (`features/applications/ui/ApplicationProgressBar.tsx`):
- Props: `shipped`, `loading`, `total`, `showText?`, `size?: 'sm'|'md'|'lg'`

**CalendarView** (внутри `ApplicationsPlanPage`):
- Сопоставление заявок: `app.deliveryDate.slice(0, 10) === dateStr` и `app.deliveryTime?.startsWith(slotHour + ':')`
- В календарном режиме `deliveryDate` фильтр не передаётся (загружаются все активные заявки)

### Справочники (`/dictionaries`)

**Паттерн каждого таба** (`widgets/dictionaries/ui/*Tab.tsx`):
- debounce 300ms на поиск: `useEffect` + `setTimeout`
- `isActive = statusFilter === 'all' ? undefined : statusFilter === 'active'`
- `DictionarySheet` (`features/dictionaries/ui/DictionarySheet.tsx`) — Sheet для создания/редактирования; запуск: `formRef.current?.requestSubmit()`
- `SearchableSelect` (`shared/ui/SearchableSelect.tsx`) — Popover + Command, debounce 300ms (ObjectForm, TransportForm)

---

## Database

```bash
docker compose up -d   # Поднять PostgreSQL
```

`DATABASE_URL` в `backend/.env`.

**Ключевая цепочка:** `Application` (заявка: заказчик → объект → материал → плановый объём) → `PlumbLog` (отвес: тара + брутто → нетто, привязка к транспорту и водителю).

**Основные модели:**
- **Application**: supplierId, customerId, objectId, materialId, constructionId?, deliveryMethodId?, authorId, targetVolume, deliveryDate, deliveryTime (HH:mm), loadingInterval, slumpCone, status (PENDING/IN_PROGRESS/COMPLETED/CANCELLED), isActive
- **PlumbLog**: applicationId?, transportId?, driverId?, tare (Int), gross (Int?), net (Int?), volume, firstWeighingAt, secondWeighingAt, isReturn, isActive
- **UserRole**: ADMIN | DEPUTY_DIRECTOR | SALES_HEAD | MANAGER | DISPATCHER

---

## Dev Servers (.claude/launch.json)

```
Frontend (Next.js)  — npm run dev        — port 3000 (autoPort: true)
Backend  (NestJS)   — npm run start:dev  — port 3001
PostgreSQL (Docker) — docker compose up -d — port 5432
```
