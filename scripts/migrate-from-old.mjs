#!/usr/bin/env node
// ──────────────────────────────────────────────────────────────────────────────
// FIDA ERP — миграция справочников из старой системы (fida2.gocart.kz) → новый API
//
//   Этап 1 (экспорт):  node scripts/migrate-from-old.mjs --export --token "Bearer eyJ..."
//   Этап 2 (импорт):   node scripts/migrate-from-old.mjs --import --login admin --password "..."
//   Самотест мапперов: node scripts/migrate-from-old.mjs --selftest
//
// Токен старой системы и креды новой можно передать и через env:
//   OLD_TOKEN, NEW_LOGIN, NEW_PASSWORD, NEW_API_URL (дефолт http://localhost:3001/api)
//
// Импорт идемпотентен: перед созданием сущность ищется по имени (префетч полного
// списка), дубликаты не создаются — скрипт можно перезапускать.
// ──────────────────────────────────────────────────────────────────────────────

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'migration-data');

const OLD_BASE = 'https://api.fida2.gocart.kz';
const NEW_BASE = process.env.NEW_API_URL ?? 'http://localhost:3001/api';

// ── Источники старого API (ключ → путь + имя файла) ───────────────────────────
const SOURCES = {
  companies:       '/api/company/get',
  objects:         '/api/object/get',
  materials:       '/api/material/get',
  constructions:   '/api/construction/get',
  receive_methods: '/api/receive_method/get',
  carriers:        '/api/carrier/get',
  transports:      '/api/transport/get',
  drivers:         '/api/driver/get',
};

// ──────────────────────────────────────────────────────────────────────────────
// Маппинги (заполнены из реальных enum/DTO новой системы)
//   CompanyType:     TOO | IP | CHL
//   CompanyFunction: CUSTOMER | SUPPLIER | ALL | OWN   (CARRIER нет)
//   MaterialType:    CONCRETE | SAND | GRAVEL | CEMENT | OTHER
// ──────────────────────────────────────────────────────────────────────────────
const COMPANY_TYPE = {
  'ТОО': 'TOO', 'ИП': 'IP', 'ЧЛ': 'CHL',
  'АО': 'TOO',     // в новом enum нет АО — ближайшее юрлицо TOO
  'Филиал': 'TOO', // филиал → TOO
  TOO: 'TOO', IP: 'IP', CHL: 'CHL',
};
const COMPANY_FUNC = {
  'Поставщик': 'SUPPLIER',
  'Заказчик': 'CUSTOMER',
  'Наша': 'OWN', // собственное юрлицо FIDA → OWN
  'Перевозчик': 'ALL', // в новом enum нет CARRIER; перевозчики мигрируют отдельно из /carrier
  'Все': 'ALL',
  SUPPLIER: 'SUPPLIER', CUSTOMER: 'CUSTOMER', ALL: 'ALL', OWN: 'OWN',
};

