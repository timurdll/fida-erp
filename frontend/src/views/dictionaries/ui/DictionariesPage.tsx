'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { CompaniesTab } from '@/widgets/dictionaries/ui/CompaniesTab'
import { ObjectsTab } from '@/widgets/dictionaries/ui/ObjectsTab'
import { MaterialsTab } from '@/widgets/dictionaries/ui/MaterialsTab'
import { ConstructionsTab } from '@/widgets/dictionaries/ui/ConstructionsTab'
import { DeliveryMethodsTab } from '@/widgets/dictionaries/ui/DeliveryMethodsTab'
import { CarriersTab } from '@/widgets/dictionaries/ui/CarriersTab'
import { DriversTab } from '@/widgets/dictionaries/ui/DriversTab'
import { TransportsTab } from '@/widgets/dictionaries/ui/TransportsTab'

const TABS = [
  { id: 'companies', label: 'Компании', component: CompaniesTab },
  { id: 'objects', label: 'Объекты', component: ObjectsTab },
  { id: 'materials', label: 'Материалы', component: MaterialsTab },
  { id: 'constructions', label: 'Конструкция', component: ConstructionsTab },
  { id: 'delivery-methods', label: 'Способ приёмки', component: DeliveryMethodsTab },
  { id: 'carriers', label: 'Перевозчик', component: CarriersTab },
  { id: 'drivers', label: 'Водители', component: DriversTab },
  { id: 'transports', label: 'Транспорт', component: TransportsTab },
]

export function DictionariesPage() {
  const [activeTab, setActiveTab] = useState('companies')

  return (
    <div className="min-h-screen p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Справочники</h1>
        <p className="mt-1 text-muted-foreground">Управление справочными данными системы</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-background-secondary h-10 p-1 flex-wrap gap-1">
          {TABS.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="data-[state=active]:bg-background-elevated data-[state=active]:text-foreground text-muted-foreground px-4"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {TABS.map(({ id, component: TabComponent }) => (
          <TabsContent key={id} value={id} className="mt-0">
            <TabComponent />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
