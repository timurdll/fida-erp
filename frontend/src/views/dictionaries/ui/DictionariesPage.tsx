'use client'

import { useState } from 'react'
import { Search, Plus, Pencil, Power, MoreHorizontal } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'

type DictionaryItem = {
  id: string
  name: string
  code?: string
  status: 'active' | 'inactive'
  extra?: string
}

const companies: DictionaryItem[] = [
  { id: '1', name: 'ООО СтройИнвест', code: 'SI-001', status: 'active', extra: 'ИНН: 7701234567' },
  { id: '2', name: 'АО МегаСтрой', code: 'MS-002', status: 'active', extra: 'ИНН: 7702345678' },
  { id: '3', name: 'ИП Михайлов А.В.', code: 'MI-003', status: 'inactive', extra: 'ИНН: 770345678901' },
  { id: '4', name: 'ООО ПромСтрой', code: 'PS-004', status: 'active', extra: 'ИНН: 7704567890' },
  { id: '5', name: 'ЗАО Бетонные технологии', code: 'BT-005', status: 'active', extra: 'ИНН: 7705678901' },
]

const sites: DictionaryItem[] = [
  { id: '1', name: 'ЖК Солнечный', status: 'active', extra: 'г. Москва, ул. Ленина, 15' },
  { id: '2', name: 'БЦ Центральный', status: 'active', extra: 'г. Москва, пр. Мира, 100' },
  { id: '3', name: 'Склад №5', status: 'active', extra: 'МО, г. Химки, ул. Промышленная, 7' },
  { id: '4', name: 'Частный дом', status: 'inactive', extra: 'МО, д. Луговое, ул. Центральная, 1' },
]

const materials: DictionaryItem[] = [
  { id: '1', name: 'M-250', status: 'active', extra: 'Марка прочности B20' },
  { id: '2', name: 'M-350', status: 'active', extra: 'Марка прочности B25' },
  { id: '3', name: 'M-400', status: 'active', extra: 'Марка прочности B30' },
  { id: '4', name: 'M-500', status: 'active', extra: 'Марка прочности B40' },
]

const constructions: DictionaryItem[] = [
  { id: '1', name: 'Плита перекрытия', status: 'active' },
  { id: '2', name: 'Фундамент', status: 'active' },
  { id: '3', name: 'Колонна', status: 'active' },
  { id: '4', name: 'Стена', status: 'active' },
  { id: '5', name: 'Балка', status: 'inactive' },
]

const acceptanceMethods: DictionaryItem[] = [
  { id: '1', name: 'Автобетононасос', status: 'active' },
  { id: '2', name: 'Лоток', status: 'active' },
  { id: '3', name: 'Кран-бадья', status: 'active' },
]

const carriers: DictionaryItem[] = [
  { id: '1', name: 'ООО ТрансБетон', status: 'active', extra: 'Договор №TB-2024-001' },
  { id: '2', name: 'ИП Логистик', status: 'active', extra: 'Договор №IL-2024-015' },
  { id: '3', name: 'АО Перевозчик', status: 'inactive', extra: 'Договор истёк' },
]

const vehicles: DictionaryItem[] = [
  { id: '1', name: 'А123ВС 77', status: 'active', extra: 'КАМАЗ 65115, 8 м³' },
  { id: '2', name: 'В456DE 77', status: 'active', extra: 'МАЗ 5516, 8 м³' },
  { id: '3', name: 'С789FG 50', status: 'active', extra: 'КАМАЗ 6520, 10 м³' },
  { id: '4', name: 'D012HI 77', status: 'inactive', extra: 'На ремонте' },
]

const tabs = [
  { id: 'companies', label: 'Компании', data: companies },
  { id: 'sites', label: 'Объекты', data: sites },
  { id: 'materials', label: 'Материалы', data: materials },
  { id: 'constructions', label: 'Конструкция', data: constructions },
  { id: 'acceptance', label: 'Способ приемки', data: acceptanceMethods },
  { id: 'carriers', label: 'Перевозчик', data: carriers },
  { id: 'vehicles', label: 'Транспорт', data: vehicles },
]

function StatusBadge({ status }: { status: 'active' | 'inactive' }) {
  return status === 'active' ? (
    <span className="inline-flex items-center gap-1.5 text-xs text-success">
      <span className="h-1.5 w-1.5 rounded-full bg-success" />
      Активный
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
      Неактивный
    </span>
  )
}

function DictionaryTable({ items }: { items: DictionaryItem[] }) {
  return (
    <div className="rounded-lg border border-border bg-card">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Название</th>
            {items[0]?.code !== undefined && (
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Код</th>
            )}
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Дополнительно</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Статус</th>
            <th className="w-12 px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr 
              key={item.id}
              className={`border-b border-border transition-colors hover:bg-background-elevated ${index % 2 === 1 ? 'bg-white/[0.02]' : ''}`}
            >
              <td className="px-4 py-3 text-sm font-medium text-foreground">{item.name}</td>
              {item.code !== undefined && (
                <td className="px-4 py-3 text-sm text-muted-foreground font-mono">{item.code}</td>
              )}
              <td className="px-4 py-3 text-sm text-muted-foreground">{item.extra || '—'}</td>
              <td className="px-4 py-3">
                <StatusBadge status={item.status} />
              </td>
              <td className="px-4 py-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-foreground">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Pencil className="mr-2 h-4 w-4" />
                      Редактировать
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Power className="mr-2 h-4 w-4" />
                      {item.status === 'active' ? 'Деактивировать' : 'Активировать'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function DictionariesPage() {
  const [activeTab, setActiveTab] = useState('companies')

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Справочники</h1>
        <p className="mt-1 text-muted-foreground">Управление справочными данными системы</p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList className="bg-background-secondary h-10 p-1">
            {tabs.map((tab) => (
              <TabsTrigger 
                key={tab.id} 
                value={tab.id}
                className="data-[state=active]:bg-background-elevated data-[state=active]:text-foreground text-muted-foreground px-4"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Filters for each tab */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Поиск..."
                className="w-[280px] pl-9 bg-background-elevated border-border h-10"
              />
            </div>
            
            <Select defaultValue="all">
              <SelectTrigger className="w-[160px] bg-background-elevated border-border">
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="active">Активные</SelectItem>
                <SelectItem value="inactive">Неактивные</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Plus className="mr-2 h-4 w-4" />
            Добавить
          </Button>
        </div>

        {/* Tab Content */}
        {tabs.map((tab) => (
          <TabsContent key={tab.id} value={tab.id} className="mt-0">
            <DictionaryTable items={tab.data} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
