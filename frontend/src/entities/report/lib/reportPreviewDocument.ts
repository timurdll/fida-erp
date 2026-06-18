import type { ReportResult } from '../model/types'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Текст ячейки → HTML: экранирование + перенос строки \n → <br> (для «заезд/выезд»). */
function cellHtml(value: string): string {
  return escapeHtml(value).replace(/\n/g, '<br>')
}

interface DownloadOpts {
  /** Same-origin blob: URL с .xlsx (создаётся родителем, доступен в попапе того же origin). */
  blobUrl: string
  /** Имя файла при скачивании. */
  filename: string
}

const STYLES = `
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; margin: 16px; color: #000; background: #fff; }
  .toolbar { margin-bottom: 14px; display: flex; gap: 8px; }
  .toolbar button, .toolbar a.btn {
    padding: 7px 16px; font-size: 14px; cursor: pointer; text-decoration: none;
    color: #000; border: 1px solid #888; background: #f3f3f3; border-radius: 4px;
    display: inline-block; line-height: 1.2;
  }
  .toolbar button:hover, .toolbar a.btn:hover { background: #e7e7e7; }
  h1 { font-size: 15px; font-weight: bold; text-align: center; margin: 6px 0 14px; }
  table { border-collapse: collapse; width: 100%; font-size: 12px; }
  th, td { border: 1px solid #000; padding: 4px 8px; vertical-align: top; }
  th { text-align: center; font-weight: bold; background: #f0f0f0; }
  td.num { text-align: right; white-space: nowrap; }
  tr.total td { font-weight: bold; }
  .empty { text-align: center; padding: 32px; color: #555; font-size: 14px; }
  @media print {
    body { margin: 0; }
    .toolbar { display: none; }
  }
`

/**
 * Самодостаточный HTML-документ превью отчёта для открытия в новой вкладке.
 * «Скачать» — ссылка на same-origin blob: URL с .xlsx (родитель уже скачал файл,
 * фетча из about:blank нет — обходим CORS/Origin:null). «Распечатать» — window.print().
 */
export function buildReportPreviewDocument(
  result: ReportResult,
  opts: DownloadOpts,
): string {
  const headerCells = result.columns.map((c) => `<th>${escapeHtml(c.header)}</th>`).join('')

  const bodyRows =
    result.rows.length === 0
      ? ''
      : result.rows
          .map((row) => {
            const cells = result.columns
              .map((_, i) => {
                const v = row.cells[i] ?? null
                if (v === null) return '<td></td>'
                if (typeof v === 'number') return `<td class="num">${v}</td>`
                return `<td>${cellHtml(String(v))}</td>`
              })
              .join('')
            return `<tr class="${row.bold ? 'total' : ''}">${cells}</tr>`
          })
          .join('')

  const tableOrEmpty =
    result.rows.length === 0
      ? `<p class="empty">Нет данных за выбранный период</p>`
      : `<table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`

  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>${escapeHtml(result.title)}</title>
<style>${STYLES}</style>
</head>
<body>
<div class="toolbar">
  <a class="btn" href="${escapeHtml(opts.blobUrl)}" download="${escapeHtml(opts.filename)}">Скачать</a>
  <button onclick="window.print()">Распечатать</button>
</div>
<h1>${escapeHtml(result.title)}</h1>
${tableOrEmpty}
</body>
</html>`
}

/** Промежуточная заглушка, пока грузится отчёт (пишется в новую вкладку синхронно). */
export const REPORT_LOADING_HTML = `<!DOCTYPE html>
<html lang="ru"><head><meta charset="utf-8"><title>Формирование отчёта…</title></head>
<body style="font-family: Arial, sans-serif; padding: 24px; color: #000; background: #fff;">
Формирование отчёта…
</body></html>`
