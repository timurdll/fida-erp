'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, Plus, MoreHorizontal, Pencil, Power } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/ui/dropdown-menu'
import { Skeleton } from '@/shared/ui/skeleton'
import { DictionarySheet } from '@/features/dictionaries/ui/DictionarySheet'
import { MaterialForm } from '@/features/dictionaries/ui/MaterialForm'
import { getMaterials, createMaterial, updateMaterial, activateMaterial, deactivateMaterial } from '@/entities/material/api/materialApi'
import type { Material, CreateMaterialDto } from '@/entities/material/model/types'
import { MaterialTypeLabel } from '@/entities/material/model/types'

function StatusBadge({ isActive }: { isActive: boolean }) {
  return isActive
    ? <span className="inline-flex items-center gap-1.5 text-xs text-success"><span className="h-1.5 w-1.5 rounded-full bg-success" />Активный</span>
    : <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />Неактивный</span>
}

export function MaterialsTab() {
  const [items, setItems] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Material | undefined>()
  const [saving, setSaving] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const load = useCallback(async (s: string, sf: typeof statusFilter) => {
    setLoading(true)
    try {
      const isActive = sf === 'all' ? undefined : sf === 'active'
      setItems(await getMaterials({ isActive, search: s || undefined }))
    } catch { toast.error('Ошибка загрузки материалов') } finally { setLoading(false) }
  }, [])

  useEffect(() => { const t = setTimeout(() => load(search, statusFilter), 300); return () => clearTimeout(t) }, [search, statusFilter, load])

  const handleSave = async (data: CreateMaterialDto) => {
    setSaving(true)
    try {
      if (editingItem) { await updateMaterial(editingItem.id, data); toast.success('Материал обновлён') }
      else { await createMaterial(data); toast.success('Материал создан') }
      setSheetOpen(false); load(search, statusFilter)
    } catch (e: any) { toast.error(e.message || 'Ошибка сохранения') } finally { setSaving(false) }
  }

  const handleActivate = async (item: Material) => {
    try { await activateMaterial(item.id); toast.success('Материал активирован'); load(search, statusFilter) }
    catch (e: any) { toast.error(e.message) }
  }

  const handleDeactivate = async (item: Material) => {
    try { await deactivateMaterial(item.id); toast.success('Материал деактивирован'); load(search, statusFilter) }
    catch (e: any) { toast.error(e.message || 'Ошибка деактивации') }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Поиск..." className="pl-9 bg-background-elevated border-border h-10" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <SelectTrigger className="w-[160px] bg-background-elevated border-border"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Все статусы</SelectItem><SelectItem value="active">Активные</SelectItem><SelectItem value="inactive">Неактивные</SelectItem></SelectContent>
          </Select>
        </div>
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => { setEditingItem(undefined); setSheetOpen(true) }}><Plus className="mr-2 h-4 w-4" />Добавить</Button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        {loading ? <div className="p-4 space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div> : (
          <table className="w-full">
            <thead><tr className="border-b border-border">
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Название</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Тип</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Плотность (т/м³)</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Статус</th>
              <th className="w-12 px-4 py-3" />
            </tr></thead>
            <tbody>
              {items.length === 0 ? <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">Ничего не найдено</td></tr>
                : items.map((item, i) => (
                  <tr key={item.id} className={`border-b border-border transition-colors hover:bg-background-elevated cursor-pointer ${i % 2 === 1 ? 'bg-white/[0.02]' : ''}`}
                    onClick={() => { setEditingItem(item); setSheetOpen(true) }}>
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{item.name}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{MaterialTypeLabel[item.type]}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{item.density ?? '—'}</td>
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
      <DictionarySheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={editingItem ? 'Редактировать материал' : 'Добавить материал'} onSave={() => formRef.current?.requestSubmit()} isSaving={saving}>
        <MaterialForm defaultValues={editingItem} onSubmit={handleSave} formRef={formRef} />
      </DictionarySheet>
    </div>
  )
}
