#!/usr/bin/env node
// ──────────────────────────────────────────────────────────────────────────────
// FIDA ERP — миграция пользователей из старой системы (fida2.gocart.kz) → новый API
//
//   node scripts/migrate-users.mjs \
//     --old-token "Bearer eyJ..." \
//     --login admin \
//     --password "admin1234"
//
// Env-альтернативы: OLD_TOKEN, NEW_LOGIN, NEW_PASSWORD, NEW_API_URL.
// Идемпотентен: существующие логины пропускаются без ошибки.
// ──────────────────────────────────────────────────────────────────────────────

const OLD_BASE = 'https://api.fida2.gocart.kz';
const NEW_BASE = process.env.NEW_API_URL ?? 'http://localhost:3001/api';
const DEFAULT_PASSWORD = 'test1234';

// ── Маппинг ролей: русское название → UserRole enum ───────────────────────────
const ROLE_MAP = {
  'Заместитель директора':      'DEPUTY_DIRECTOR',
  'Руководитель отдела продаж': 'SALES_HEAD',
  'Менеджер отдела продаж':     'MANAGER',
  'Диспетчер весовой':          'DISPATCHER',
  'Операционный директор':      'OPERATIONAL_DIRECTOR',
  'Логист':                     'LOGIST',
  'Лаборант':                   'LABORANT',
  'Учредитель / Основатель':    'FOUNDER',
  'Учредитель':                 'FOUNDER',
  'Основатель':                 'FOUNDER',
  'Бухгалтер':                  'ACCOUNTANT',
  'Мастер БСУ':                 'BSU_MASTER',
  'Прораб':                     'SITE_MANAGER',
  'Оператор':                   'OPERATOR',
  'Технолог':                   'TECHNOLOGIST',
  'Финансовый директор':        'FINANCIAL_DIRECTOR',
  'Директор завода':            'FACTORY_DIRECTOR',
  'Начальник охраны':           'SECURITY_HEAD',
  'Охранник':                   'SECURITY_SPECIALIST',
};

function mapRole(raw) {
  if (!raw) return 'OPERATOR';
  const key = String(raw).trim();
  return ROLE_MAP[key] ?? 'OPERATOR';
}

// ── Вытащить строку из поля, которое может быть строкой или объектом ──────────
function str(v) {
  if (v == null) return '';
  if (typeof v === 'object') return String(v.name ?? v.title ?? '').trim();
  return String(v).trim();
}

// ── Достать массив пользователей из ответа (форма заранее неизвестна) ─────────
function extractList(json) {
  if (Array.isArray(json)) return json;
  for (const k of ['data', 'items', 'results', 'rows', 'list', 'users']) {
    if (Array.isArray(json?.[k])) return json[k];
  }
  return [];
}

// ── Логин из пользователя старой системы ─────────────────────────────────────
function getLogin(r) {
  return str(r.login ?? r.username ?? r.user_login ?? r.email ?? '');
}

// ── Полное имя из пользователя старой системы ────────────────────────────────
function getFullName(r) {
  return str(r.fullname ?? r.full_name ?? r.fullName ?? r.name ?? '');
}

// ── Роль из пользователя старой системы ──────────────────────────────────────
function getRole(r) {
  // Роль может быть строкой или объектом { name: '...' }
  const raw = r.role ?? r.user_role ?? r.position ?? '';
  return mapRole(typeof raw === 'object' ? (raw?.name ?? '') : raw);
}

const log = (...a) => console.log(...a);

