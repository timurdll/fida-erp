#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# FIDA ERP — бэкап БД PostgreSQL из docker-контейнера
# Запускается по cron (см. DEPLOY.md), напр. ежедневно в 02:00.
#   pg_dump → gzip → /opt/fida-backups/  |  ротация 30 дней  |  лог в /var/log
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Настройки (можно переопределить через переменные окружения cron) ──────────
CONTAINER="${PG_CONTAINER:-fida_postgres}"
DB_USER="${POSTGRES_USER:-fida}"
DB_NAME="${POSTGRES_DB:-fida_erp}"
BACKUP_DIR="${BACKUP_DIR:-/opt/fida-backups}"
LOG_FILE="${LOG_FILE:-/var/log/fida-backup.log}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

TIMESTAMP="$(date +%Y-%m-%d_%H-%M-%S)"
OUTFILE="${BACKUP_DIR}/fida_erp_${TIMESTAMP}.sql.gz"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG_FILE"; }

mkdir -p "$BACKUP_DIR"

log "=== Старт бэкапа (контейнер=$CONTAINER, БД=$DB_NAME) ==="

# pg_dump из контейнера → gzip. pipefail гарантирует ненулевой код при сбое pg_dump.
if docker exec "$CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$OUTFILE"; then
    SIZE="$(du -h "$OUTFILE" | cut -f1)"
    log "OK: создан $OUTFILE ($SIZE)"
else
    log "ОШИБКА: pg_dump завершился неудачно, удаляю неполный $OUTFILE"
    rm -f "$OUTFILE"
    exit 1
fi

# ── Ротация: удалить бэкапы старше RETENTION_DAYS ─────────────────────────────
DELETED="$(find "$BACKUP_DIR" -name 'fida_erp_*.sql.gz' -type f -mtime +"$RETENTION_DAYS" -print -delete | wc -l | tr -d ' ')"
log "Ротация: удалено старых бэкапов: $DELETED (старше ${RETENTION_DAYS} дн.)"

# ── (Опционально) выгрузка в Object Storage ps.kz через rclone ────────────────
# Настройка rclone (один раз на сервере):
#   1. sudo apt install -y rclone   (или: curl https://rclone.org/install.sh | sudo bash)
#   2. rclone config
#      - n) New remote, имя: pskz
#      - Storage: s3  →  Provider: Other
#      - access_key_id / secret_access_key — из кабинета Object Storage ps.kz
#      - endpoint: https://object.pscloud.io   (уточнить актуальный в панели ps.kz)
#      - регион оставить пустым
#   3. Создать бакет, напр. fida-erp-backups
#   4. Проверить:  rclone lsd pskz:
#   5. Раскомментировать строки ниже:
#
# if rclone copy "$OUTFILE" "pskz:fida-erp-backups/" >> "$LOG_FILE" 2>&1; then
#     log "OK: выгружено в Object Storage (pskz:fida-erp-backups/$(basename "$OUTFILE"))"
# else
#     log "ОШИБКА: не удалось выгрузить в Object Storage"
# fi

log "=== Бэкап завершён ==="
