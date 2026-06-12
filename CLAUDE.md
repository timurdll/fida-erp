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

**Важно — TypeScript isolatedModules:** интерфейсы репозиториев в конструкторах сервисов инжектируются через токен, поэтому их нужно импортировать отдельно:
```typescript
import { PLUMB_LOG_REPOSITORY } from '../../domain/plumb-log/i-plumb-log.repository';
import type { IPlumbLogRepository } from '../../domain/plumb-log/i-plumb-log.repository';
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

**PlumbLogs:** `GET/POST /api/plumb-logs`, `PATCH /api/plumb-logs/:id`, `PATCH /api/plumb-logs/:id/weigh-tare`, `PATCH /api/plumb-logs/:id/weigh-gross`, `POST /api/plumb-logs/:id/return`, `PATCH /api/plumb-logs/:id/deactivate`
- Создание/взвешивание/возврат: `ADMIN | DEPUTY_DIRECTOR | DISPATCHER`
- Деактивация: `ADMIN | DEPUTY_DIRECTOR`
- Фильтры: `?dateFrom=&dateTo=&isActive=&isReturn=&supplierId=&customerId=&materialId=&applicationId=`
- Без фильтров и без `applicationId` — возвращает только сегодняшние записи

**Справочники — 10 модулей:** `GET/POST /api/{entity}`, `PATCH /api/{entity}/:id`, `PATCH /api/{entity}/:id/deactivate`

| Модуль | Особенности |
|--------|-------------|
| `companies` | enum `function` (CUSTOMER/SUPPLIER/ALL/OWN), enum `type` (TOO/IP/CHL) |
| `objects` | `companyId → Company`; join `company{id,name}`; фильтр `?companyId=` |
| `materials` | enum `type` (CONCRETE/SAND/GRAVEL/CEMENT/OTHER), `density` float |
| `constructions`, `delivery-methods`, `carriers` | `name`, `note` |
| `drivers` | `fullName` (не `name`) |
| `transports` | `plateNumber` @unique; join driver+carrier; фильтры `?carrierId=&driverId=` |
| `bsu` | `name`, `address`, `companyId → Company`; join `company{id,name}`; фильтр `?companyId=` |
| `nomenclatures` | `name` только |

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
| `/journal` | `views/applications-journal` | Реальный API, аккордеон с plumbLogs, кнопка «+ Взвешивание», refetchInterval 30s |
| `/plan` | `views/applications-plan` | Реальный API, список + календарный вид (неделя/день) |
| `/plan/add` | `PlanApplicationFormView` | Форма создания; пресет `?date=&time=` из URL |
| `/plan/view/[id]` | `PlanApplicationView` | Детали + прогресс-бар + журнал отвесов (строки кликабельны → /plumb/view/:id) |
| `/plan/edit/[id]` | `PlanApplicationFormView` | Предзаполненная форма |
| `/plumb` | `views/weighing-journal` | Журнал отвесов, реальный API, фильтры по датам/поставщику/материалу |
| `/plumb/new` | `PlumbLogFormView` | Форма создания отвеса (бетон с applicationId / сырьё без) |
| `/plumb/view/[id]` | `PlumbLogView` | Просмотр/редактирование отвеса, взвешивание тары/брутто |
| `/users` | `views/users` | Реальный API |
| `/dictionaries` | `views/dictionaries` | 10 табов (включая BSU и Nomenclature), реальный API |

### Модуль Заявок (Applications)

**Entity layer:**
- `entities/application/model/types.ts` — `Application`, `ApplicationStatus`, `APP_STATUS_LABEL`, `PlumbLogSummary`, `ApplicationProgress`, `CreateApplicationDto`, `ApplicationFilters`
- `entities/application/model/queryKeys.ts` — `applicationKeys.all/lists/list(filters)/detail(id)`
- `entities/application/api/applicationApi.ts` — `getApplications`, `getApplicationById`, `createApplication`, `updateApplication`, `completeApplication`, `deactivateApplication`

**`ApplicationForm`** (`features/applications/ui/ApplicationForm.tsx`):
- Props: `defaultValues?`, `onSubmit`, `isLoading?`, `submitLabel?`, `onCancel?`
- DatePicker: Popover + Calendar (react-day-picker v10, без `initialFocus`); конвертация YYYY-MM-DD ↔ local Date без UTC-сдвига через ручной `new Date(y, m-1, d)`
- TimePicker: два Select (часы 06–22, минуты 00/15/30/45) с иконкой Clock
- Объект зависит от заказчика: `enabled: !!customerId`, сброс через `useRef` (только при реальном изменении, не на mount)
- `deliveryDate` с бэкенда приходит как полная ISO-строка — всегда `.slice(0, 10)` перед использованием

**`ApplicationProgressBar`** (`features/applications/ui/ApplicationProgressBar.tsx`):
- Props: `shipped`, `loading`, `total`, `showText?`, `size?: 'sm'|'md'|'lg'`

**CalendarView** (внутри `ApplicationsPlanPage`):
- Сопоставление заявок: `app.deliveryDate.slice(0, 10) === dateStr` и `app.deliveryTime?.startsWith(slotHour + ':')`
- В календарном режиме `deliveryDate` фильтр не передаётся (загружаются все активные заявки)

### Модуль Отвесов (PlumbLog)

**Entity layer:**
- `entities/plumb-log/model/types.ts` — `PlumbLog`, `CreatePlumbLogDto`, `PlumbLogFilters`
- `entities/plumb-log/model/queryKeys.ts` — `plumbLogKeys.all/lists/list(filters)/detail(id)`
- `entities/plumb-log/api/plumbLogApi.ts` — `getPlumbLogs`, `getPlumbLogById`, `createPlumbLog`, `updatePlumbLog`, `weighTare`, `weighGross`, `createReturn`, `deactivatePlumbLog`
- `entities/bsu/` — `getBsuList`, `createBsu`, `updateBsu`, `deactivateBsu`
- `entities/nomenclature/` — `getNomenclatures`, `createNomenclature`, `updateNomenclature`

**`PlumbLogFormView`** (`views/weighing-journal/ui/PlumbLogFormView.tsx`):
- `isConcrete = !!applicationId` — два режима: бетон (привязан к заявке) / сырьё (без заявки)
- Бетон: поставщик/заказчик/материал/объект — ReadonlyField, автозаполняются из заявки
- Транспорт → автоподстановка водителя и перевозчика через `useEffect`
- Тара/брутто — отдельный `useState` + confirmed-состояния (кнопки «Взвесить тару» / «Взвесить брутто»)
- Прогресс-бар заявки вверху формы (только для бетона)
- Сабмит: `createPlumbLog` → если tare: `weighTare` → если gross: `weighGross` (последовательно)
- После создания бетона → `/plan/view/:applicationId`, сырья → `/plumb/view/:id`

**`PlumbLogView`** (`views/weighing-journal/ui/PlumbLogView.tsx`):
- Ждёт загрузки ВСЕХ списков перед рендером (`listsLoading`), чтобы Select сразу показывал labels
- `customers = suppliers` (все активные компании, без фильтра OWN)
- useForm `values` для синхронизации с серверными данными
- Кнопки взвешивания: заблокированы когда tare/gross уже заполнены

### DatePicker

Переиспользуемый компонент `shared/ui/date-picker-button.tsx`:
- Props: `value: string` (YYYY-MM-DD), `onChange`, `placeholder?`, `clearable?`, `className?`
- Используется везде вместо `<input type="date">`
- Тот же паттерн что в `ApplicationForm` (Popover + Calendar)

### Справочники (`/dictionaries`)

**Паттерн каждого таба** (`widgets/dictionaries/ui/*Tab.tsx`):
- debounce 300ms на поиск: `useEffect` + `setTimeout`
- `isActive = statusFilter === 'all' ? undefined : statusFilter === 'active'`
- `DictionarySheet` (`features/dictionaries/ui/DictionarySheet.tsx`) — Sheet для создания/редактирования
- `SearchableSelect` (`shared/ui/SearchableSelect.tsx`) — Popover + Command, debounce 300ms

---

## Database

```bash
docker compose up -d   # Поднять PostgreSQL
```

`DATABASE_URL` в `backend/.env`.

**Ключевая цепочка:** `Application` (заявка: заказчик → объект → материал → плановый объём) → `PlumbLog` (отвес: тара + брутто → нетто, привязка к транспорту и водителю).

**Основные модели:**
- **Application**: supplierId, customerId, objectId, materialId, constructionId?, deliveryMethodId?, authorId, targetVolume, deliveryDate, deliveryTime (HH:mm), loadingInterval, slumpCone, status (PENDING/IN_PROGRESS/COMPLETED/CANCELLED), isActive
- **PlumbLog**: applicationId?, supplierId, customerId, materialId, objectId?, transportId?, driverId?, carrierId?, constructionId?, bsuId?, nomenclatureId?, originalPlumbLogId?, tare (Int?), gross (Int?), net (Int?), volume (Float?), returnVolume?, sealNumber?, slumpCone?, deliveryType?, impurity?, cleanNet?, documentWeight?, firstWeighingAt, firstOperatorId?, secondWeighingAt, secondOperatorId?, isReturn, isActive
- **Bsu**: name, address?, companyId → Company, isActive
- **Nomenclature**: name, isActive
- **UserRole**: 18 значений — ADMIN, DEPUTY_DIRECTOR, SALES_HEAD, MANAGER, DISPATCHER, OPERATIONAL_DIRECTOR, LOGIST, LABORANT, FOUNDER, ACCOUNTANT, BSU_MASTER, SITE_MANAGER, OPERATOR, TECHNOLOGIST, FINANCIAL_DIRECTOR, FACTORY_DIRECTOR, SECURITY_HEAD, SECURITY_SPECIALIST
- **CompanyFunction**: CUSTOMER | SUPPLIER | ALL | OWN

---

## Dev Servers (.claude/launch.json)

```
Frontend (Next.js)  — npm run dev        — port 3000 (autoPort: true)
Backend  (NestJS)   — npm run start:dev  — port 3001
PostgreSQL (Docker) — docker compose up -d — port 5432
```
