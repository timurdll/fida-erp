# FIDA ERP — Project Context

## Что это
In-house ERP/CRM для компании FIDA (производство и доставка бетона). Учёт заявок на поставку бетона/сырья, журнал отвесов (взвешиваний), справочники, аналитика.

## Tech Stack
- **Backend**: NestJS + PostgreSQL + Prisma 7 (`@prisma/adapter-pg`, `prisma.config.ts`)
- **Frontend**: Next.js 16.2 (App Router), TypeScript strict, TailwindCSS v4, shadcn/ui (new-york, slate)
- **State**: Zustand (auth), TanStack Query (server state), react-hook-form + Controller
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
// domain: export const PLUMB_LOG_REPOSITORY = 'PLUMB_LOG_REPOSITORY'
// module: { provide: PLUMB_LOG_REPOSITORY, useClass: PrismaPlumbLogRepository }
// service: constructor(@Inject(PLUMB_LOG_REPOSITORY) private repo: IPlumbLogRepository)
// ВАЖНО: интерфейс импортировать через `import type` отдельно от токена
```

**Prisma 7:**
- `url` в `prisma.config.ts`, не в `schema.prisma`
- `npx prisma db push` — синхронизация (НЕ migrate — есть drift)
- `npx prisma generate` — после изменений схемы

## Архитектура Frontend — Feature-Sliced Design (FSD)
```
src/
  app/      # Next.js App Router — роутинг, layout, providers, middleware (тонкие страницы)
  views/    # Page-level компоненты (named exports)
  widgets/  # самостоятельные блоки (Sidebar, Tab-виджеты)
  features/ # пользовательские сценарии (формы, действия)
  entities/ # бизнес-объекты: model/types.ts + api/*Api.ts + model/queryKeys.ts
  shared/   # shadcn UI, apiFetch, Zustand store, utils
```
Импорт строго вниз: `widgets` → `features` → `entities` → `shared`.

---

## Схема БД (актуальная)

### Users & Auth
```
User: id, fullName, login (unique), password (bcrypt), role (UserRole), isActive, note

enum UserRole (18 значений):
  ADMIN | DEPUTY_DIRECTOR | SALES_HEAD | MANAGER | DISPATCHER
  OPERATIONAL_DIRECTOR | LOGIST | LABORANT | FOUNDER | ACCOUNTANT
  BSU_MASTER | SITE_MANAGER | OPERATOR | TECHNOLOGIST | FINANCIAL_DIRECTOR
  FACTORY_DIRECTOR | SECURITY_HEAD | SECURITY_SPECIALIST
```

### Справочники
```
Company: id, name, function (CompanyFunction), bin, type (CompanyType), contactPhone, isActive
  enum CompanyFunction: CUSTOMER | SUPPLIER | ALL | OWN
  enum CompanyType: TOO | IP | CHL

Object: id, name, companyId → Company, address, receiverPhone, isActive

Material: id, name, type (MaterialType), density (Float, т/м³), isActive
  enum MaterialType: CONCRETE | SAND | GRAVEL | CEMENT | OTHER

Construction:   id, name, type, note, isActive
DeliveryMethod: id, name, type, note, isActive
Carrier:        id, name, note, isActive
Driver:         id, fullName, isActive   ← fullName, НЕ name
Transport:      id, plateNumber (unique), driverId → Driver, carrierId → Carrier, tare (Int), isActive

Bsu:         id, name, address?, companyId → Company, isActive
Nomenclature: id, name, isActive
```

### Заявки (Applications)
```
Application:
  supplierId → Company, customerId → Company
  objectId → Object, materialId → Material
  constructionId → Construction (opt), deliveryMethodId → DeliveryMethod (opt)
  authorId → User
  targetVolume (Float, м³), deliveryDate (DateTime), deliveryTime (HH:mm), loadingInterval (мин)
  slumpCone (Float), note
  status: PENDING | IN_PROGRESS | COMPLETED | CANCELLED
  isActive
```

### Отвесы (PlumbLog)
```
PlumbLog:
  applicationId → Application (opt)
  supplierId → Company, customerId → Company
  materialId → Material, objectId → Object (opt)
  transportId → Transport (opt), driverId → Driver (opt), carrierId → Carrier (opt)
  constructionId → Construction (opt)
  bsuId → Bsu (opt), nomenclatureId → Nomenclature (opt)
  originalPlumbLogId → PlumbLog (opt)  ← самореференция для возвратов

  Вес: tare (Int?), gross (Int?), net (Int?) = gross - tare  ← хранится для быстрой выборки

  Данные бетона:  volume (Float?), returnVolume (Float?), sealNumber, slumpCone, deliveryType
  Данные сырья:   impurity (Float?, %), cleanNet (Int?), documentWeight (Int?)

  firstWeighingAt (DateTime?), firstOperatorId → User
  secondWeighingAt (DateTime?), secondOperatorId → User

  isActive, isReturn, createdAt, updatedAt
