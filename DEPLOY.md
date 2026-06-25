# Деплой FIDA ERP — Ubuntu 22.04 + Docker + Nginx + SSL

Пошаговая инструкция для развёртывания на VPS (ps.kz Basic-2, Ubuntu 22.04).
Домен: **erp.fida-group.kz**. Стек: Docker Compose (postgres + backend + frontend) за Nginx с Let's Encrypt.

> Все команды выполняются на сервере под пользователем с sudo (не root по возможности).

---

## 0. Предусловия

- VPS с Ubuntu 22.04, root/sudo доступ по SSH.
- **DNS**: A-запись `erp.fida-group.kz` → публичный IP сервера (проверь: `dig +short erp.fida-group.kz`). SSL не выпустится, пока DNS не резолвится на этот сервер.
- Открытые порты: 22 (SSH), 80, 443.

---

## 1. Начальная настройка сервера

```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Базовые утилиты
sudo apt install -y git ufw

# Docker Engine + Compose plugin (официальный скрипт)
curl -fsSL https://get.docker.com | sudo sh

# Запускать docker без sudo (нужно перелогиниться после этой команды)
sudo usermod -aG docker $USER
# Применить группу в текущей сессии без релогина:
newgrp docker

# Docker стартует при загрузке системы
sudo systemctl enable docker

# Проверка
docker --version
docker compose version

# Nginx + certbot
sudo apt install -y nginx certbot python3-certbot-nginx

# Firewall
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'   # открывает 80 и 443
sudo ufw --force enable
sudo ufw status
```

---

## 2. Доступ к репозиторию (SSH deploy key) и клонирование

```bash
# Сгенерировать ключ на сервере (без пароля для автоматизации)
ssh-keygen -t ed25519 -C "fida-erp-deploy" -f ~/.ssh/fida_erp_deploy -N ""

# Показать ПУБЛИЧНЫЙ ключ — скопировать его целиком
cat ~/.ssh/fida_erp_deploy.pub
```

Добавить ключ в GitHub: репозиторий **timurdll/fida-erp** → **Settings → Deploy keys → Add deploy key** → вставить публичный ключ (галку «Allow write access» НЕ ставить — нужен только read).

```bash
# Указать git'у использовать этот ключ для github.com
cat >> ~/.ssh/config <<'EOF'
Host github.com
  IdentityFile ~/.ssh/fida_erp_deploy
  IdentitiesOnly yes
EOF

# Проверка доступа (ожидается приветствие "Hi timurdll/fida-erp!")
ssh -T git@github.com

# Клонирование в /opt
sudo mkdir -p /opt && sudo chown $USER:$USER /opt
cd /opt
git clone git@github.com:timurdll/fida-erp.git
cd fida-erp
```

> Обновление кода в будущем: `cd /opt/fida-erp && git pull && docker compose -f docker-compose.prod.yml up -d --build`.

---

## 3. Конфигурация окружения (`.env.production`)

```bash
cd /opt/fida-erp
cp .env.production.example .env.production

# Сгенерировать секреты:
echo "JWT_SECRET=$(openssl rand -hex 32)"
echo "POSTGRES_PASSWORD=$(openssl rand -base64 24)"

# Открыть и заполнить файл
nano .env.production
```

Обязательно заполни/проверь в `.env.production`:

- `POSTGRES_PASSWORD` — вставить сгенерированный.
- `JWT_SECRET` — вставить сгенерированный (32+ символов).
- `DATABASE_URL` — хост **`postgres`** (имя сервиса), пароль/пользователь/база ДОЛЖНЫ совпадать с `POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB`. Пример:
  `postgresql://fida:ВАШ_ПАРОЛЬ@postgres:5432/fida_erp?schema=public`
- `FRONTEND_URL=https://erp.fida-group.kz`
- `NEXT_PUBLIC_API_URL=https://erp.fida-group.kz/api`

> `.env.production` не коммитится (попадает под маску `.env.*` в `.gitignore`).
> ⚠️ `NEXT_PUBLIC_API_URL` встраивается в бандл фронтенда на этапе `build` — менять её без пересборки фронтенда бессмысленно.

---

## 4. Первый запуск контейнеров

```bash
cd /opt/fida-erp
docker compose -f docker-compose.prod.yml up -d --build
```

Это соберёт образы (фронтенд «запечёт» `NEXT_PUBLIC_API_URL`) и поднимет `fida_postgres`, `fida_backend`, `fida_frontend`.

```bash
# Статус и healthcheck
docker compose -f docker-compose.prod.yml ps
```

---

## 5. Применение схемы БД (Prisma) и сид администратора

На свежей БД таблиц ещё нет — применяем миграцию `0_init`:

```bash
docker exec fida_backend npx prisma migrate deploy
```

Создать пользователя-администратора (login=`admin`, password=`admin1234`):

```bash
docker exec fida_backend npx prisma db seed
```

> ⚠️ Сразу после первого входа смени пароль администратора (раздел «Пользователи»).

