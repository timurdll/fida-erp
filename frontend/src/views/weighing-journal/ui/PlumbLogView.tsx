'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { toast } from 'sonner'
import { ArrowLeft, Printer, Pencil, RotateCcw, Trash2, Save } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Skeleton } from '@/shared/ui/skeleton'
import { plumbLogKeys } from '@/entities/plumb-log/model/queryKeys'
import {
  getPlumbLogById,
  updatePlumbLog,
  weighTare,
  weighGross,
  createReturn,
  deactivatePlumbLog,
} from '@/entities/plumb-log/api/plumbLogApi'
import { getCompanies } from '@/entities/company/api/companyApi'
import { getMaterials } from '@/entities/material/api/materialApi'
import { getTransports } from '@/entities/transport/api/transportApi'
import { getDrivers } from '@/entities/driver/api/driverApi'
import { getBsuList } from '@/entities/bsu/api/bsuApi'
import { getConstructions } from '@/entities/construction/api/constructionApi'
import { getNomenclatures } from '@/entities/nomenclature/api/nomenclatureApi'
import type { CreatePlumbLogDto, PlumbLog } from '@/entities/plumb-log/model/types'

interface Props { id: number }

const fmtDt = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
})

function fmt(iso: string | null) {
  return iso ? fmtDt.format(new Date(iso)) : '—'
}

