# FIDA ERP — Project Context

## Что это
In-house ERP/CRM для компании FIDA (производство и доставка бетона). Цель — заменить сторонний подрядчик, перевести учёт отгрузок, логистику, печать накладных и аналитику во внутреннюю систему.

## Tech Stack
- **Backend**: NestJS + PostgreSQL + Prisma 7 (adapter pattern через `@prisma/adapter-pg`)
- **Frontend**: Next.js 16.2 (App Router), TypeScript, TailwindCSS v4, shadcn/ui (new-york)
- **State**: Zustand (auth), TanStack Query (server state), react-hook-form (формы)
- **Инфраструктура**: Docker Compose (PostgreSQL 15)
- **Монорепо**: `backend/` и `frontend/` в одном репозитории

## Архитектура Backend — Clean Architecture
```
src/
  domain/        # сущности, интерфейсы репозиториев (нет зависимостей от NestJS/Prisma)
  application/   # use cases / сервисы + DTOs
  infrastructure/# контроллеры, Prisma репозитории, модули NestJS
```

**Repository pattern (токены):**
```typescript
// domain: export const COMPANY_REPOSITORY = 'COMPANY_REPOSITORY'
// module:  { provide: COMPANY_REPOSITORY, useClass: PrismaCompanyRepository }
// service: @Inject(COMPANY_REPOSITORY) private repo: ICompanyRepository
```

**Prisma 7 особенности:**
- `url` вынесен из `schema.prisma` в `prisma.config.ts` (breaking change v7)
- `PrismaService` использует `PrismaClient as unknown as new() => PrismaClient` + `@prisma/adapter-pg`
- Seed-команда в `prisma.config.ts` → `migrations.seed`
- Использовать `npx prisma db push` (не `migrate dev` — из-за drift)

## Архитектура Frontend — Feature-Sliced Design (FSD)
```
src/
  app/      # Next.js App Router — роутинг, layout, providers, middleware
  views/    # FSD слой pages — страницы (named exports)
  widgets/  # самостоятельные блоки (Sidebar, Tab-виджеты)
  features/ # пользовательские сценарии (формы, действия)
  entities/ # бизнес-объекты: model/types.ts + api/*Api.ts + model/queryKeys.ts
  shared/   # shadcn UI (shared/ui/), утилиты, API client, store, types
```
> FSD слой pages называется `src/views/` (не конфликтует с Next.js Pages Router).

Импорт строго вниз: `widgets` → `features` → `entities` → `shared`.

---

## Схема БД (Prisma)

### Users & Auth
```
User
  id, fullName, login (unique), password (bcrypt), role, isActive, note
  → applications (Application[])
  → firstWeighings, secondWeighings (PlumbLog[])

enum UserRole: ADMIN | DEPUTY_DIRECTOR | SALES_HEAD | MANAGER | DISPATCHER
```

### Справочники (Dictionaries)
```
Company
  id, name, function (CompanyFunction), bin, type (CompanyType), contactPhone, isActive
  enum CompanyFunction: CUSTOMER | SUPPLIER | ALL
  enum CompanyType: TOO | IP | CHL

Object
  id, name, companyId → Company, address, receiverPhone, isActive

Material
  id, name, type (MaterialType), density (Float, т/м³), isActive
  enum MaterialType: CONCRETE | SAND | GRAVEL | CEMENT | OTHER

Construction   id, name, type, note, isActive
DeliveryMethod id, name, type, note, isActive
Carrier        id, name, note, isActive
Driver         id, fullName, isActive

Transport
  id, plateNumber (unique), driverId → Driver, carrierId → Carrier
  tare (Int, кг), tolerance (Float %, default 0), note, isActive
```

### Заявки (Applications)
```
Application
  id
  supplierId → Company, customerId → Company
  objectId → Object, materialId → Material
  constructionId → Construction (opt), deliveryMethodId → DeliveryMethod (opt)
  authorId → User
  targetVolume (Float, м³), deliveryDate, deliveryTime (HH:mm), loadingInterval (мин)
  slumpCone (Float), note
  status: PENDING | IN_PROGRESS | COMPLETED | CANCELLED
  isActive
```

### Отвесы (PlumbLog)
```
PlumbLog
  id
  applicationId → Application (opt)
  supplierId → Company, customerId → Company
  materialId → Material, objectId → Object (opt)
  transportId → Transport (opt), driverId → Driver (opt), carrierId → Carrier (opt)
  constructionId → Construction (opt)

  Вес: tare (Int), gross (Int?), net (Int?) = gross - tare

  Данные бетона: volume, returnVolume, sealNumber, slumpCone, bsuNumber, deliveryType
  Данные сырья:  impurity (%), cleanNet, documentWeight, nomenclature

  firstWeighingAt, firstOperatorId → User
  secondWeighingAt, secondOperatorId → User

  isActive, isReturn, createdAt, updatedAt
```

**Ключевая цепочка**: `Application` (заявка: заказчик → объект → материал → плановый объём) → `PlumbLog` (отвес: тара + брутто → нетто, привязка к транспорту и водителю).

---

## Что сделано

### Backend ✅

