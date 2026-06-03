'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Printer, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'

export function WeighingRecordPage({ id }: { id: string }) {
  const [formData, setFormData] = useState({
    supplier: 'ОАО ФИДА Бетон',
    customer: 'ООО СтройИнвест',
    material: 'M-350',
    site: 'ЖК Солнечный',
    driver: 'Иванов Александр Петрович',
    plateNumber: 'A123BC 77',
    volume: '8',
    sealNumber: 'СП-2024-001234',
    slumpCone: '12',
    constructionType: 'Плита перекрытия',
    firstWeighingTime: '08:15:32',
    firstWeighingOperator: 'Смирнова Е.В.',
    secondWeighingTime: '09:42:18',
    secondWeighingOperator: 'Смирнова Е.В.',
    tare: '12500',
    gross: '32500',
  })

  const netWeight = parseInt(formData.gross) - parseInt(formData.tare)

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="mb-6">
        <Link 
          href="/weighing"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Журнал отвесов
        </Link>
        <h1 className="text-2xl font-semibold text-foreground">Карточка отвеса #12847</h1>
        <p className="mt-1 text-muted-foreground">3 июня 2026, 08:15</p>
      </div>

      {/* Form Card */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="grid grid-cols-3 gap-8">
          {/* Left Column - Общие данные */}
          <div className="space-y-6">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Общие данные</h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Поставщик</Label>
                <Select value={formData.supplier} onValueChange={(value) => setFormData(prev => ({ ...prev, supplier: value }))}>
                  <SelectTrigger className="w-full bg-background-elevated border-border h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ОАО ФИДА Бетон">ОАО ФИДА Бетон</SelectItem>
                    <SelectItem value="ООО Бетон Плюс">ООО Бетон Плюс</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Заказчик</Label>
                <Select value={formData.customer} onValueChange={(value) => setFormData(prev => ({ ...prev, customer: value }))}>
                  <SelectTrigger className="w-full bg-background-elevated border-border h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ООО СтройИнвест">ООО СтройИнвест</SelectItem>
                    <SelectItem value="АО МегаСтрой">АО МегаСтрой</SelectItem>
                    <SelectItem value="ИП Михайлов">ИП Михайлов</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Материал</Label>
                <Select value={formData.material} onValueChange={(value) => setFormData(prev => ({ ...prev, material: value }))}>
                  <SelectTrigger className="w-full bg-background-elevated border-border h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M-250">M-250</SelectItem>
                    <SelectItem value="M-350">M-350</SelectItem>
                    <SelectItem value="M-400">M-400</SelectItem>
                    <SelectItem value="M-500">M-500</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Объект</Label>
                <Select value={formData.site} onValueChange={(value) => setFormData(prev => ({ ...prev, site: value }))}>
                  <SelectTrigger className="w-full bg-background-elevated border-border h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ЖК Солнечный">ЖК Солнечный</SelectItem>
                    <SelectItem value="БЦ Центральный">БЦ Центральный</SelectItem>
                    <SelectItem value="Склад №5">Склад №5</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Center Column - Транспорт и прочее */}
          <div className="space-y-6">
            <div className="space-y-6">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Данные по транспорту</h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Водитель</Label>
                  <Select value={formData.driver} onValueChange={(value) => setFormData(prev => ({ ...prev, driver: value }))}>
                    <SelectTrigger className="w-full bg-background-elevated border-border h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Иванов Александр Петрович">Иванов Александр Петрович</SelectItem>
                      <SelectItem value="Петров Сергей Иванович">Петров Сергей Иванович</SelectItem>
                      <SelectItem value="Сидоров Константин Михайлович">Сидоров Константин Михайлович</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Гос. номер</Label>
                  <Input 
                    value={formData.plateNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, plateNumber: e.target.value }))}
                    className="bg-background-elevated border-border h-11"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Прочее</h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Объём (м³)</Label>
                  <Input 
                    value={formData.volume}
                    onChange={(e) => setFormData(prev => ({ ...prev, volume: e.target.value }))}
                    className="bg-background-elevated border-border h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Номер пломбы</Label>
                  <Input 
                    value={formData.sealNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, sealNumber: e.target.value }))}
                    className="bg-background-elevated border-border h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Конус, см</Label>
                  <Input 
                    value={formData.slumpCone}
                    onChange={(e) => setFormData(prev => ({ ...prev, slumpCone: e.target.value }))}
                    className="bg-background-elevated border-border h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Тип конструкции</Label>
                  <Select value={formData.constructionType} onValueChange={(value) => setFormData(prev => ({ ...prev, constructionType: value }))}>
                    <SelectTrigger className="w-full bg-background-elevated border-border h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Плита перекрытия">Плита перекрытия</SelectItem>
                      <SelectItem value="Фундамент">Фундамент</SelectItem>
                      <SelectItem value="Колонна">Колонна</SelectItem>
                      <SelectItem value="Стена">Стена</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Мониторинг и Вес */}
          <div className="space-y-6">
            <div className="space-y-6">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Данные по мониторингу</h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Первое взвешивание</Label>
                    <div className="bg-background-elevated border border-border rounded-md px-3 py-2.5 h-11 flex items-center">
                      <span className="text-sm text-foreground">{formData.firstWeighingTime}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Оператор</Label>
                    <div className="bg-background-elevated border border-border rounded-md px-3 py-2.5 h-11 flex items-center">
                      <span className="text-sm text-foreground">{formData.firstWeighingOperator}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Второе взвешивание</Label>
                    <div className="bg-background-elevated border border-border rounded-md px-3 py-2.5 h-11 flex items-center">
                      <span className="text-sm text-foreground">{formData.secondWeighingTime}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Оператор</Label>
                    <div className="bg-background-elevated border border-border rounded-md px-3 py-2.5 h-11 flex items-center">
                      <span className="text-sm text-foreground">{formData.secondWeighingOperator}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Данные по весу</h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Тара, кг</Label>
                    <Input 
                      value={formData.tare}
                      onChange={(e) => setFormData(prev => ({ ...prev, tare: e.target.value }))}
                      className="bg-background-elevated border-border h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Брутто, кг</Label>
                    <Input 
                      value={formData.gross}
                      onChange={(e) => setFormData(prev => ({ ...prev, gross: e.target.value }))}
                      className="bg-background-elevated border-border h-11"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Нетто, кг</Label>
                  <div className="bg-primary/10 border border-primary/20 rounded-md px-4 py-3 h-12 flex items-center">
                    <span className="text-lg font-semibold text-primary">{netWeight.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="mt-8 pt-6 border-t border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Printer className="mr-2 h-4 w-4" />
              Распечатать ТТН
            </Button>
            <Button variant="outline" className="border-border bg-background-elevated hover:bg-accent">
              <Pencil className="mr-2 h-4 w-4" />
              Редактировать
            </Button>
            <Button variant="outline" className="border-border bg-background-elevated hover:bg-accent" asChild>
              <Link href="/weighing">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Вернуться назад
              </Link>
            </Button>
          </div>
          <Button variant="outline" className="border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            Удалить отвес
          </Button>
        </div>
      </div>
    </div>
  )
}