// ── helpers ───────────────────────────────────────────────────────────────────
const log = (...a) => console.log(...a);
const norm = (s) => String(s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
const idKey = (v) => (v == null ? '' : String(v));

/** Прочитать строку из значения, которое может быть строкой или объектом {name}. */
function readStr(v) {
  if (v == null) return '';
  if (typeof v === 'object') return String(v.name ?? '').trim();
  return String(v).trim();
}

/** Достать массив записей и total из ответа старого API (форма заранее неизвестна). */
function extractList(json) {
  if (Array.isArray(json)) return { list: json, total: null };
  const listKeys = ['data', 'items', 'results', 'rows', 'list', 'objects'];
  let list = [];
  for (const k of listKeys) {
    if (Array.isArray(json?.[k])) { list = json[k]; break; }
  }
  const totalKeys = ['total', 'count', 'totalCount', 'total_count'];
  let total = null;
  for (const k of totalKeys) {
    if (typeof json?.[k] === 'number') { total = json[k]; break; }
  }
  if (total == null && typeof json?.meta?.total === 'number') total = json.meta.total;
  return { list, total };
}

function mapCompanyType(s) { return COMPANY_TYPE[String(s ?? '').trim()] ?? 'TOO'; }
function mapCompanyFunc(s) { return COMPANY_FUNC[String(s ?? '').trim()] ?? 'ALL'; }
function mapMaterialType(r) {
  const mt = r?.material_type ?? {};
  return mt.is_for_dependent ? 'CONCRETE' : 'OTHER'; // сырьё/independent → OTHER
}

// ── transform: old record → new create-DTO (чистые функции, проверяются в --selftest) ──
function transformCompany(r) {
  const dto = {
    name: readStr(r.name),
    function: mapCompanyFunc(readStr(r.company_func)),
    type: mapCompanyType(readStr(r.company_type)),
  };
  const bin = r.bin != null ? String(r.bin).trim() : '';
  if (bin) dto.bin = bin;
  const phone = r.contact_number != null ? String(r.contact_number).trim() : '';
  if (phone) dto.contactPhone = phone;
  return dto;
}
function transformDriver(r) { return { fullName: readStr(r.name) }; }
function transformCarrier(r) {
  const dto = { name: readStr(r.name) };
  const note = r.note != null ? String(r.note).trim() : '';
  if (note) dto.note = note;
  return dto;
}
function transformMaterial(r) {
  const dto = { name: readStr(r.name), type: mapMaterialType(r) };
  const density = Number(r.density);
  if (Number.isFinite(density) && density > 0) dto.density = density;
  return dto;
}
function transformConstruction(r) {
  const dto = { name: readStr(r.name) };
  const type = readStr(r.construction_type);
  if (type) dto.type = type;
  const note = r.description != null ? String(r.description).trim() : '';
  if (note) dto.note = note;
  return dto;
}
function transformReceiveMethod(r) { return { name: readStr(r.name) }; }
function transformObject(r, companyMap) {
  const newCompanyId = companyMap.get(idKey(r.company_id));
  if (newCompanyId == null) return null; // нет компании-владельца → пропустить
  const dto = { name: readStr(r.name), companyId: newCompanyId };
  const address = r.address != null ? String(r.address).trim() : '';
  if (address) dto.address = address;
  const phone = r.receiver_phone ?? r.receiver_number ?? r.contact_number;
  if (phone != null && String(phone).trim()) dto.receiverPhone = String(phone).trim();
  return dto;
}
function transformTransport(r, carrierMap, driverMap) {
  const plateNumber = readStr(r.plate_number);
  if (!plateNumber) return null;
  const dto = { plateNumber };
  const tare = Number(r.tare);
  if (Number.isFinite(tare) && tare >= 0) dto.tare = Math.round(tare);
  const tol = Number(r.admissible_error);
  if (Number.isFinite(tol) && tol >= 0) dto.tolerance = tol;
  const carrierId = carrierMap.get(idKey(r.carrier_id));
  if (carrierId != null) dto.carrierId = carrierId;
  const driverId = driverMap.get(idKey(r.driver_id));
  if (driverId != null) dto.driverId = driverId;
  return dto;
}

// ──────────────────────────────────────────────────────────────────────────────
// ЭТАП 1 — ЭКСПОРТ
// ──────────────────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchOld(pathname, params, authHeader, attempts = 4) {
  const url = new URL(OLD_BASE + pathname);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  let lastErr;
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(url, { headers: { Authorization: authHeader, Accept: 'application/json' } });
      if (res.status >= 500) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      if (!res.ok) throw new Error(`GET ${url.pathname} → HTTP ${res.status} ${res.statusText}`); // 4xx — не ретраим
      return await res.json();
    } catch (e) {
      lastErr = e;
      // 4xx — фатально, не ретраим
      if (/HTTP 4\d\d/.test(e.message)) throw e;
      if (i < attempts) {
        const backoff = 1000 * 2 ** (i - 1); // 1s, 2s, 4s
        log(`    ⟳ повтор ${i}/${attempts - 1} через ${backoff}ms (${e.message})`);
        await sleep(backoff);
      }
    }
  }
  throw lastErr;
}