Проверка бэкенда (изнутри хоста):

```bash
curl http://127.0.0.1:3001/api/health     # → {"status":"ok",...}
```

---

## 5а. Миграция данных из старой системы

Справочники из старой системы (fida2.gocart.kz) переносятся скриптом
`scripts/migrate-from-old.mjs` (~3800+ записей, идемпотентно — дедуп по имени).
JSON-дамп `scripts/migration-data/*.json` лежит в `.gitignore` → через `git clone`
на сервер **не попадает**.

**Стратегия:** запустить импорт локально → снять дамп справочных таблиц → восстановить на сервере.
(Если так удобнее — можно вместо дампа скопировать JSON и запустить импорт прямо на сервере, см. «Альтернатива».)

### Шаг 1 — Локально: импорт в локальную БД

```bash
# Локальная БД — после `prisma migrate deploy` + `prisma db seed` (admin нужен для логина).
# Файлы scripts/migration-data/*.json должны лежать локально (8 шт).
node scripts/migrate-from-old.mjs --import --login admin --password "admin1234"
# Дождаться сводки: Создано X / Пропущено Y / Ошибок Z
```

### Шаг 2 — Локально: дамп справочных таблиц

> ⚠️ Дамп ограничен 8 справочными таблицами (флаги `-t`) намеренно: чтобы НЕ тащить
> на прод локальные тестовые отвесы/заявки и не конфликтовать с уже засиженным `admin`.
> Имена таблиц — PascalCase в кавычках (Prisma не использует snake_case).

```bash
# Имя локального контейнера postgres (в dev docker-compose — fida_postgres):
docker exec fida_postgres pg_dump -U fida -d fida_erp -Fc \
  -t '"Company"' -t '"Object"' -t '"Material"' -t '"Construction"' \
  -t '"DeliveryMethod"' -t '"Carrier"' -t '"Driver"' -t '"Transport"' \
  -f /tmp/fida_migration.dump
docker cp fida_postgres:/tmp/fida_migration.dump ./fida_migration.dump

# Если локальная БД нативная (без Docker) — те же -t, без docker:
# pg_dump -U fida -d fida_erp -Fc \
#   -t '"Company"' -t '"Object"' -t '"Material"' -t '"Construction"' \
#   -t '"DeliveryMethod"' -t '"Carrier"' -t '"Driver"' -t '"Transport"' \
#   -f fida_migration.dump
```

### Шаг 3 — Скопировать дамп на сервер

```bash
scp fida_migration.dump user@<SERVER_IP>:/opt/fida-erp/
```

### Шаг 4 — На сервере: восстановить дамп

```bash
# Скопировать дамп в контейнер postgres
docker cp /opt/fida-erp/fida_migration.dump fida_postgres:/tmp/

# Восстановить (таблицы уже созданы шагом 5 «migrate deploy»).
# --disable-triggers снимает проверки FK на время загрузки (нужен суперюзер — fida им является).
docker exec fida_postgres pg_restore -U fida -d fida_erp \
  --data-only --disable-triggers /tmp/fida_migration.dump

# Проверить количество записей (имена таблиц — в двойных кавычках!)
docker exec fida_postgres psql -U fida -d fida_erp -c \
'SELECT (SELECT count(*) FROM "Company")   AS company,
        (SELECT count(*) FROM "Object")    AS object,
        (SELECT count(*) FROM "Material")  AS material,
        (SELECT count(*) FROM "Transport") AS transport,
        (SELECT count(*) FROM "Driver")    AS driver;'

# Удалить дамп с сервера и из контейнера
rm /opt/fida-erp/fida_migration.dump
docker exec fida_postgres rm /tmp/fida_migration.dump
```

### Альтернатива — без дампа (scp JSON + импорт на сервере)

```bash
# Скопировать JSON-файлы напрямую на сервер
scp -r scripts/migration-data user@<SERVER_IP>:/opt/fida-erp/scripts/

# На сервере запустить идемпотентный импорт через API (нужен Node.js на сервере)
cd /opt/fida-erp
node scripts/migrate-from-old.mjs --import --login admin --password "ВАШ_ПАРОЛЬ"
```

> Импорт логинится под `admin` сервера (создан шагом 5 «seed»), дедуп по имени —
> конфликтов и дублей нет, повторный запуск безопасен.

---

## 6. Nginx: выпуск сертификата и установка конфига

SSL-блок нашего конфига ссылается на сертификат, которого пока нет. Поэтому **сначала выпускаем сертификат через дефолтный сайт Nginx (webroot), потом подключаем наш конфиг.**

