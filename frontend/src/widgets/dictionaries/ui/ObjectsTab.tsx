'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { usePagination } from '@/shared/lib/use-pagination'
import { TablePagination } from '@/shared/ui/table-pagination'
import { Search, Plus, MoreHorizontal, Pencil, Power } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/ui/dropdown-menu'
import { Skeleton } from '@/shared/ui/skeleton'
import { DictionarySheet } from '@/features/dictionaries/ui/DictionarySheet'
import { DictionaryMobileCards } from "./DictionaryMobileCards"
import { ObjectForm } from '@/features/dictionaries/ui/ObjectForm'
import { getObjects, createObject, updateObject, activateObject, deactivateObject } from '@/entities/object/api/objectApi'
import type { ObjectItem, CreateObjectDto } from '@/entities/object/model/types'

function StatusBadge({ isActive }: { isActive: boolean }) {
  return isActive
    ? <span className="inline-flex items-center gap-1.5 text-xs text-success"><span className="h-1.5 w-1.5 rounded-full bg-success" />Активный</span>
    : <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />Неактивный</span>
}

export function ObjectsTab() {
  const [items, setItems] = useState<ObjectItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ObjectItem | undefined>()
  const [saving, setSaving] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const load = useCallback(async (s: string, sf: typeof statusFilter) => {
    setLoading(true)
    try {
      const isActive = sf === 'all' ? undefined : sf === 'active'
      setItems(await getObjects({ isActive, search: s || undefined }))
    } catch { toast.error('Ошибка загрузки объектов') } finally { setLoading(false) }
  }, [])

  useEffect(() => { const t = setTimeout(() => load(search, statusFilter), 300); return () => clearTimeout(t) }, [search, statusFilter, load])

  const handleSave = async (data: CreateObjectDto) => {
    setSaving(true)
    try {
      if (editingItem) { await updateObject(editingItem.id, data); toast.success('Объект обновлён') }
      else { await createObject(data); toast.success('Объект создан') }
      setSheetOpen(false); load(search, statusFilter)
    } catch (e: any) { toast.error(e.message || 'Ошибка сохранения') } finally { setSaving(false) }
  }

  const handleActivate = async (item: ObjectItem) => {
    try { await activateObject(item.id); toast.success('Объект активирован'); load(search, statusFilter) }
    catch (e: any) { toast.error(e.message) }
  }

  const handleDeactivate = async (item: ObjectItem) => {
    try { await deactivateObject(item.id); toast.success('Объект деактивирован'); load(search, statusFilter) }
    catch (e: any) { toast.error(e.message || 'Ошибка деактивации') }
  }

  const { page, setPage, pageItems, total, pageCount, from, to } = usePagination(items, 20, search + '|' + statusFilter)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Поиск..." className="pl-9 bg-background-elevated border-border h-10" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <SelectTrigger className="w-[160px] bg-background-elevated border-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все статусы</SelectItem>
              <SelectItem value="active">Активные</SelectItem>
              <SelectItem value="inactive">Неактивные</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => { setEditingItem(undefined); setSheetOpen(true) }}>
          <Plus className="mr-2 h-4 w-4" />Добавить
        </Button>
      </div>
      <div className="hidden overflow-x-auto rounded-lg border border-border bg-card md:block">
        {loading ? <div className="p-4 space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div> : (
          <table className="w-full">
            <thead><tr className="border-b border-border">
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Название</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Компания</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Адрес</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Тел. получателя</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Статус</th>
              <th className="w-12 px-4 py-3" />
            </tr></thead>
            <tbody>
              {items.length === 0 ? <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">Ничего не найдено</td></tr>
                : pageItems.map((item, i) => (
                  <tr key={item.id} className={`border-b border-border transition-colors hover:bg-background-elevated cursor-pointer ${i % 2 === 1 ? 'bg-foreground/[0.02]' : ''}`}
                    onClick={() => { setEditingItem(item); setSheetOpen(true) }}>
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{item.name}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{item.company?.name || '—'}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{item.address || '—'}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{item.receiverPhone || '—'}</td>
                    <td className="px-4 py-3"><StatusBadge isActive={item.isActive} /></td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-foreground"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setEditingItem(item); setSheetOpen(true) }}><Pencil className="mr-2 h-4 w-4" />Редактировать</DropdownMenuItem>
                          {item.isActive ? <DropdownMenuItem onClick={() => handleDeactivate(item)} className="text-destructive focus:text-destructive"><Power className="mr-2 h-4 w-4" />Деактивировать</DropdownMenuItem> : <DropdownMenuItem onClick={() => handleActivate(item)}><Power className="mr-2 h-4 w-4" />Активировать</DropdownMenuItem>}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>
      <DictionaryMobileCards
        loading={loading}
        items={items}
        pageItems={pageItems}
        getTitle={(item) => item.name}
        getRows={(item) => [
          { label: 'Компания', value: item.company?.name || '—' },
          { label: 'Адрес', value: item.address || '—' },
        ]}
        onEdit={(item) => { setEditingItem(item); setSheetOpen(true) }}
        onActivate={handleActivate}
        onDeactivate={handleDeactivate}
      />

      <TablePagination page={page} pageCount={pageCount} total={total} from={from} to={to} onPageChange={setPage} />

      <DictionarySheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={editingItem ? 'Редактировать объект' : 'Добавить объект'} onSave={() => formRef.current?.requestSubmit()} isSaving={saving}>
        <ObjectForm defaultValues={editingItem} onSubmit={handleSave} formRef={formRef} />
      </DictionarySheet>
    </div>
  )
}
