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

## Окружение и запуск

**Порты:** frontend `3000` (autoPort, если занят), backend `3001`, Postgres `5432`. API всегда под префиксом `/api` (`setGlobalPrefix('api')` в `main.ts`).

**Env (`.env` — не в git, есть `backend/.env.example` только с `DATABASE_URL`):**

| Файл | Переменная | Назначение / дефолт |
|------|-----------|---------------------|
| `backend/.env` | `DATABASE_URL` | строка подключения Postgres |
| | `JWT_SECRET` | обязателен для подписи/проверки токена |
| | `JWT_EXPIRES_IN` | TTL токена, дефолт `7d` |
| | `PORT` | дефолт `3001` |
| | `FRONTEND_URL` | origin для CORS, дефолт `http://localhost:3000` |
| `frontend/.env.local` | `NEXT_PUBLIC_API_URL` | базовый URL API, дефолт `http://localhost:3001/api` |

**Глобальный `ValidationPipe`** (`whitelist + forbidNonWhitelisted + transform`): тело POST/PATCH с полем, которого нет в DTO с декоратором `class-validator`, отклоняется **400**. Новое поле в body → обязательно свойство + декоратор в DTO. Query-параметры читаются вручную через `@Query('name')` и под whitelist не попадают.

**CORS:** origin = `FRONTEND_URL ?? http://localhost:3000`. ⚠️ Если фронт поднялся не на :3000 (autoPort при занятом порту) — запросы режет CORS. Держать фронт на :3000 или задать `FRONTEND_URL`.

**Тесты:** юнит-тестов фактически нет (на фронте нет `test`-скрипта; на бэке jest есть, но спеков нет кроме дефолтного). Верификация изменений — `npx tsc --noEmit` (backend и frontend) + ручная/preview-проверка. Dev-серверы обычно уже запущены (backend в watch-режиме).

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
- companies: фильтр `?function=` (CUSTOMER/SUPPLIER/ALL/OWN) — контроллерный параметр назван `fn`
- materials: фильтры `?excludeType=` (исключить тип) и `?filterType=` (только этот тип) — заявки используют `excludeType=OTHER`, форма сырья `filterType=OTHER`

**Applications**:
- `GET/POST /api/applications`
- `PATCH /api/applications/:id` + `/complete` + `/deactivate`
- `GET /api/applications/:id` → включает `progress{shippedVolume, loadingVolume, remainVolume, totalPlumbs}` и `plumbLogs[]`
- Автосинхронизация статуса (`updateStatus`) при взвешивании отвеса — см. ниже

**PlumbLogs**:
- `GET /api/plumb-logs` — фильтры: dateFrom, dateTo, isActive, isReturn, supplierId, customerId, materialId, applicationId, **standalone** (`true` → только сырьё, `applicationId IS NULL`); по умолчанию только сегодня
- `POST /api/plumb-logs` — создание
- `PATCH /api/plumb-logs/:id` — обновление полей
- `PATCH /api/plumb-logs/:id/weigh-tare` — взвешивание тары + firstWeighingAt + firstOperatorId; PENDING → IN_PROGRESS
- `PATCH /api/plumb-logs/:id/weigh-gross` — взвешивание брутто + secondWeighingAt + secondOperatorId + пересчёт net
  - **Защита от отрицательного нетто**: `BadRequestException` если `gross <= tare`
  - Автостатус заявки: PENDING → IN_PROGRESS; при `shipped >= target` → COMPLETED; COMPLETED/CANCELLED не трогаются
- `POST /api/plumb-logs/:id/return` — создаёт зеркальный отвес (swap supplier↔customer), isReturn=true
- `PATCH /api/plumb-logs/:id/deactivate`

