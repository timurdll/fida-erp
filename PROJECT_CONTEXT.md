# FIDA ERP — Project Context

## Что это
In-house ERP/CRM для компании FIDA (производство и доставка бетона). Цель — заменить сторонний подрядчик, перевести учёт отгрузок, логистику, печать накладных и аналитику во внутреннюю систему. Срок: 1.5 месяца.

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
  entities/ # бизнес-объекты: model/types.ts + api/*Api.ts
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

## Что уже сделано

### Backend ✅

**Инфраструктура:**
- Docker Compose + PostgreSQL 15, все таблицы созданы через `prisma db push`
- Seed: `npx prisma db seed` → создаёт `admin / admin1234` (роль ADMIN)

**Auth модуль** (полностью):
- JWT + bcrypt, `JwtAuthGuard`, `RolesGuard`, `@CurrentUser()`, `@Roles()`
- `POST /api/auth/login` → `{ accessToken, user }`, `GET /api/auth/me`

**Users модуль:**
- `GET/POST/PATCH/DELETE /api/users`
- Создание/редактирование — только `ADMIN | DEPUTY_DIRECTOR`

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
Запись/деактивация: только `ADMIN | DEPUTY_DIRECTOR`.

### Frontend ✅

**Инфраструктура:**
- `apiFetch` (`shared/api/client.ts`) — JWT Bearer из Zustand, при 401 → clearAuth + redirect
- `useAuthStore` (Zustand persist) — токен в localStorage + cookie `is_authed=1` для middleware
- `middleware.ts` — защита всех роутов по cookie
- `Providers` в layout — TanStack QueryClient + Sonner Toaster
- Sonner: `import { toast } from 'sonner'`

**Auth:**
- `/login` → реальный API, toast при ошибке
- Sidebar показывает имя/логин текущего пользователя, кнопка выхода работает

**Users (`/users`):**
- Реальный API: список, создание (Dialog + react-hook-form), деактивация
- Кнопка «Добавить» видна только `ADMIN | DEPUTY_DIRECTOR`

**Справочники (`/dictionaries`)** — 8 табов, все подключены к реальному API:

Компании | Объекты | Материалы | Конструкция | Способ приёмки | Перевозчик | **Водители** | Транспорт

Каждый таб (`widgets/dictionaries/ui/*Tab.tsx`):
- debounce 300ms на поиск, фильтр по статусу
- Skeleton при загрузке, `overflow-x-auto`
- Клик по строке → Sheet редактирования
- DropdownMenu: Редактировать / Деактивировать

Формы (`features/dictionaries/ui/*Form.tsx`) — react-hook-form, предзаполнение при редактировании.

`DictionarySheet` (`features/dictionaries/ui/DictionarySheet.tsx`) — переиспользуемая Sheet-обёртка. Запуск сабмита: `formRef.current?.requestSubmit()`.

`SearchableSelect` (`shared/ui/SearchableSelect.tsx`) — Popover + Command, debounce 300ms. Используется в ObjectForm (companyId) и TransportForm (driverId, carrierId).

---

## Что предстоит (по приоритету)
1. **Модуль Заявок** — CRUD Applications, дашборд прогресса (бэк + фронт)
2. **Рабочее место весовщика** — журнал PlumbLog, ввод тары/брутто, расчёт нетто
3. **Печать ТТН** — HTML/CSS форма товарно-транспортной накладной
4. **Отчёты** — экспорт в Excel

---

## Правила кодирования

**Стили:** только CSS-переменные — `bg-background`, `bg-card`, `bg-background-elevated`, `text-foreground`, `text-muted-foreground`, `border-border`, `text-success`, `text-destructive`, `text-primary`. Никаких `bg-gray-*`, `text-white`, хардкода цветов.

**Таблицы:** всегда `overflow-x-auto`.

**Бизнес-логика** (нетто = брутто − тара): только в Domain/Application слое.

**Next.js pages:** `app/[route]/page.tsx` — тонкие, только импортируют из `src/views/`.

**Новые shadcn компоненты:** `npx shadcn@latest add <component>` из папки `frontend/`.

**Toast:** `import { toast } from 'sonner'` — не использовать `use-toast.ts`.

**Node.js PATH** (для bash-скриптов в этом проекте): `/opt/homebrew/opt/node@24/bin`.
