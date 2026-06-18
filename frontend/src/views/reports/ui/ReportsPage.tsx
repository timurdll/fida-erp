'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { ReportFilterPanel } from './ReportFilterPanel'

export function ReportsPage() {
  const [tab, setTab] = useState<'otvesy' | 'zayavki'>('otvesy')

  return (
    <div className="min-h-screen p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Отчёты</h1>
        <p className="mt-1 text-muted-foreground">Формирование и выгрузка отчётов в Excel</p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'otvesy' | 'zayavki')} className="space-y-6">
        <TabsList className="bg-background-secondary h-10 p-1">
          <TabsTrigger
            value="otvesy"
            className="data-[state=active]:bg-background-elevated data-[state=active]:text-foreground text-muted-foreground px-6"
          >
            Отвесы
          </TabsTrigger>
          <TabsTrigger
            value="zayavki"
            className="data-[state=active]:bg-background-elevated data-[state=active]:text-foreground text-muted-foreground px-6"
          >
            Заявки
          </TabsTrigger>
        </TabsList>

        <TabsContent value="otvesy" className="mt-0 max-w-3xl">
          <ReportFilterPanel tab="otvesy" />
        </TabsContent>

        <TabsContent value="zayavki" className="mt-0 max-w-3xl">
          <ReportFilterPanel tab="zayavki" />
        </TabsContent>
      </Tabs>
    </div>
  )
}
