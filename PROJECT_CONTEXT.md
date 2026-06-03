# FIDA ERP — Project Context

## Что это
In-house ERP/CRM для компании FIDA (производство и доставка бетона). Цель — заменить сторонний подрядчик, перевести учёт отгрузок, логистику, печать накладных и аналитику во внутреннюю систему. Срок: 1.5 месяца.

## Tech Stack
- **Backend**: NestJS + PostgreSQL + Prisma 7 (adapter pattern через `@prisma/adapter-pg`)
- **Frontend**: Next.js 16.2 (App Router), TypeScript, TailwindCSS v4, shadcn/ui (new-york)
- **Инфраструктура**: Docker Compose (PostgreSQL 15)
- **Монорепо**: `backend/` и `frontend/` в одном репозитории

## Архитектура Backend — Clean Architecture
```
src/
  domain/        # сущности, интерфейсы репозиториев (нет зависимостей от NestJS/Prisma)
  application/   # use cases / сервисы
  infrastructure/# контроллеры, Prisma репозитории, модули NestJS
```

## Архитектура Frontend — Feature-Sliced Design (FSD)
```
src/
  app/      # Next.js App Router — только роутинг, тонкие page.tsx файлы
  views/    # FSD слой pages — композиции страниц (named exports)
  widgets/  # самостоятельные блоки (Sidebar, таблицы)
  features/ # пользовательские сценарии
  entities/ # бизнес-объекты
  shared/   # shadcn компоненты (src/shared/ui/), утилиты, типы
```
> Важно: FSD слой pages называется `src/views/` (переименован, чтобы не конфликтовать с Next.js Pages Router).

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
  → objects (Object[])
  → supplierApps, customerApps (Application[])
  → supplierPlumbs, customerPlumbs (PlumbLog[])

Object
  id, name, companyId → Company, address, receiverPhone, isActive
  → applications (Application[])
  → plumbLogs (PlumbLog[])

Material
  id, name, type (MaterialType), density (Float, т/м³), isActive
  enum MaterialType: CONCRETE | SAND | GRAVEL | CEMENT | OTHER
  → applications, plumbLogs

Construction
  id, name, type, note, isActive
  → applications, plumbLogs

DeliveryMethod
  id, name (способ приёмки), type, note, isActive
  → applications

Carrier   id, name, note, isActive  → transports, plumbLogs
Driver    id, fullName, isActive     → transports, plumbLogs

Transport
  id, plateNumber (unique), driverId → Driver, carrierId → Carrier
  tare (Int, кг), tolerance (Float %, default 0), note, isActive
  → plumbLogs
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
  status (ApplicationStatus): PENDING | IN_PROGRESS | COMPLETED | CANCELLED
  isActive
  → plumbLogs (PlumbLog[])
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

  Вес:
    tare (Int, кг), gross (Int?, кг), net (Int?) = gross - tare

  Данные бетона:
    volume (м³), returnVolume, sealNumber, slumpCone, bsuNumber, deliveryType

  Данные сырья (песок/щебень):
    impurity (%), cleanNet, documentWeight, nomenclature

  Взвешивания:
    firstWeighingAt, firstOperatorId → User
    secondWeighingAt, secondOperatorId → User

  isActive, isReturn (возврат), createdAt, updatedAt
```

**Ключевая цепочка**: `Application` (заявка: заказчик → объект → материал → плановый объём) → `PlumbLog` (отвес: тара + брутто → нетто = брутто − тара, привязка к транспорту и водителю).

---

## Что уже сделано

### Backend ✅
- Docker Compose + PostgreSQL 15
- Prisma 7 с `prisma.config.ts` + `@prisma/adapter-pg` (Prisma 7 breaking change: url вынесен из schema.prisma)
- `PrismaService` с паттерном `PrismaClient as unknown as new() => PrismaClient`
- **Auth модуль** (полностью):
  - JWT аутентификация (`@nestjs/jwt` + `passport-jwt`)
  - `JwtAuthGuard`, `RolesGuard`, `@CurrentUser()` декоратор
  - `JwtModule.registerAsync()` через `ConfigService` (важно: не `.register()` — env не успевает загрузиться)
  - Роли: `ADMIN`, `DEPUTY_DIRECTOR`, `SALES_HEAD`, `MANAGER`, `DISPATCHER`
  - `POST /api/auth/login` → возвращает `{ access_token, user }`
  - `GET /api/auth/me` → текущий пользователь (защищён JWT)
- `ConfigModule` глобальный, `ValidationPipe` с whitelist+transform
- CORS для `localhost:3000`, API prefix `/api`, порт 3001

### Frontend ✅
- Next.js 16.2 + TailwindCSS v4 + shadcn/ui (56 компонентов в `shared/ui/`)
- Тёмная тема (строго dark mode), цвета через CSS-переменные в `globals.css` — **не хардкодить**
- Sidebar с навигацией (5 пунктов)
- **Auth на фронте** (полностью):
  - `apiFetch` (`shared/api/client.ts`) — lazy-load токена из Zustand, `Authorization: Bearer`, при 401 → `clearAuth()` + redirect `/login`
  - `useAuthStore` (Zustand + `persist`) — хранит `token + user` в localStorage, синхронизирует cookie `is_authed=1` для middleware
  - `middleware.ts` — Next.js middleware: нет cookie → redirect `/login`; авторизован и на `/login` → redirect `/journal`
  - `loginApi` (`shared/api/auth.ts`) — `POST /api/auth/login`
  - `isAdmin()` — проверяет роли `ADMIN | DEPUTY_DIRECTOR`
- Все страницы как UI-заглушки (моковые данные, без подключения к API):
  - `/login` — форма входа (подключена к реальному API)
  - `/journal` — журнал заявок (таблица с прогрессом)
  - `/plan` — план заявок (недельный календарь)
  - `/weighing` — журнал отвесов
  - `/weighing/[id]` — карточка отвеса (тара/брутто → нетто)
  - `/users` — управление пользователями
  - `/dictionaries` — справочники (Tabs: компании, объекты, материалы, транспорт, водители...)

---

## Что предстоит (по приоритету)
1. **Модуль Справочников** — CRUD для Company, Object, Material, Driver, Transport, Carrier, Construction, DeliveryMethod (бэк + фронт)
2. **Модуль Заявок** — CRUD Applications, дашборд прогресса
3. **Рабочее место весовщика** — журнал PlumbLog, ввод тары/брутто, расчёт нетто
4. **Печать ТТН** — HTML/CSS форма товарно-транспортной накладной
5. **Отчёты** — экспорт в Excel

---

## Правила кодирования
- **Цвета**: только `bg-background`, `text-foreground`, `bg-muted`, `border-border`, `text-muted-foreground` и т.д. Никаких `bg-gray-900`, `text-white`
- **Таблицы**: всегда с горизонтальным скроллом (`overflow-x-auto`)
- **Бизнес-логика** (нетто = брутто - тара): только в Domain/Application слое, не в контроллере
- **Next.js pages**: файлы `app/[route]/page.tsx` — тонкие, только импортируют из `src/views/`
- **Новые shadcn компоненты**: `npx shadcn@latest add <component>` из папки `frontend/`
