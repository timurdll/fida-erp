'use client'

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/shared/ui/sheet'
import { Button } from '@/shared/ui/button'

interface DictionarySheetProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  onSave: () => void
  isSaving?: boolean
}

export function DictionarySheet({
  open,
  onClose,
  title,
  children,
  onSave,
  isSaving,
}: DictionarySheetProps) {
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-[480px] bg-card border-border flex flex-col">
        <SheetHeader className="border-b border-border px-6 pb-4">
          <SheetTitle className="text-foreground">{title}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">{children}</div>
        <div className="flex gap-2 border-t border-border px-6 pt-4 pb-2">
          <Button
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={onSave}
            disabled={isSaving}
          >
            {isSaving ? 'Сохранение...' : 'Сохранить'}
          </Button>
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={isSaving}>
            Отмена
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