**Auth модуль**: JWT + bcrypt, `JwtAuthGuard`, `RolesGuard`, `@CurrentUser()`, `@Roles()`
- `POST /api/auth/login` → `{ accessToken, user }`, `GET /api/auth/me`

**Users модуль**: `GET/POST/PATCH/DELETE /api/users` (создание/редактирование — только `ADMIN | DEPUTY_DIRECTOR`)

**Справочники — 8 модулей** (полностью, Clean Architecture + token DI):

| Модуль | Эндпоинт | Особенности |
|--------|----------|-------------|
| Company | `/api/companies` | enum function/type; фильтры: isActive, search |
| Object | `/api/objects` | join `company{id,name}`; фильтр `?companyId=` |
| Material | `/api/materials` | enum type, density float |
| Construction | `/api/constructions` | name, type, note |
| DeliveryMethod | `/api/delivery-methods` | name, type, note |
| Carrier | `/api/carriers` | name, note |
| Driver | `/api/drivers` | fullName (не name) |
| Transport | `/api/transports` | plateNumber @unique; join driver+carrier; фильтры `?carrierId=&driverId=` |

Все справочники: `GET/POST /api/{entity}`, `PATCH /api/{entity}/:id`, `PATCH /api/{entity}/:id/deactivate`.
Параметры: `?isActive=true&search=` (case-insensitive). Soft delete (`isActive=false`).

**Applications модуль** (полностью):
- `GET /api/applications` — фильтры: `?deliveryDate=&status=&supplierId=&customerId=&materialId=&isActive=`
- `GET /api/applications/:id` — возвращает `progress: { shippedVolume, loadingVolume, remainVolume, totalPlumbs }` и `plumbLogs[]`
- `POST /api/applications` — `ADMIN | DEPUTY_DIRECTOR | SALES_HEAD | MANAGER`
- `PATCH /api/applications/:id` — те же роли
- `PATCH /api/applications/:id/complete` — `ADMIN | DEPUTY_DIRECTOR | DISPATCHER`
- `PATCH /api/applications/:id/deactivate` — `ADMIN | DEPUTY_DIRECTOR`

### Frontend ✅

**Инфраструктура**: `apiFetch`, Zustand auth store, middleware, TanStack QueryClient, Sonner Toaster

**Реализованные страницы:**

| Роут | Описание |
|------|----------|
| `/login` | Авторизация, реальный API |
| `/users` | CRUD пользователей, реальный API |
| `/dictionaries` | 8 табов справочников, реальный API |
| `/journal` | Журнал заявок: список на дату, аккордеон с plumbLogs, refetchInterval 30s |
| `/plan` | План заявок: список + календарный вид (неделя/день с навигацией) |
| `/plan/add` | Создание заявки; пресет `?date=&time=` из URL при клике в календаре |
| `/plan/view/[id]` | Детали заявки: прогресс-бар, журнал отвесов, кнопки завершить/деактивировать |
| `/plan/edit/[id]` | Редактирование заявки с предзаполнением |

**ApplicationForm** (`features/applications/ui/ApplicationForm.tsx`):
- Props: `defaultValues?`, `onSubmit`, `isLoading?`, `submitLabel?`, `onCancel?`
- DatePicker: Popover + Calendar (react-day-picker v10, без `initialFocus`)
- TimePicker: два Select (часы 06–22, минуты 00/15/30/45)
- Объект зависит от заказчика: сброс через `useEffect` при смене `customerId`
- `deliveryDate` с бэкенда — полная ISO-строка, всегда `.slice(0, 10)` перед использованием

**CalendarView** (внутри `ApplicationsPlanPage`):
- Сопоставление заявок по `app.deliveryDate.slice(0, 10)` и `app.deliveryTime?.startsWith(slotHour + ':')`
- В режиме календаря `deliveryDate` фильтр не передаётся — загружаются все активные заявки

---

## Что предстоит (по приоритету)
1. **Рабочее место весовщика** — журнал PlumbLog, ввод тары/брутто, расчёт нетто
2. **Печать ТТН** — HTML/CSS форма товарно-транспортной накладной
3. **Отчёты** — экспорт в Excel

---

## Правила кодирования

**Стили:** только CSS-переменные — `bg-background`, `bg-card`, `bg-background-elevated`, `text-foreground`, `text-muted-foreground`, `border-border`, `text-success`, `text-warning`, `text-destructive`, `text-primary`. Никаких `bg-gray-*`, `text-white`, хардкода цветов. Переменные `--success`, `--warning`, `--destructive` маппятся в Tailwind через `@theme inline` в `globals.css`.

**Таблицы:** всегда `overflow-x-auto`.

**Бизнес-логика** (нетто = брутто − тара): только в Domain/Application слое.

**Next.js pages:** `app/[route]/page.tsx` — тонкие, только импортируют из `src/views/`.

**Новые shadcn компоненты:** `npx shadcn@latest add <component>` из папки `frontend/`.

**Toast:** `import { toast } from 'sonner'` — не использовать `use-toast.ts`.

**Node.js PATH** (для bash-скриптов в этом проекте): `/opt/homebrew/opt/node@24/bin`.