async function runExport(token, limit, only) {
  const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
  await mkdir(DATA_DIR, { recursive: true });
  const entries = only ? Object.entries(SOURCES).filter(([k]) => only.has(k)) : Object.entries(SOURCES);
  log(`\n── ЭКСПОРТ из ${OLD_BASE} (limit=${limit}) → ${DATA_DIR} ──`);
  if (only) log(`   только: ${[...only].join(', ')}`);
  log('');

  for (const [key, pathname] of entries) {
    const all = [];
    let total = null;
    let offset = 0;
    try {
      while (true) {
        const json = await fetchOld(pathname, { is_active: true, limit, offset }, authHeader);
        const { list, total: t } = extractList(json);
        if (t != null) total = t;
        all.push(...list);
        log(`  ${key}: ${all.length}/${total ?? '?'}...`);
        if (list.length < limit) break;
        if (total != null && all.length >= total) break;
        offset += limit;
        if (offset > 200000) { log(`  ⚠ ${key}: достигнут предохранитель offset`); break; }
      }
      const file = path.join(DATA_DIR, `${key}.json`);
      await writeFile(file, JSON.stringify(all, null, 2), 'utf8');
      const totalNote = total != null && all.length !== total ? ` ⚠ ожидалось ${total}` : '';
      log(`  ✓ ${key}: сохранено ${all.length} записей${totalNote}\n`);
    } catch (e) {
      log(`  ✗ ${key}: ОШИБКА экспорта — ${e.message}\n`);
    }
  }
  log('Экспорт завершён.\n');
}

// ──────────────────────────────────────────────────────────────────────────────
// ЭТАП 2 — ИМПОРТ
// ──────────────────────────────────────────────────────────────────────────────
let NEW_TOKEN = null;