**Reports** (`/api/reports/:type`, Clean Architecture, exceljs):
- 8 типов: `otvesy-detail`, `otvesy-summary`, `otvesy-deleted`, `otvesy-materials`, `zayavki-summary`, `zayavki-detail`, `zayavki-deleted`, `vozvrat`
- `?format=json` → нейтральный `ReportResult{title, columns[], rows[]}` для превью; иначе — `.xlsx` (StreamableFile)
- Фильтры: `dateFrom`, `dateTo` (обязательны), supplierId, customerId, materialId, carrierId, objectId, supplierType, customerType
- Роли: ADMIN, DEPUTY_DIRECTOR, ACCOUNTANT, FINANCIAL_DIRECTOR, FOUNDER
- ⚠️ TZ: `dateFrom/dateTo` приходят как ISO datetime без offset → `new Date()` трактует в TZ процесса Node; сервер должен работать в `TZ=Asia/Aqtobe` (фикс вне текущего объёма)

### Frontend ✅

**Инфраструктура**: `apiFetch`, Zustand auth store, middleware, QueryClient, Sonner

**Реализованные страницы:**

| Роут | View | Описание |
|------|------|----------|
| `/login` | `views/login` | Авторизация |
| `/journal` | `views/applications-journal` | Журнал заявок: аккордеон, plumbLogs, кнопка «+ Взвешивание» |
| `/plan` | `views/applications-plan` | Plan заявок: список + календарь (неделя/день); дата в URL `?date=`; печать плана; индикатор статуса |
| `/plan/add` | `PlanApplicationFormView` | Создание заявки |
| `/plan/view/[id]` | `PlanApplicationView` | Детали + прогресс + отвесы (кликабельны); кнопки по статусу |
| `/plan/edit/[id]` | `PlanApplicationFormView` | Редактирование заявки |
| `/plumb` | `views/weighing-journal` | Журнал отвесов (только сырьё — `standalone=true`; бетон виден через карточку заявки); фильтры по датам/поставщику/материалу |
| `/plumb/new` | `PlumbLogFormView` | Создание отвеса (бетон / сырьё) |
| `/plumb/view/[id]` | `PlumbLogView` | Просмотр/редактирование отвеса; динамические breadcrumbs `?backUrl=&backLabel=` |
| `/users` | `views/users` | Управление пользователями |
| `/dictionaries` | `views/dictionaries` | 10 табов справочников |
| `/reports` | `views/reports` | Отчёты: табы Отвесы/Заявки, фильтры по типу, превью + выгрузка в Excel (роль-gated в Sidebar) |

**Ключевые компоненты:**
- `ApplicationForm` — DatePicker (Popover+Calendar), TimePicker (Select часы/минуты), зависимый объект; фильтры: поставщик OWN, заказчик all, материал без OTHER; inline-создание Заказчика/Объекта
- `ApplicationProgressBar` — props: shipped, loading, total, showText?, size?
- `PlumbLogFormView` — бетон (с заявкой) / сырьё; sequential API: create→weighTare→weighGross; прогресс-бар заявки вверху; материалы сырья — `filterType=OTHER`; inline-создание (SearchableSelect + onCreateNew + CreateInlineDialog, `setValue` после создания, `key={field.value}` для ремоунта/подгрузки лейбла): Поставщик/Заказчик/Материал/Водитель/Транспорт/**Перевозчик**/Конструкция. Перевозчик автозаполняется из транспорта, но переопределяем
- `PlumbLogView` — ждёт загрузки всех списков перед рендером (Selects сразу показывают labels); режимы view/edit; Поставщик/Заказчик/Материал/Объект всегда read-only; кнопки действий (Редактировать/Печать ТТН/Изменить привязку/Возврат) — в шапке (в edit-режиме Сохранить/Отмена), внизу только «Удалить отвес» (danger-зона); диалог «Изменить привязку» (смена applicationId); печать `printTTN` (всегда) + `printAct` «Акт взвешивания» (только сырьё `!applicationId`, 2 копии на странице)
- `DatePickerButton` (`shared/ui/date-picker-button.tsx`) — переиспользуемый date picker, заменяет `<input type="date">` везде
- `DateTimePickerButton` (`shared/ui/date-time-picker-button.tsx`) — date + time picker
- `SearchableSelect` (`shared/ui/SearchableSelect.tsx`) — Popover+Command, server-side поиск (debounce 300ms); props `onCreateNew?`/`createLabel?` для inline-создания
- `CreateInlineDialog` (`shared/ui/create-inline-dialog.tsx`) — обёртка Radix Dialog для inline-форм создания
- `DictionarySheet` — Sheet создания/редактирования справочников

