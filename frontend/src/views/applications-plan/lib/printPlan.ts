import type { Application } from '@/entities/application/model/types'
import { getApplicationTargetVolumeLabel } from '@/entities/application/model/types'

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string),
  )
}

// date — строка YYYY-MM-DD (состояние страницы) → DD.MM.YYYY
function formatDate(date: string): string {
  const [y, m, d] = date.split('-')
  return `${d}.${m}.${y}`
}

export function buildPlanHtml(applications: Application[], date: string): string {
  const rows = applications
    .filter((a) => a.isActive)
    .slice()
    .sort((a, b) => (a.deliveryTime ?? '').localeCompare(b.deliveryTime ?? ''))
    .map((app) => {
      const cells = [
        app.deliveryTime ?? '—',
        app.customer?.name ?? '—',
        app.object?.name ?? '—',
        app.material?.name ?? '—',
        getApplicationTargetVolumeLabel(app),
        app.slumpCone != null ? String(app.slumpCone) : '—',
        app.construction?.name ?? '—',
        app.deliveryMethod?.name ?? '—',
        app.loadingInterval != null ? String(app.loadingInterval) : '—',
      ]
      return `<tr>${cells.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`
    })
    .join('')

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>План заявок</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #000; background: #fff; padding: 10mm; }
    .date { font-size: 12px; margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #000; padding: 3px 5px; text-align: left; vertical-align: top; }
    th { font-weight: bold; background: #f0f0f0; text-align: center; }
    td:nth-child(1) { text-align: center; width: 50px; }
    td:nth-child(5) { text-align: center; width: 55px; }
    td:nth-child(6) { text-align: center; width: 60px; }
    td:nth-child(9) { text-align: center; width: 55px; }
    tr:nth-child(even) { background: #f9f9f9; }
    @media print {
      body { padding: 5mm; }
      @page { margin: 10mm; size: A4 landscape; }
    }
  </style>
</head>
<body>
  <div class="date">Дата: ${formatDate(date)}</div>
  <table>
    <thead>
      <tr>
        <th>Время</th>
        <th>Заказчик</th>
        <th>Объект</th>
        <th>Марка</th>
        <th>Кубатура</th>
        <th>Осадка конуса</th>
        <th>Конструкция</th>
        <th>Способ приёмки</th>
        <th>Интервал</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
</body>
</html>`
}

export function printApplicationsPlan(applications: Application[], date: string) {
  const html = buildPlanHtml(applications, date)
  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(html)
  w.document.close()
  w.focus()
  w.print()
}