async function newLogin(login, password) {
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

async function apiGet(pathname) {
  const res = await fetch(`${NEW_BASE}${pathname}`, {
    headers: { Authorization: `Bearer ${NEW_TOKEN}`, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`GET ${pathname} → HTTP ${res.status}`);
  return res.json();
}
async function apiPost(pathname, body) {
  const res = await fetch(`${NEW_BASE}${pathname}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${NEW_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = Array.isArray(err.message) ? err.message.join('; ') : err.message;
    throw new Error(`HTTP ${res.status}: ${msg ?? res.statusText}`);
  }
  return res.json();
}

async function readData(key) {
  const file = path.join(DATA_DIR, `${key}.json`);
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    throw new Error(`нет/нечитаем файл ${path.relative(process.cwd(), file)} (сначала запусти --export)`);
  }
}

// Порядок важен: зависимости идут после своих "родителей".
const ENTITIES = [
  { key: 'drivers',         label: 'Водители',       apiPath: '/drivers',          keyField: 'fullName',    transform: (r) => transformDriver(r) },
  { key: 'companies',       label: 'Компании',       apiPath: '/companies',        keyField: 'name',        transform: (r) => transformCompany(r) },
  { key: 'carriers',        label: 'Перевозчики',    apiPath: '/carriers',         keyField: 'name',        transform: (r) => transformCarrier(r) },
  { key: 'materials',       label: 'Материалы',      apiPath: '/materials',        keyField: 'name',        transform: (r) => transformMaterial(r) },
  { key: 'constructions',   label: 'Конструкции',    apiPath: '/constructions',    keyField: 'name',        transform: (r) => transformConstruction(r) },
  { key: 'receive_methods', label: 'Способы приёмки',apiPath: '/delivery-methods', keyField: 'name',        transform: (r) => transformReceiveMethod(r) },
  { key: 'objects',         label: 'Объекты',        apiPath: '/objects',          keyField: 'name',        transform: (r, ctx) => transformObject(r, ctx.maps.companies) },
  { key: 'transports',      label: 'Транспорт',      apiPath: '/transports',       keyField: 'plateNumber', transform: (r, ctx) => transformTransport(r, ctx.maps.carriers, ctx.maps.drivers) },
];

async function importEntity(def, ctx) {
  log(`\n── ${def.label} (${def.key}) ──`);
  const records = await readData(def.key);

  // Префетч существующих → дедуп по имени (идемпотентность/перезапуск)
  const existing = await apiGet(def.apiPath);
  const existingByKey = new Map();
  for (const e of existing) {
    const k = norm(e[def.keyField]);
    if (k) existingByKey.set(k, e.id);
  }

  const idMap = new Map(); // oldId → newId
  ctx.maps[def.key] = idMap;

  let created = 0, skipped = 0, errors = 0;

  for (const r of records) {
    const oldId = r.id ?? r._id;
    let dto;
    try {
      dto = def.transform(r, ctx);
    } catch (e) {
      errors++; log(`  ✗ маппинг (oldId=${oldId}): ${e.message}`); continue;
    }
    if (dto === null) { skipped++; continue; } // пропуск (напр. объект без компании)

    const k = norm(dto[def.keyField]);
    if (!k) { skipped++; log(`  ↷ пропуск (oldId=${oldId}): пустое поле «${def.keyField}»`); continue; }

    if (existingByKey.has(k)) {
      const nid = existingByKey.get(k);
      if (oldId != null) idMap.set(idKey(oldId), nid);
      skipped++;
      continue;
    }

    try {
      const res = await apiPost(def.apiPath, dto);
      existingByKey.set(k, res.id);
      if (oldId != null) idMap.set(idKey(oldId), res.id);
      created++;
    } catch (e) {
      errors++;
      log(`  ✗ создание (oldId=${oldId}, «${dto[def.keyField]}»): ${e.message}`);
    }
  }

  log(`  Итог ${def.label}: создано ${created}, пропущено ${skipped}, ошибок ${errors} (всего ${records.length})`);
  return { created, skipped, errors, total: records.length };
}

async function runImport(login, password) {
  log(`\n── ИМПОРТ в ${NEW_BASE} ──`);
  await newLogin(login, password);
  log(`  ✓ авторизован как «${login}»`);

  const ctx = { maps: {} };
  const summary = {};
  for (const def of ENTITIES) {
    try {
      summary[def.key] = await importEntity(def, ctx);
    } catch (e) {
      log(`  ✗ ${def.label}: пропущена целиком — ${e.message}`);
      summary[def.key] = { created: 0, skipped: 0, errors: 0, total: 0, fatal: e.message };
    }
  }

  log('\n══════════════ СВОДКА ИМПОРТА ══════════════');
  let C = 0, S = 0, E = 0;
  for (const def of ENTITIES) {
    const s = summary[def.key] ?? {};
    C += s.created ?? 0; S += s.skipped ?? 0; E += s.errors ?? 0;
    const fatal = s.fatal ? `  [ПРОПУЩЕНО: ${s.fatal}]` : '';
    log(`  ${def.label.padEnd(16)} создано ${String(s.created ?? 0).padStart(4)} | пропущено ${String(s.skipped ?? 0).padStart(4)} | ошибок ${String(s.errors ?? 0).padStart(4)}${fatal}`);
  }
  log('  ───────────────────────────────────────────');
  log(`  ИТОГО            создано ${String(C).padStart(4)} | пропущено ${String(S).padStart(4)} | ошибок ${String(E).padStart(4)}`);
  log('════════════════════════════════════════════\n');
}

// ──────────────────────────────────────────────────────────────────────────────
// SELFTEST — оффлайн-проверка мапперов (без сети)
// ──────────────────────────────────────────────────────────────────────────────
function runSelftest() {
  let pass = 0, fail = 0;
  const eq = (name, got, exp) => {
    const ok = JSON.stringify(got) === JSON.stringify(exp);
    log(`  ${ok ? '✓' : '✗'} ${name}`);
    if (!ok) { log(`      получено: ${JSON.stringify(got)}`); log(`      ожидалось: ${JSON.stringify(exp)}`); fail++; } else pass++;
  };

  eq('company ТОО/Поставщик', transformCompany({ name: 'ООО Ромашка', company_type: 'ТОО', company_func: 'Поставщик', bin: '123', contact_number: '+7700' }),
    { name: 'ООО Ромашка', function: 'SUPPLIER', type: 'TOO', bin: '123', contactPhone: '+7700' });
  eq('company Перевозчик → ALL', transformCompany({ name: 'Логист', company_type: 'ИП', company_func: 'Перевозчик' }),
    { name: 'Логист', function: 'ALL', type: 'IP' });
  eq('company Наша → OWN', transformCompany({ name: 'FIDA ТОО', company_type: 'ТОО', company_func: 'Наша' }),
    { name: 'FIDA ТОО', function: 'OWN', type: 'TOO' });
  eq('company АО/Филиал → TOO', transformCompany({ name: 'АО Банк', company_type: 'АО', company_func: 'Заказчик' }),
    { name: 'АО Банк', function: 'CUSTOMER', type: 'TOO' });
  eq('company неизвестные значения → дефолты', transformCompany({ name: 'X', company_type: '???', company_func: '???' }),
    { name: 'X', function: 'ALL', type: 'TOO' });
  eq('driver name → fullName', transformDriver({ name: 'Иванов И.И.' }), { fullName: 'Иванов И.И.' });
  eq('material бетон → CONCRETE', transformMaterial({ name: 'M-300', material_type: { is_for_dependent: true } }), { name: 'M-300', type: 'CONCRETE' });
  eq('material сырьё → OTHER', transformMaterial({ name: 'Щебень', material_type: { is_for_independent: true } }), { name: 'Щебень', type: 'OTHER' });
  eq('construction type+description', transformConstruction({ name: 'Свая', construction_type: { name: 'ЖБИ' }, description: 'прим.' }), { name: 'Свая', type: 'ЖБИ', note: 'прим.' });
  eq('carrier name', transformCarrier({ name: 'КамАЗ-Транс' }), { name: 'КамАЗ-Транс' });
  eq('receive_method name', transformReceiveMethod({ name: 'Самовывоз' }), { name: 'Самовывоз' });

  const companyMap = new Map([['10', 555]]);
  eq('object с маппингом компании', transformObject({ name: 'Объект А', company_id: 10, address: 'ул. 1' }, companyMap),
    { name: 'Объект А', companyId: 555, address: 'ул. 1' });
  eq('object без компании → null', transformObject({ name: 'Сирота', company_id: 999 }, companyMap), null);

  const carrierMap = new Map([['7', 70]]);
  const driverMap = new Map([['3', 30]]);
  eq('transport полный', transformTransport({ plate_number: '123ABC', tare: 8000.4, admissible_error: 50, carrier_id: 7, driver_id: 3 }, carrierMap, driverMap),
    { plateNumber: '123ABC', tare: 8000, tolerance: 50, carrierId: 70, driverId: 30 });
  eq('transport без связей', transformTransport({ plate_number: '999XYZ', carrier_id: 999, driver_id: 999 }, carrierMap, driverMap),
    { plateNumber: '999XYZ' });
  eq('transport без номера → null', transformTransport({ plate_number: '' }, carrierMap, driverMap), null);

  eq('extractList: {data,total}', extractList({ data: [1, 2], total: 5 }), { list: [1, 2], total: 5 });
  eq('extractList: массив', extractList([1, 2, 3]), { list: [1, 2, 3], total: null });

  log(`\n  SELFTEST: пройдено ${pass}, провалено ${fail}`);
  process.exit(fail ? 1 : 0);
}

// ── arg parsing + dispatch ─────────────────────────────────────────────────────
const args = process.argv.slice(2);
const has = (name) => args.includes(name);
const opt = (name, env) => {
  const i = args.indexOf(name);
  if (i >= 0 && args[i + 1] && !args[i + 1].startsWith('--')) return args[i + 1];
  return env ? process.env[env] : undefined;
};

function usage() {
  log(`
FIDA ERP — миграция справочников из старой системы.

  node scripts/migrate-from-old.mjs --export --token "Bearer eyJ..."
  node scripts/migrate-from-old.mjs --import --login admin --password "..."
  node scripts/migrate-from-old.mjs --selftest

Env-альтернативы: OLD_TOKEN, NEW_LOGIN, NEW_PASSWORD, NEW_API_URL.
`);
}

(async () => {
  try {
    if (has('--selftest')) return runSelftest();

    if (has('--export')) {
      const token = opt('--token', 'OLD_TOKEN');
      if (!token) { log('✗ Нужен токен старой системы: --token "Bearer ..." или env OLD_TOKEN'); process.exit(1); }
      const limit = Number(opt('--limit') ?? 100) || 100;
      const onlyRaw = opt('--only');
      const only = onlyRaw ? new Set(onlyRaw.split(',').map((s) => s.trim()).filter(Boolean)) : null;
      await runExport(token, limit, only);
      return;
    }

    if (has('--import')) {
      const login = opt('--login', 'NEW_LOGIN');
      const password = opt('--password', 'NEW_PASSWORD');
      if (!login || !password) { log('✗ Нужны креды новой системы: --login <login> --password <pass> или env NEW_LOGIN/NEW_PASSWORD'); process.exit(1); }
      await runImport(login, password);
      return;
    }

    usage();
  } catch (e) {
    log(`\n✗ Фатальная ошибка: ${e.message}`);
    process.exit(1);
  }
})();