```

---

## Что реализовано

### Backend ✅

**Auth**: JWT + bcrypt, `JwtAuthGuard`, `RolesGuard`, `@CurrentUser()`, `@Roles()`

**Users**: `GET/POST/PATCH/DELETE /api/users`

**Справочники (10 модулей, Clean Architecture)**:
companies, objects, materials, constructions, delivery-methods, carriers, drivers, transports, **bsu**, **nomenclatures**

**Applications**:
- `GET/POST /api/applications`
- `PATCH /api/applications/:id` + `/complete` + `/deactivate`
- `GET /api/applications/:id` → включает `progress{shippedVolume, loadingVolume, remainVolume, totalPlumbs}` и `plumbLogs[]`

**PlumbLogs**:
- `GET /api/plumb-logs` — фильтры: dateFrom, dateTo, isActive, isReturn, supplierId, customerId, materialId, applicationId; по умолчанию только сегодня
- `POST /api/plumb-logs` — создание
- `PATCH /api/plumb-logs/:id` — обновление полей
- `PATCH /api/plumb-logs/:id/weigh-tare` — взвешивание тары + firstWeighingAt + firstOperatorId
- `PATCH /api/plumb-logs/:id/weigh-gross` — взвешивание брутто + secondWeighingAt + secondOperatorId + пересчёт net
- `POST /api/plumb-logs/:id/return` — создаёт зеркальный отвес (swap supplier↔customer), isReturn=true
- `PATCH /api/plumb-logs/:id/deactivate`

### Frontend ✅

**Инфраструктура**: `apiFetch`, Zustand auth store, middleware, QueryClient, Sonner

**Реализованные страницы:**

| Роут | View | Описание |
|------|------|----------|
| `/login` | `views/login` | Авторизация |
| `/journal` | `views/applications-journal` | Журнал заявок: аккордеон, plumbLogs, кнопка «+ Взвешивание» |
| `/plan` | `views/applications-plan` | Plan заявок: список + календарь (неделя/день) |
| `/plan/add` | `PlanApplicationFormView` | Создание заявки |
| `/plan/view/[id]` | `PlanApplicationView` | Детали + прогресс + отвесы (кликабельны) |
| `/plan/edit/[id]` | `PlanApplicationFormView` | Редактирование заявки |
| `/plumb` | `views/weighing-journal` | Журнал отвесов, фильтры по датам/поставщику/материалу |
| `/plumb/new` | `PlumbLogFormView` | Создание отвеса (бетон / сырьё) |
| `/plumb/view/[id]` | `PlumbLogView` | Просмотр/редактирование отвеса |
| `/users` | `views/users` | Управление пользователями |
| `/dictionaries` | `views/dictionaries` | 10 табов справочников |

**Ключевые компоненты:**
- `ApplicationForm` — DatePicker (Popover+Calendar), TimePicker (Select часы/минуты), зависимый объект
- `ApplicationProgressBar` — props: shipped, loading, total, showText?, size?
- `PlumbLogFormView` — бетон (с заявкой) / сырьё; sequential API: create→weighTare→weighGross; прогресс-бар заявки вверху
- `PlumbLogView` — ждёт загрузки всех списков перед рендером (Selects сразу показывают labels)
- `DatePickerButton` (`shared/ui/date-picker-button.tsx`) — переиспользуемый date picker, заменяет `<input type="date">` везде
- `DictionarySheet`, `SearchableSelect` — паттерн справочников

---

## Правила кодирования

**Стили:** только CSS-переменные — `bg-background`, `bg-card`, `bg-background-elevated`, `text-foreground`, `text-muted-foreground`, `border-border`, `text-success`, `text-warning`, `text-destructive`, `text-primary`. Никаких `bg-gray-*`, `text-white`, хардкода цветов.

**Даты:**
- Хранятся как YYYY-MM-DD строки в форме
- С бэкенда всегда `.slice(0, 10)` перед использованием (ISO → date-only)
- Конвертация: `new Date(y, m-1, d)` (без UTC-сдвига)
- `DatePickerButton` использовать вместо `<input type="date">`

**Select + async данные:** форму рендерить только после загрузки всех списков опций (через `isLoading` флаги), иначе Radix Select показывает blank вместо label.

**Таблицы:** `overflow-x-auto`, строки с данными делать кликабельными (`cursor-pointer hover:bg-primary/5 onClick→router.push`).

**Бизнес-логика** (net = gross − tare): только в Domain/Application слое бэкенда.

**Next.js pages:** `app/[route]/page.tsx` — тонкие, только импортируют из `src/views/`.

**Toast:** `import { toast } from 'sonner'` — не использовать `use-toast.ts`.

**TypeScript:** после каждого изменения — `npx tsc --noEmit`.

**New shadcn компонент:** `npx shadcn@latest add <component>` из `frontend/`.

---

## Что предстоит (по приоритету)
1. **Печать ТТН** — HTML/CSS форма товарно-транспортной накладной (кнопка уже есть в PlumbLogView)
2. **Отчёты** — экспорт в Excel
3. **Страница /weighing** → уже переименована в `/plumb`, роут обновлён