function printTTN(plumbLog: PlumbLog) {
  const pad = (n: number) => String(n).padStart(2, '0')

  const formatDateTime = (iso: string | null) => {
    if (!iso) return ''
    const d = new Date(iso)
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const formatTime = (iso: string | null) => {
    if (!iso) return ''
    const d = new Date(iso)
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  }

  const toTons = (kg: number | null, digits = 2) =>
    kg != null ? (kg / 1000).toFixed(digits) : ''

  const docDate = formatDateTime(plumbLog.secondWeighingAt ?? plumbLog.firstWeighingAt)
  const grossTons = toTons(plumbLog.gross)
  const tareTons = toTons(plumbLog.tare)
  const netTons = toTons(plumbLog.net)
  const grossTons3 = toTons(plumbLog.gross, 3)
  const objectName = plumbLog.object?.name
  const recipient = (plumbLog.customer?.name ?? '') + (objectName ? ` (${objectName})` : '')
  const operator = plumbLog.firstOperator?.fullName ?? ''
  const driverName = plumbLog.driver?.fullName ?? ''
  const plate = plumbLog.transport?.plateNumber ?? ''
  const carrier = plumbLog.carrier?.name ?? ''
  const supplier = plumbLog.supplier?.name ?? ''
  const bsuName = plumbLog.bsu?.name ?? ''
  const material = plumbLog.material?.name ?? ''
  const seal = plumbLog.sealNumber ?? ''
  const deliveryType = plumbLog.deliveryType ?? ''
  const volumeStr = plumbLog.volume?.toFixed(2) ?? ''
  const firstTime = formatTime(plumbLog.firstWeighingAt)
  const secondTime = formatTime(plumbLog.secondWeighingAt)

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>ТТН №${plumbLog.id}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Times New Roman', Times, serif; font-size: 11px; color: #000; background: #fff; padding: 6mm; }
    .hdr { display: flex; justify-content: space-between; align-items: flex-start; }
    .hdr .notes div { line-height: 1.3; }
    .codes-wrap { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
    table.codes { border-collapse: collapse; }
    table.codes td { border: 1px solid #000; width: 22px; height: 14px; }
    .title-block { display: inline-block; text-align: right; }
    .title-block .form-name { font-size: 11px; border-bottom: 1px solid #000; padding-bottom: 2px; white-space: nowrap; }
    .title-block .doc-title { font-size: 14px; font-weight: bold; white-space: nowrap; margin-top: 3px; }
    .title-block .doc-date { font-size: 12px; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 2px; margin-top: 4px; }
    .auto-line { display: flex; justify-content: center; align-items: flex-end; gap: 6px; margin: 5px 0 3px; }
    .auto-line .ul { border-bottom: 1px solid #000; font-weight: bold; min-width: 360px; padding: 0 6px; text-align: center; }
    table.fields { width: 100%; border-collapse: collapse; table-layout: fixed; }
    table.fields td { height: 20px; padding: 0; vertical-align: bottom; }
    table.fields td.rlbl { width: 168px; text-align: right; white-space: nowrap; padding: 0 6px 2px 10px; }
    table.fields td.rbx { width: 80px; border: 1px solid #000; }
    .fline { display: flex; align-items: flex-end; padding-bottom: 2px; }
    .fline .lbl { white-space: nowrap; padding: 0 4px 0 0; }
    .fline .ul { flex: 1 1 auto; border-bottom: 1px solid #000; font-weight: bold; padding: 0 4px; min-width: 30px; }
    .section-title { text-align: center; font-weight: bold; margin: 5px 0 2px; text-transform: uppercase; }
    table.grid { width: 100%; border-collapse: collapse; }
    table.grid th, table.grid td { border: 1px solid #000; padding: 1px 3px; text-align: center; vertical-align: middle; }
    table.grid tr.data td { font-weight: bold; }
    .ul { border-bottom: 1px solid #000; font-weight: bold; display: inline-block; padding: 0 4px; min-width: 120px; }
    table.sigtable { width: 100%; border-collapse: collapse; margin-top: 4px; }
    table.sigtable td { vertical-align: top; padding: 0 10px; width: 34%; }
    table.sigtable td.dov { border-left: 1px solid #000; width: 32%; }
    .sline { margin: 2px 0; }
    .row2 { display: flex; justify-content: space-between; }
    .bold { font-weight: bold; }
    .italic { font-style: italic; }
    @media print { body { padding: 0; } @page { size: A4 landscape; margin: 7mm; } }
  </style>
</head>
<body>

  <div class="hdr">
    <div class="notes">
      <div>1-й экз - грузоотправителю</div>
      <div>2-й экз - грузополучателю</div>
      <div>3-й и 4-й экз - автопредприятию</div>
    </div>
    <div class="codes-wrap">
      <span class="bold">Коды</span>
      <table class="codes">
        <tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
        <tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
      </table>
    </div>
    <div class="title-block">
      <div class="form-name">Типовая межведомственная форма №1-т</div>
      <div class="doc-title">ТОВАРНО-ТРАНСПОРТНАЯ НАКЛАДНАЯ №${plumbLog.id}</div>
      <div class="doc-date">${docDate}</div>
    </div>
  </div>

  <div class="auto-line">
    <span>Автомобиль</span><span class="ul">${plate}</span>
  </div>

  <table class="fields">
    <tr>
      <td>
        <div class="fline">
          <span class="lbl">Автопредприятие</span><span class="ul">${carrier}</span>
          <span class="lbl" style="padding-left:8px">Водитель</span><span class="ul">${driverName}</span>
          <span class="lbl" style="padding-left:8px">Вид перевозки</span><span class="ul">${deliveryType}</span>
        </div>
      </td>
      <td class="rlbl">к путевому листу №</td>
      <td class="rbx"></td>
    </tr>
    <tr>
      <td><div class="fline"><span class="lbl">Заказчик (плательщик)</span><span class="ul"></span></div></td>
      <td class="rlbl">код</td>
      <td class="rbx"></td>
    </tr>
    <tr>
      <td><div class="fline"><span class="lbl">Грузоотправитель</span><span class="ul">${supplier}</span></div></td>
      <td class="rlbl">код</td>
      <td class="rbx"></td>
    </tr>
    <tr>
      <td><div class="fline"><span class="lbl">Грузополучатель</span><span class="ul">${recipient}</span></div></td>
      <td class="rlbl">код</td>
      <td class="rbx"></td>
    </tr>
    <tr>
      <td>
        <div class="fline">
          <span class="lbl">Пункт погрузки</span><span class="ul">${bsuName}</span>
          <span class="lbl" style="padding-left:8px">Пункт разгрузки</span><span class="ul"></span>
        </div>
      </td>
      <td class="rlbl">код</td>
      <td class="rbx"></td>
    </tr>
    <tr>
      <td>
        <div class="fline">
          <span class="lbl">Переадресовка</span><span class="ul"></span>
          <span class="lbl" style="padding-left:8px">1.Прицеп</span><span class="ul" style="flex:0 0 280px"></span>
        </div>
      </td>
      <td class="rlbl">Маршрут №</td>
      <td class="rbx"></td>
    </tr>
    <tr>
      <td>
        <div class="fline">
          <span style="flex:1 1 auto"></span>
          <span class="lbl">2.Прицеп</span><span class="ul" style="flex:0 0 280px"></span>
        </div>
      </td>
      <td class="rlbl">Гар. №</td>
      <td class="rbx"></td>
    </tr>
    <tr>
      <td><div class="fline">&nbsp;</div></td>
      <td class="rlbl">Гар. №</td>
      <td class="rbx"></td>
    </tr>
  </table>

  <div class="section-title">Сведения о грузе</div>
  <table class="grid">
    <tr>
      <th style="width:52px">Номенк № код</th>
      <th style="width:52px">№ прейск позиция</th>
      <th>Наименование продукции товара (груза) или номера контейнера</th>
      <th style="width:40px">Един. измер</th>
      <th style="width:58px">Количество</th>
      <th style="width:32px">Цена</th>
      <th style="width:40px">Сумма</th>
      <th style="width:88px">С грузом следуют документы</th>
      <th style="width:42px">Вид упаков</th>
      <th style="width:44px">объем м3</th>
      <th style="width:70px">Способы опред массы</th>
      <th style="width:38px">Код груза</th>
      <th style="width:54px">Масса тары, т</th>
      <th style="width:58px">Масса брутто, т</th>
    </tr>
    <tr>
      <td>1</td><td>2</td><td>3</td><td>4</td><td>5</td><td>6</td><td>7</td>
      <td>8</td><td>9</td><td>10</td><td>11</td><td>12</td><td>13</td><td>14</td>
    </tr>
    <tr class="data">
      <td></td><td></td>
      <td>${material}</td>
      <td>Т</td>
      <td>${netTons}</td>
      <td></td><td></td><td></td><td></td>
      <td>${volumeStr}</td>
      <td></td><td></td>
      <td>${tareTons}</td>
      <td>${grossTons}</td>
    </tr>
  </table>

  <div class="row2" style="margin-top:3px">
    <div>Всего получено на сумму <span class="ul" style="min-width:220px"></span></div>
    <div>Отпуск разрешил <span class="ul bold" style="min-width:240px">${operator}</span></div>
  </div>

  <table class="sigtable">
    <tr>
      <td>
        <div class="sline row2"><span>Указанный груз за испр. <span class="ul bold" style="min-width:80px">${seal}</span></span><span>Кол. <span class="ul" style="min-width:60px"></span></span></div>
        <div class="sline row2"><span>пломбой, тарой и упаковкой</span><span>мест</span></div>
        <div class="sline">Массой брутто, т <span class="bold">${grossTons3}</span> к перевозке</div>
        <div class="sline" style="margin-top:8px"><span class="bold">Сдал</span> <span class="ul" style="min-width:150px">${operator}</span></div>
        <div class="sline"><span class="italic">Принял водит-экспедитор</span> <span class="ul italic" style="min-width:100px">${driverName}</span></div>
      </td>
      <td>
        <div class="sline row2"><span>Указанный груз за испр. <span class="ul bold" style="min-width:80px">${seal}</span></span><span>Кол. <span class="ul" style="min-width:60px"></span></span></div>
        <div class="sline row2"><span>пломбой, тарой и упаковкой</span><span>мест</span></div>
        <div class="sline">Массой брутто, т <span class="bold">${grossTons3}</span> к перевозке</div>
        <div class="sline" style="margin-top:8px"><span class="italic">Сдал водитель-экспедитор</span> <span class="ul italic" style="min-width:110px">${driverName}</span></div>
        <div class="sline">Принял <span class="ul" style="min-width:160px"></span></div>
      </td>
      <td class="dov">
        <div class="sline">По доверенности № <span class="ul" style="min-width:110px"></span></div>
        <div class="sline">выданной <span class="ul" style="min-width:150px"></span></div>
        <div class="sline">Груз получил <span class="ul" style="min-width:130px"></span></div>
        <div class="sline"><span class="ul" style="min-width:200px">&nbsp;</span></div>
        <div class="sline">Транспортные услуги <span class="ul" style="min-width:100px"></span></div>
        <div class="sline"><span class="ul" style="min-width:200px">&nbsp;</span></div>
        <div class="sline">Отметки о сост актах <span class="ul" style="min-width:100px"></span></div>
      </td>
    </tr>
  </table>

  <div class="section-title">Погрузочно-разгрузочные операции</div>
  <table class="grid">
    <tr>
      <th rowspan="2" style="width:70px">операции</th>
      <th rowspan="2" style="width:90px">исп АТП, отпр получ</th>
      <th rowspan="2" colspan="2">способ руче,мех,груз</th>
      <th colspan="3">время, час. мин</th>
      <th colspan="2">дополнительные операции</th>
      <th rowspan="2" style="width:90px">отв лицо подпись</th>
    </tr>
    <tr>
      <th>прибытия</th><th>убытия</th><th>простой</th>
      <th>время, мин</th><th>наименов, колич</th>
    </tr>
    <tr>
      <td></td><td>15</td><td>16</td><td>17</td><td>18</td><td>19</td><td>20</td><td>21</td><td>22</td><td>23</td>
    </tr>
    <tr>
      <td>погр</td>
      <td></td><td></td><td></td>
      <td>${firstTime}</td>
      <td>${secondTime}</td>
      <td></td><td></td><td></td>
      <td>80</td>
    </tr>
    <tr>
      <td>рагр</td>
      <td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
    </tr>
  </table>

  <div class="section-title">Прочие сведения (заполняется организацией, владельцем автотранспорта)</div>
  <table class="grid">
    <tr>
      <th colspan="5">Расст перевоза по группам дорог, км</th>
      <th rowspan="2">Код эксп</th>
      <th colspan="2">За трансп услуги</th>
      <th colspan="2">Поправочн коэф</th>
      <th rowspan="2">штраф</th>
      <th rowspan="2"></th>
      <th rowspan="2"></th>
    </tr>
    <tr>
      <th>всего</th><th>в гор</th><th>I гр.</th><th>II гр.</th><th>III гр.</th>
      <th>с клиента</th><th>водителю</th><th>расцводит.</th><th>основн тариф</th>
    </tr>
    <tr>
      <td>24</td><td>25</td><td>26</td><td>27</td><td>28</td><td>29</td>
      <td>30</td><td>31</td><td>32</td><td>33</td><td>34</td><td>35</td><td>36</td>
    </tr>
    <tr>
      <td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td>
      <td></td><td></td><td></td><td></td><td></td><td></td><td></td>
    </tr>
  </table>

</body>
</html>`

  const printWindow = window.open('', '_blank', 'width=1200,height=800')
  if (!printWindow) {
    toast.error('Не удалось открыть окно печати. Разрешите всплывающие окна.')
    return
  }
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()
  setTimeout(() => printWindow.print(), 500)
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">{children}</h3>
}

function ReadonlyVal({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm text-muted-foreground">{label}</Label>
      <div className="h-9 rounded-md border border-border bg-muted/20 px-3 flex items-center text-sm text-foreground">
        {value || '—'}
      </div>
    </div>
  )
}

export function PlumbLogView({ id }: Props) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [tareInput, setTareInput] = useState('')
  const [grossInput, setGrossInput] = useState('')

  const { data: plumbLog, isLoading } = useQuery({
    queryKey: plumbLogKeys.detail(id),
    queryFn: () => getPlumbLogById(id),
    enabled: !!id,
  })

  const isConcrete = plumbLog?.applicationId !== null && plumbLog?.applicationId !== undefined

  const { data: suppliers = [], isLoading: suppliersLoading } = useQuery({
    queryKey: ['companies', { isActive: true }],
    queryFn: () => getCompanies({ isActive: true }),
    staleTime: 60_000,
  })

  // В режиме просмотра — все активные компании (без фильтра по function)
  const customers = suppliers

  const { data: materials = [], isLoading: materialsLoading } = useQuery({
    queryKey: ['materials', { isActive: true }],
    queryFn: () => getMaterials({ isActive: true }),
    staleTime: 60_000,
  })

  const { data: transports = [], isLoading: transportsLoading } = useQuery({
    queryKey: ['transports', { isActive: true }],
    queryFn: () => getTransports({ isActive: true }),
    staleTime: 60_000,
  })

  const { data: drivers = [], isLoading: driversLoading } = useQuery({
    queryKey: ['drivers', { isActive: true }],
    queryFn: () => getDrivers({ isActive: true }),
    staleTime: 60_000,
  })

  const { data: bsuList = [], isLoading: bsuLoading } = useQuery({
    queryKey: ['bsu', { isActive: true, companyId: plumbLog?.supplierId }],
    queryFn: () => getBsuList({ isActive: true, companyId: plumbLog?.supplierId }),
    enabled: isConcrete && !!plumbLog?.supplierId,
    staleTime: 60_000,
  })

  const { data: constructions = [], isLoading: constructionsLoading } = useQuery({
    queryKey: ['constructions', { isActive: true }],
    queryFn: () => getConstructions({ isActive: true }),
    staleTime: 60_000,
    enabled: isConcrete,
  })

  const { data: nomenclatures = [], isLoading: nomenclaturesLoading } = useQuery({
    queryKey: ['nomenclatures', { isActive: true }],
    queryFn: () => getNomenclatures({ isActive: true }),
    staleTime: 60_000,
    enabled: !isConcrete,
  })

  const { control, handleSubmit } = useForm<Partial<CreatePlumbLogDto>>({
    values: plumbLog ? {
      supplierId: plumbLog.supplierId,
      customerId: plumbLog.customerId,
      materialId: plumbLog.materialId,
      transportId: plumbLog.transportId ?? undefined,
      driverId: plumbLog.driverId ?? undefined,
      bsuId: plumbLog.bsuId ?? undefined,
      constructionId: plumbLog.constructionId ?? undefined,
      nomenclatureId: plumbLog.nomenclatureId ?? undefined,
      volume: plumbLog.volume ?? undefined,
      returnVolume: plumbLog.returnVolume ?? undefined,
      sealNumber: plumbLog.sealNumber ?? undefined,
      slumpCone: plumbLog.slumpCone ?? undefined,
      deliveryType: plumbLog.deliveryType ?? undefined,
      impurity: plumbLog.impurity ?? undefined,
      cleanNet: plumbLog.cleanNet ?? undefined,
      documentWeight: plumbLog.documentWeight ?? undefined,
    } : {},
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: plumbLogKeys.detail(id) })
    queryClient.invalidateQueries({ queryKey: plumbLogKeys.lists() })
  }

  const saveMutation = useMutation({
    mutationFn: (data: Partial<CreatePlumbLogDto>) => updatePlumbLog(id, data),
    onSuccess: () => { invalidate(); toast.success('Сохранено') },
    onError: () => toast.error('Ошибка сохранения'),
  })

  const weighTareMutation = useMutation({
    mutationFn: () => weighTare(id, Number(tareInput)),
    onSuccess: () => { invalidate(); toast.success('Тара взвешена') },
    onError: () => toast.error('Ошибка взвешивания тары'),
  })

  const weighGrossMutation = useMutation({
    mutationFn: () => weighGross(id, Number(grossInput)),
    onSuccess: () => { invalidate(); toast.success('Брутто взвешено') },
    onError: () => toast.error('Ошибка взвешивания'),
  })

  const returnMutation = useMutation({
    mutationFn: () => createReturn(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: plumbLogKeys.lists() })
      toast.success('Возврат создан')
      router.push('/plumb/view/' + data.id)
    },
    onError: () => toast.error('Ошибка создания возврата'),
  })

  const deactivateMutation = useMutation({
    mutationFn: () => deactivatePlumbLog(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: plumbLogKeys.lists() })
      toast.success('Отвес деактивирован')
      router.push('/plumb')
    },
  })

  const selectedTransport = transports.find((t) => t.id === plumbLog?.transportId)

  // Ждём загрузки ВСЕХ нужных списков, чтобы Select сразу отображал labels
  const concreteLists = isConcrete ? bsuLoading || constructionsLoading : false
  const rawLists = !isConcrete && !!plumbLog ? nomenclaturesLoading : false
  const listsLoading = suppliersLoading || materialsLoading || transportsLoading || driversLoading ||
    concreteLists || rawLists

  if (isLoading || !plumbLog || listsLoading) {
    return (
      <div className="min-h-screen p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6">
      <div className="mb-6">
        <button
          onClick={() => router.push('/plumb')}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Журнал отвесов
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              Отвес ID: {id}
              {plumbLog.isReturn && (
                <span className="ml-2 text-sm font-normal text-warning bg-warning/10 rounded px-2 py-0.5">Возврат</span>
              )}
              {!plumbLog.isActive && (
                <span className="ml-2 text-sm font-normal text-destructive bg-destructive/10 rounded px-2 py-0.5">Неактивен</span>
              )}
            </h1>
            <p className="mt-1 text-muted-foreground text-sm">{fmt(plumbLog.firstWeighingAt)}</p>
          </div>
          <Button
            className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
            onClick={handleSubmit((data) => saveMutation.mutate(data))}
            disabled={saveMutation.isPending}
          >
            <Save className="h-4 w-4" />
            {saveMutation.isPending ? 'Сохранение...' : 'Сохранить данные'}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit((data) => saveMutation.mutate(data))}>
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="grid grid-cols-3 gap-8">
            {/* Колонка 1: Общие данные */}
            <div className="space-y-4">
              <SectionTitle>Общие данные</SectionTitle>

              <div className="space-y-1.5">
                <Label className="text-sm text-muted-foreground">Поставщик</Label>
                <Controller
                  name="supplierId"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value ? String(field.value) : ''} onValueChange={(v) => field.onChange(Number(v))}>
                      <SelectTrigger className="w-full bg-background-elevated border-border h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {suppliers.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm text-muted-foreground">Заказчик</Label>
                <Controller
                  name="customerId"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value ? String(field.value) : ''} onValueChange={(v) => field.onChange(Number(v))}>
                      <SelectTrigger className="w-full bg-background-elevated border-border h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {customers.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm text-muted-foreground">Материал</Label>
                <Controller
                  name="materialId"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value ? String(field.value) : ''} onValueChange={(v) => field.onChange(Number(v))}>
                      <SelectTrigger className="w-full bg-background-elevated border-border h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {materials.map((m) => <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {plumbLog.object && (
                <ReadonlyVal label="Объект" value={plumbLog.object.name} />
              )}

              {isConcrete ? (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-sm text-muted-foreground">Объём (м³)</Label>
                    <Controller
                      name="volume"
                      control={control}
                      render={({ field }) => (
                        <Input type="number" step="0.01" className="bg-background-elevated border-border h-9"
                          value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} />
                      )}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm text-muted-foreground">Объём возврата (м³)</Label>
                    <Controller name="returnVolume" control={control}
                      render={({ field }) => (
                        <Input type="number" step="0.01" className="bg-background-elevated border-border h-9"
                          value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} />
                      )} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm text-muted-foreground">Номер пломбы</Label>
                    <Controller name="sealNumber" control={control}
                      render={({ field }) => (
                        <Input className="bg-background-elevated border-border h-9" value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value || undefined)} />
                      )} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm text-muted-foreground">Осадка конуса (см)</Label>
                    <Controller name="slumpCone" control={control}
                      render={({ field }) => (
                        <Input type="number" step="0.1" className="bg-background-elevated border-border h-9"
                          value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} />
                      )} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm text-muted-foreground">Тип перевозки</Label>
                    <Controller name="deliveryType" control={control}
                      render={({ field }) => (
                        <Input className="bg-background-elevated border-border h-9" value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value || undefined)} />
                      )} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm text-muted-foreground">Конструкция</Label>
                    <Controller name="constructionId" control={control}
                      render={({ field }) => (
                        <Select value={field.value ? String(field.value) : 'none'} onValueChange={(v) => field.onChange(v === 'none' ? undefined : Number(v))}>
                          <SelectTrigger className="w-full bg-background-elevated border-border h-9"><SelectValue placeholder="Не выбрана" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Не выбрана</SelectItem>
                            {constructions.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )} />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-sm text-muted-foreground">Номенклатура</Label>
                    <Controller name="nomenclatureId" control={control}
                      render={({ field }) => (
                        <Select value={field.value ? String(field.value) : 'none'} onValueChange={(v) => field.onChange(v === 'none' ? undefined : Number(v))}>
                          <SelectTrigger className="w-full bg-background-elevated border-border h-9"><SelectValue placeholder="Не выбрана" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Не выбрана</SelectItem>
                            {nomenclatures.map((n) => <SelectItem key={n.id} value={String(n.id)}>{n.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm text-muted-foreground">Сорность (%)</Label>
                    <Controller name="impurity" control={control}
                      render={({ field }) => (
                        <Input type="number" step="0.01" className="bg-background-elevated border-border h-9"
                          value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} />
                      )} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm text-muted-foreground">Чистый нетто (кг)</Label>
                    <Controller name="cleanNet" control={control}
                      render={({ field }) => (
                        <Input type="number" className="bg-background-elevated border-border h-9"
                          value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} />
                      )} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm text-muted-foreground">Вес по документам (кг)</Label>
                    <Controller name="documentWeight" control={control}
                      render={({ field }) => (
                        <Input type="number" className="bg-background-elevated border-border h-9"
                          value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} />
                      )} />
                  </div>
                </>
              )}
            </div>

            {/* Колонка 2: Транспорт */}
            <div className="space-y-4">
              <SectionTitle>Данные по транспорту</SectionTitle>

              <div className="space-y-1.5">
                <Label className="text-sm text-muted-foreground">Водитель</Label>
                <Controller name="driverId" control={control}
                  render={({ field }) => (
                    <Select value={field.value ? String(field.value) : 'none'} onValueChange={(v) => field.onChange(v === 'none' ? undefined : Number(v))}>
                      <SelectTrigger className="w-full bg-background-elevated border-border h-9"><SelectValue placeholder="Не выбран" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Не выбран</SelectItem>
                        {drivers.map((d) => <SelectItem key={d.id} value={String(d.id)}>{d.fullName}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )} />
              </div>

              <ReadonlyVal label="Перевозчик" value={selectedTransport?.carrier?.name ?? plumbLog.carrier?.name ?? '—'} />

              <div className="space-y-1.5">
                <Label className="text-sm text-muted-foreground">Гос. номер</Label>
                <Controller name="transportId" control={control}
                  render={({ field }) => (
                    <Select value={field.value ? String(field.value) : ''} onValueChange={(v) => field.onChange(Number(v))}>
                      <SelectTrigger className="w-full bg-background-elevated border-border h-9"><SelectValue placeholder="Выберите транспорт" /></SelectTrigger>
                      <SelectContent>
                        {transports.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.plateNumber}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )} />
              </div>

              {isConcrete && (
                <div className="space-y-1.5">
                  <Label className="text-sm text-muted-foreground">БСУ</Label>
                  <Controller name="bsuId" control={control}
                    render={({ field }) => (
                      <Select value={field.value ? String(field.value) : 'none'} onValueChange={(v) => field.onChange(v === 'none' ? undefined : Number(v))}>
                        <SelectTrigger className="w-full bg-background-elevated border-border h-9"><SelectValue placeholder="Не выбран" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Не выбран</SelectItem>
                          {bsuList.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )} />
                </div>
              )}
            </div>

            {/* Колонка 3: Мониторинг + Вес */}
            <div className="space-y-6">
              <div>
                <SectionTitle>Данные по мониторингу</SectionTitle>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <ReadonlyVal label="Первое взвешивание" value={fmt(plumbLog.firstWeighingAt)} />
                    <ReadonlyVal label="Оператор" value={plumbLog.firstOperator?.fullName ?? '—'} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <ReadonlyVal label="Второе взвешивание" value={fmt(plumbLog.secondWeighingAt)} />
                    <ReadonlyVal label="Оператор" value={plumbLog.secondOperator?.fullName ?? '—'} />
                  </div>
                </div>
              </div>

              <div>
                <SectionTitle>Данные по весу</SectionTitle>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm text-muted-foreground">Тара, кг</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        className="bg-background-elevated border-border h-9 flex-1"
                        placeholder={plumbLog.tare != null ? String(plumbLog.tare) : '0'}
                        value={tareInput}
                        onChange={(e) => setTareInput(e.target.value)}
                        disabled={plumbLog.tare !== null}
                      />
                      <Button
                        type="button"
                        size="sm"
                        className="bg-primary hover:bg-primary/90 text-primary-foreground h-9 whitespace-nowrap"
                        disabled={plumbLog.tare !== null || !tareInput || weighTareMutation.isPending}
                        onClick={() => weighTareMutation.mutate()}
                      >
                        {plumbLog.tare !== null ? '✓ Взвешено' : 'Взвесить'}
                      </Button>
                    </div>
                    {plumbLog.tare !== null && (
                      <p className="text-xs text-muted-foreground">{plumbLog.tare.toLocaleString('ru-RU')} кг</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm text-muted-foreground">Брутто, кг</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        className="bg-background-elevated border-border h-9 flex-1"
                        placeholder={plumbLog.gross != null ? String(plumbLog.gross) : '0'}
                        value={grossInput}
                        onChange={(e) => setGrossInput(e.target.value)}
                        disabled={plumbLog.gross !== null}
                      />
                      <Button
                        type="button"
                        size="sm"
                        className="bg-primary hover:bg-primary/90 text-primary-foreground h-9 whitespace-nowrap"
                        disabled={plumbLog.gross !== null || !grossInput || weighGrossMutation.isPending}
                        onClick={() => weighGrossMutation.mutate()}
                      >
                        {plumbLog.gross !== null ? '✓ Взвешено' : 'Взвесить'}
                      </Button>
                    </div>
                    {plumbLog.gross !== null && (
                      <p className="text-xs text-muted-foreground">{plumbLog.gross.toLocaleString('ru-RU')} кг</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm text-muted-foreground">Нетто, кг</Label>
                    <div className="h-10 rounded-md border border-primary/20 bg-primary/10 px-4 flex items-center">
                      <span className="text-base font-semibold text-primary">
                        {plumbLog.net != null ? plumbLog.net.toLocaleString('ru-RU') : '—'}
                      </span>
                    </div>
                  </div>

                  {plumbLog.cleanNet != null && (
                    <ReadonlyVal label="Чистый вес, кг" value={plumbLog.cleanNet.toLocaleString('ru-RU')} />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Action bar */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => printTTN(plumbLog)}
        >
          <Printer className="h-4 w-4" />
          Распечатать ТТН
        </Button>
        <Button variant="outline" onClick={() => router.push('/plumb')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Вернуться назад
        </Button>
        <Button
          variant="outline"
          className="gap-2"
          onClick={handleSubmit((data) => saveMutation.mutate(data))}
          disabled={saveMutation.isPending}
        >
          <Pencil className="h-4 w-4" />
          Редактировать
        </Button>
        <Button
          variant="outline"
          className="gap-2"
          disabled={returnMutation.isPending}
          onClick={() => {
            if (window.confirm('Создать возврат для этого отвеса?')) {
              returnMutation.mutate()
            }
          }}
        >
          <RotateCcw className="h-4 w-4" />
          Возврат
        </Button>
        <Button
          variant="outline"
          className="gap-2 border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive ml-auto"
          disabled={deactivateMutation.isPending}
          onClick={() => {
            if (window.confirm('Деактивировать отвес? Это действие нельзя отменить.')) {
              deactivateMutation.mutate()
            }
          }}
        >
          <Trash2 className="h-4 w-4" />
          Удалить отвес
        </Button>
      </div>
    </div>
  )
}