```bash
# 6.1. Убедиться, что дефолтный Nginx отвечает на :80 (нужен для ACME-проверки)
sudo systemctl status nginx --no-pager
curl -I http://erp.fida-group.kz      # должен ответить дефолтный Nginx

# 6.2. Выпустить сертификат (webroot дефолтного сайта)
sudo certbot certonly --webroot -w /var/www/html \
  -d erp.fida-group.kz \
  --email admin@fida-group.kz --agree-tos --no-eff-email

# Проверить, что сертификат появился:
sudo ls -l /etc/letsencrypt/live/erp.fida-group.kz/

# 6.3. Установить наш конфиг и отключить дефолтный сайт
sudo cp /opt/fida-erp/nginx/erp.fida-group.kz.conf /etc/nginx/sites-available/erp.fida-group.kz.conf
sudo ln -sf /etc/nginx/sites-available/erp.fida-group.kz.conf /etc/nginx/sites-enabled/erp.fida-group.kz.conf
sudo rm -f /etc/nginx/sites-enabled/default

# 6.4. Проверить и перезагрузить
sudo nginx -t
sudo systemctl reload nginx
```

> Альтернатива одной командой: если оставить дефолтный сайт и выполнить
> `sudo certbot --nginx -d erp.fida-group.kz`, certbot сам впишет SSL в конфиг.
> Но мы используем готовый `nginx/erp.fida-group.kz.conf`, поэтому идём через `certonly`.

### Автопродление сертификата

Пакет certbot ставит systemd-таймер автопродления. Проверка:

```bash
sudo systemctl status certbot.timer --no-pager
sudo certbot renew --dry-run
```

Чтобы Nginx подхватывал обновлённый сертификат, добавим deploy-hook (один раз):

```bash
echo 'nginx -s reload' | sudo tee /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
```

---

## 7. Бэкапы БД (cron, 02:00)

```bash
# Каталог для бэкапов и лог-файл
sudo mkdir -p /opt/fida-backups
sudo touch /var/log/fida-backup.log
sudo chown $USER:$USER /opt/fida-backups /var/log/fida-backup.log

# Разовый тест скрипта
/opt/fida-erp/scripts/backup.sh
ls -l /opt/fida-backups/          # должен появиться fida_erp_<дата>.sql.gz
tail /var/log/fida-backup.log

# Добавить в crontab (ежедневно в 02:00)
( crontab -l 2>/dev/null; echo "0 2 * * * /opt/fida-erp/scripts/backup.sh" ) | crontab -
crontab -l
```

> Скрипт хранит 30 дней, удаляет старее. Выгрузку в Object Storage ps.kz через `rclone`
> см. в закомментированном блоке внутри `scripts/backup.sh`.

---

## 8. Автозапуск после ребута

- Контейнеры: уже настроено `restart: always` в `docker-compose.prod.yml` — поднимутся сами.
- Docker-демон: `sudo systemctl enable docker` (выполнено в шаге 1).
- Nginx: `sudo systemctl enable nginx`.

Проверить, что всё переживает перезагрузку:

```bash
sudo reboot
# после повторного входа:
docker compose -f /opt/fida-erp/docker-compose.prod.yml ps
```

---

## 9. Проверка после деплоя

```bash
# Контейнеры подняты и healthy
docker compose -f /opt/fida-erp/docker-compose.prod.yml ps

# Health бэкенда напрямую
curl http://127.0.0.1:3001/api/health

# Фронтенд напрямую
curl -I http://127.0.0.1:3000

# HTTPS снаружи: редирект с http
curl -I http://erp.fida-group.kz            # → 301 на https
# Главная по HTTPS
curl -I https://erp.fida-group.kz           # → 200
# API через Nginx (должен отдать 401 — значит роутинг до бэкенда работает)
curl -i https://erp.fida-group.kz/api/auth/me

# Логи при проблемах
docker logs fida_backend --tail 50
docker logs fida_frontend --tail 50
docker logs fida_postgres --tail 50
sudo tail -f /var/log/nginx/error.log
```

В браузере: **https://erp.fida-group.kz** → страница логина, вход `admin` / `admin1234` → **сменить пароль**.

---

## Шпаргалка по обслуживанию

```bash
cd /opt/fida-erp

# Обновить из git и пересобрать
git pull && docker compose -f docker-compose.prod.yml up -d --build

# Перезапустить один сервис
docker compose -f docker-compose.prod.yml restart backend

# Применить новые изменения схемы (после git pull с новой миграцией)
docker exec fida_backend npx prisma migrate deploy

# Ручной бэкап
/opt/fida-erp/scripts/backup.sh

# Восстановление из бэкапа
gunzip -c /opt/fida-backups/fida_erp_<дата>.sql.gz | docker exec -i fida_postgres psql -U fida -d fida_erp

# Повторный запуск миграции справочников (идемпотентен — дедуп по имени)
node scripts/migrate-from-old.mjs --import --login admin --password "ВАШ_ПАРОЛЬ"
```

---

## Подключение Claude Code к серверу (для отладки)

**Способ 1 — запустить Claude Code прямо на сервере:**

```bash
ssh user@<SERVER_IP>
# Node.js уже установлен (нужен для приложения)
npm install -g @anthropic-ai/claude-code
claude
```

**Способ 2 — подключиться с локального Claude Code по SSH:**

```bash
claude --ssh user@<SERVER_IP>
```