---

## Правила кодирования

**Стили:** только CSS-переменные — `bg-background`, `bg-card`, `bg-background-elevated`, `text-foreground`, `text-muted-foreground`, `border-border`, `text-success`, `text-warning`, `text-destructive`, `text-primary`. Никаких `bg-gray-*`, `text-white`, хардкода цветов.

**Даты:**
- Хранятся как YYYY-MM-DD строки в форме
- С бэкенда всегда `.slice(0, 10)` перед использованием (ISO → date-only)
- Конвертация: `new Date(y, m-1, d)` (без UTC-сдвига) — или `parseLocalDateString` из `shared/utils/date.ts`
- Форматирование Date → YYYY-MM-DD для API: использовать `toLocalDateString(date)` из `shared/utils/date.ts`
- НИКОГДА не использовать `date.toISOString().slice(0,10)` — даёт UTC-дату, сдвигает день на -1 для UTC+N ночью
- Исключение: полный `date.toISOString()` (с `Z`) для datetime-фильтров отчётов — там UTC корректен
- `DatePickerButton` использовать вместо `<input type="date">`

**Select + async данные:** форму рендерить только после загрузки всех списков опций (через `isLoading` флаги), иначе Radix Select показывает blank вместо label.

**Таблицы:** `overflow-x-auto`, строки с данными делать кликабельными (`cursor-pointer hover:bg-primary/5 onClick→router.push`).

**Бизнес-логика** (net = gross − tare): только в Domain/Application слое бэкенда.

**DTO (бэкенд):** глобальный `ValidationPipe` с `forbidNonWhitelisted` — каждое поле тела POST/PATCH должно быть описано в DTO с декоратором `class-validator`, иначе запрос падает с 400. Фильтры в GET обычно читаются через `@Query('name')` в контроллере (не через DTO) и прокидываются в `FindXxxFilter`.

**Next.js pages:** `app/[route]/page.tsx` — тонкие, только импортируют из `src/views/`.

**Toast:** `import { toast } from 'sonner'` — не использовать `use-toast.ts`.

**TypeScript:** после каждого изменения — `npx tsc --noEmit`.

**New shadcn компонент:** `npx shadcn@latest add <component>` из `frontend/`.

---

## Что предстоит (по приоритету)
1. **TZ отчётов** — сервер отчётов должен работать в `TZ=Asia/Aqtobe` (или фронт слать дату с offset), иначе выборка по `firstWeighingAt` смещается
2. **Возвраты** — UI-поток создания возвратного отвеса (бэкенд `POST /api/plumb-logs/:id/return` готов)

## Сделано недавно
- ✅ **Журнал отвесов — только сырьё** — `standalone=true` в `GET /api/plumb-logs` (`applicationId IS NULL`); бетон виден через карточку заявки
- ✅ **Материалы `filterType`** — симметричный `excludeType` параметр; форма сырья показывает только `type=OTHER`
- ✅ **Inline-создание в форме сырья** — кнопка `+` на полях Поставщик/Заказчик/Материал/Водитель/Транспорт/Перевозчик
- ✅ **Акт взвешивания** — `printAct` (только сырьё, 2 копии); кнопки `PlumbLogView` перенесены в шапку, внизу только «Удалить отвес»
- ✅ **Отчёты** — 8 типов, превью + выгрузка в Excel (`/reports`, `/api/reports/:type`)
- ✅ **Печать ТТН** — `printTTN` в `PlumbLogView`; печать плана заявок — `views/applications-plan/lib/printPlan.ts`
- ✅ **Фикс UTC-сдвига дат** — `shared/utils/date.ts` (`toLocalDateString`/`parseLocalDateString`)

## Легаси / дубли
- `/weighing` — алиас, рендерит тот же `WeighingJournalPage`, что и канонический `/plumb`
- `views/weighing-record/WeighingRecordPage` — старый мок с хардкод-данными, не подключён к роутингу