// ── Запрос к старому API ──────────────────────────────────────────────────────
async function fetchOldUsers(authHeader) {
  const url = `${OLD_BASE}/api/users?is_active=true&limit=100`;
  log(`\n  GET ${url}`);
  const res = await fetch(url, {
    headers: { Authorization: authHeader, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`GET старого API → HTTP ${res.status} ${res.statusText}`);
  const json = await res.json();
  return extractList(json);
}

// ── Авторизация в новой системе ───────────────────────────────────────────────
let NEW_TOKEN = null;

async function loginNew(login, password) {
  const res = await fetch(`${NEW_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login, password }),
  });
  if (!res.ok) throw new Error(`Логин не удался: HTTP ${res.status} ${res.statusText}`);
  const data = await res.json();
  if (!data.accessToken) throw new Error('В ответе логина нет accessToken');
  NEW_TOKEN = data.accessToken;
}

async function newGet(path) {
  const res = await fetch(`${NEW_BASE}${path}`, {
    headers: { Authorization: `Bearer ${NEW_TOKEN}`, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`GET ${path} → HTTP ${res.status}`);
  return res.json();
}

async function newPost(path, body) {
  const res = await fetch(`${NEW_BASE}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${NEW_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = Array.isArray(err.message) ? err.message.join('; ') : (err.message ?? res.statusText);
    throw new Error(`HTTP ${res.status}: ${msg}`);
  }
  return res.json();
}

// ── Главная логика ────────────────────────────────────────────────────────────
async function run(oldToken, newLogin, newPassword) {
  const authHeader = oldToken.startsWith('Bearer ') ? oldToken : `Bearer ${oldToken}`;

  // 1. Выгрузить пользователей из старой системы
  log('\n── ШАГ 1: Выгрузка пользователей из старой системы ──');
  const oldUsers = await fetchOldUsers(authHeader);
  log(`  Получено пользователей: ${oldUsers.length}`);

  if (oldUsers.length === 0) {
    log('  ⚠ Список пуст — проверь токен и эндпоинт старой системы.');
    process.exit(1);
  }

  // 2. Авторизоваться в новой системе
  log('\n── ШАГ 2: Авторизация в новой системе ──');
  await loginNew(newLogin, newPassword);
  log(`  ✓ Авторизован как «${newLogin}» в ${NEW_BASE}`);

  // 3. Загрузить существующих пользователей новой системы → Set логинов
  log('\n── ШАГ 3: Дедупликация — загружаем существующих пользователей ──');
  const existingRaw = await newGet('/users');
  const existingLogins = new Set(
    (Array.isArray(existingRaw) ? existingRaw : existingRaw?.data ?? [])
      .map((u) => String(u.login ?? '').trim().toLowerCase())
      .filter(Boolean)
  );
  log(`  Существующих логинов в новой системе: ${existingLogins.size}`);

  // 4. Создать пользователей
  log('\n── ШАГ 4: Создание пользователей ──\n');
  let created = 0, skipped = 0, errors = 0;
  const skippedReasons = [];
  const errorList = [];

  for (const r of oldUsers) {
    const login = getLogin(r);
    const fullName = getFullName(r);
    const role = getRole(r);

    // Пропустить если нет имени
    if (!fullName) {
      skipped++;
      const reason = `(id=${r.id ?? '?'}) пустое fullName — пропущен`;
      skippedReasons.push(reason);
      log(`  ↷ ${reason}`);
      continue;
    }

    // Пропустить если нет логина
    if (!login) {
      skipped++;
      const reason = `(id=${r.id ?? '?'}, «${fullName}») пустой login — пропущен`;
      skippedReasons.push(reason);
      log(`  ↷ ${reason}`);
      continue;
    }

    // Пропустить если логин уже есть в новой системе
    if (existingLogins.has(login.toLowerCase())) {
      skipped++;
      log(`  ↷ «${login}» уже существует — пропущен`);
      continue;
    }

    const dto = {
      login,
      fullName,
      password: DEFAULT_PASSWORD,
      role,
    };

    try {
      await newPost('/users', dto);
      existingLogins.add(login.toLowerCase());
      created++;
      log(`  ✓ создан: «${login}» / «${fullName}» / ${role}`);
    } catch (e) {
      errors++;
      const msg = `«${login}» / «${fullName}»: ${e.message}`;
      errorList.push(msg);
      log(`  ✗ ошибка: ${msg}`);
    }
  }

  // 5. Сводка
  log('\n══════════════ СВОДКА МИГРАЦИИ ПОЛЬЗОВАТЕЛЕЙ ══════════════');
  log(`  Всего в старой системе:   ${oldUsers.length}`);
  log(`  Создано:                  ${created}`);
  log(`  Пропущено:                ${skipped}`);
  log(`  Ошибок:                   ${errors}`);
  if (errorList.length) {
    log('\n  Ошибки:');
    for (const e of errorList) log(`    ✗ ${e}`);
  }
  log('════════════════════════════════════════════════════════════\n');

  if (errors > 0) process.exit(1);
}

// ── Парсинг аргументов ────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const opt = (name, env) => {
  const i = args.indexOf(name);
  if (i >= 0 && args[i + 1] && !args[i + 1].startsWith('--')) return args[i + 1];
  return env ? process.env[env] : undefined;
};

(async () => {
  const oldToken  = opt('--old-token', 'OLD_TOKEN');
  const newLogin  = opt('--login',     'NEW_LOGIN');
  const newPass   = opt('--password',  'NEW_PASSWORD');

  if (!oldToken || !newLogin || !newPass) {
    log(`
FIDA ERP — миграция пользователей из старой системы.

  node scripts/migrate-users.mjs \\
    --old-token "Bearer eyJ..." \\
    --login admin \\
    --password "admin1234"

Env-альтернативы: OLD_TOKEN, NEW_LOGIN, NEW_PASSWORD, NEW_API_URL.
`);
    process.exit(1);
  }

  try {
    await run(oldToken, newLogin, newPass);
  } catch (e) {
    log(`\n✗ Фатальная ошибка: ${e.message}`);
    process.exit(1);
  }
})();
