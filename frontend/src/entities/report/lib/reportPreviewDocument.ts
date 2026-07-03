import type {
  FidaSummaryData,
  ReportCellValue,
  ReportResult,
} from '../model/types'

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

function numberText(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)))
}

function valueHtml(value: ReportCellValue): string {
  if (value === null) return ''
  if (typeof value === 'number') return numberText(value)
  return cellHtml(String(value))
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

const FIDA_STYLES = `
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; margin: 10px; color: #000; background: #fff; }
  .toolbar { margin-bottom: 6px; display: flex; gap: 6px; }
  .toolbar button, .toolbar a.btn {
    padding: 3px 10px; font-size: 14px; cursor: pointer; text-decoration: none;
    color: #000; border: 1px solid #777; background: #f5f5f5; border-radius: 2px;
    display: inline-block; line-height: 1.2;
  }
  .sheet { overflow-x: auto; }
  table.fida { border-collapse: collapse; width: 100%; min-width: 1680px; table-layout: fixed; font-size: 17px; }
  .fida th, .fida td {
    border: 1px solid #000; padding: 4px 5px; text-align: center; vertical-align: middle;
    font-weight: 600; line-height: 1.12; word-break: normal; overflow-wrap: anywhere;
  }
  .fida th { font-weight: 700; }
  .fida .section-title { font-size: 17px; padding: 2px 6px; }
  .fida .split { border-left: 4px double #000; }
  .fida .date-col { width: 76px; }
  .fida .company-col { width: 220px; }
  .fida .object-col { width: 300px; }
  .fida .brand-col { width: 76px; }
  .fida .small-col { width: 54px; }
  .fida .percent-col { width: 128px; }
  .fida .reason-col { width: 166px; }
  .fida .number-col { width: 64px; }
  .fida .material-col { width: 112px; }
  .empty { text-align: center; padding: 32px; color: #555; font-size: 14px; }
  @media print {
    @page { size: A4 landscape; margin: 6mm; }
    body { margin: 0; }
    .toolbar { display: none; }
    .sheet { overflow: visible; }
    table.fida { min-width: 0; font-size: 10px; }
    .fida th, .fida td { padding: 2px 3px; }
  }
`

function buildFidaSummaryTable(data: FidaSummaryData): string {
  const leftHeaders = ['', 'ТОО', 'Объект', 'Марка', 'План', 'Факт', '%<br>исполнения', 'Причины<br>неисполнения']
  const maxRows = Math.max(data.applications.length, data.materialRowCount)

  if (maxRows === 0 && data.materialColumns.length === 0) {
    return '<p class="empty">Нет данных за выбранный период</p>'
  }

  const colgroup = [
    '<col class="date-col">',
    '<col class="company-col">',
    '<col class="object-col">',
    '<col class="brand-col">',
    '<col class="small-col">',
    '<col class="small-col">',
    '<col class="percent-col">',
    '<col class="reason-col">',
    '<col class="number-col">',
    ...data.materialColumns.map(() => '<col class="material-col">'),
  ].join('')

  const leftHeaderCells = leftHeaders.map((h) => `<th>${h}</th>`).join('')
  const materialHeaderCells = data.materialColumns
    .map((c) => `<th class="material-col">${cellHtml(c.header)}</th>`)
    .join('')

  const bodyRows = Array.from({ length: maxRows }, (_, i) => {
    const app = data.applications[i]
    const leftValues: ReportCellValue[] = app
      ? [
          app.dateTime,
          app.customerName,
          app.objectName,
          app.materialName,
          app.planVolume,
          app.factVolume,
          app.completionPercent === null ? null : `${app.completionPercent}%`,
          app.reason,
        ]
      : [null, null, null, null, null, null, null, null]
    const rightValues: ReportCellValue[] = [
      i < data.materialRowCount ? i + 1 : null,
      ...data.materialColumns.map((c) => c.values[i] ?? null),
    ]

    const leftCells = leftValues.map((v) => `<td>${valueHtml(v)}</td>`).join('')
    const rightCells = rightValues
      .map((v, idx) => `<td${idx === 0 ? ' class="split"' : ''}>${valueHtml(v)}</td>`)
      .join('')

    return `<tr>${leftCells}${rightCells}</tr>`
  }).join('')

  let totalPlan = 0
  let totalFact = 0
  for (const app of data.applications) {
    if (app?.planVolume) totalPlan += app.planVolume
    if (app?.factVolume) totalFact += app.factVolume
  }
  const totalPercent = totalPlan > 0 ? Math.round((totalFact / totalPlan) * 100) : 0

  const materialSums = data.materialColumns.map(col => col.values.reduce((a: number, b) => a + (b ?? 0), 0))

  const summaryLeftValues: ReportCellValue[] = [
    null, 'ИТОГО', null, null, totalPlan, totalFact, `${totalPercent}%`, null
  ]
  const summaryRightValues: ReportCellValue[] = [
    'Итого', ...materialSums
  ]

  const summaryLeftCells = summaryLeftValues
    .map((v) => `<td style="font-weight:bold">${valueHtml(v)}</td>`)
    .join('')
  const summaryRightCells = summaryRightValues
    .map((v, idx) => `<td style="font-weight:bold"${idx === 0 ? ' class="split"' : ''}>${valueHtml(v)}</td>`)
    .join('')

  const summaryRowHtml = `<tr>${summaryLeftCells}${summaryRightCells}</tr>`

  const totalCols = leftHeaders.length + 1 + data.materialColumns.length
  const emptyCell = `<td style="border: none !important; background: transparent;"></td>`
  
  const makeBoxRow = (label: string, value: string | number, isHeader = false) => {
    const emptyBefore = `${emptyCell}${emptyCell}${emptyCell}`
    if (isHeader) {
      const cell = `<td colspan="2" style="font-weight:bold">${escapeHtml(label)}</td>`
      const emptyAfter = Array.from({ length: totalCols - 5 }).map(() => emptyCell).join('')
      return `<tr>${emptyBefore}${cell}${emptyAfter}</tr>`
    } else {
      const labelCell = `<td>${escapeHtml(label)}</td>`
      const valueCell = `<td>${escapeHtml(String(value))}</td>`
      const emptyAfter = Array.from({ length: totalCols - 5 }).map(() => emptyCell).join('')
      return `<tr>${emptyBefore}${labelCell}${valueCell}${emptyAfter}</tr>`
    }
  }

  const fidaBoxRows = `
    <tr><td colspan="${totalCols}" style="border: none !important; height: 20px;"></td></tr>
    ${makeBoxRow('Заявки Fida', '', true)}
    ${makeBoxRow('Итого план', totalPlan)}
    ${makeBoxRow('Итого факт', totalFact)}
    ${makeBoxRow('% исполнения', `${totalPercent}%`)}
  `

  return `<div class="sheet"><table class="fida">
<colgroup>${colgroup}</colgroup>
<thead>
  <tr>
    <th class="section-title" colspan="${leftHeaders.length}">${escapeHtml(data.applicationsTitle)}</th>
    <th class="section-title split" colspan="${data.materialColumns.length + 1}">${escapeHtml(data.materialsTitle)}</th>
  </tr>
  <tr>${leftHeaderCells}<th class="split">№</th>${materialHeaderCells}</tr>
</thead>
<tbody>
  ${bodyRows}
  ${summaryRowHtml}
  ${fidaBoxRows}
</tbody>
</table></div>`
}

function buildFidaSummaryPreviewDocument(
  result: ReportResult,
  opts: DownloadOpts,
): string {
  const data = result.fidaSummary
  const content = data
    ? buildFidaSummaryTable(data)
    : '<p class="empty">Нет данных за выбранный период</p>'

  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>${escapeHtml(result.title)}</title>
<style>${FIDA_STYLES}</style>
</head>
<body>
<div class="toolbar">
  <a class="btn" href="${escapeHtml(opts.blobUrl)}" download="${escapeHtml(opts.filename)}">Скачать</a>
  <button onclick="window.print()">Распечатать</button>
</div>
${content}
</body>
</html>`
}

/**
 * Самодостаточный HTML-документ превью отчёта для открытия в новой вкладке.
 * «Скачать» — ссылка на same-origin blob: URL с .xlsx (родитель уже скачал файл,
 * фетча из about:blank нет — обходим CORS/Origin:null). «Распечатать» — window.print().
 */
export function buildReportPreviewDocument(
  result: ReportResult,
  opts: DownloadOpts,
): string {
  if (result.layout === 'fida-summary') {
    return buildFidaSummaryPreviewDocument(result, opts)
  }

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
