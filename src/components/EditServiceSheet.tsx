'use client'

import type { Service } from '../lib/docker'
import { EditServiceTabs } from './EditServiceTabs'
import { Sheet, SheetContent } from './ui/sheet'

export function EditServiceSheet({
  open,
  onClose,
  value,
}: {
  open: boolean
  onClose: () => void
  value?: Service
}) {
  return (
    <Sheet
      open={open}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <SheetContent
        side="right"
        className="w-[750px] max-w-[calc(100vw_-_50px)] h-full overflow-auto flex flex-col bg-white"
      >
        <EditServiceTabs value={value} onClose={onClose} sheet />
      </SheetContent>
    </Sheet>
  )
}
