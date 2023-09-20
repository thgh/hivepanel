'use client'

import axios from 'axios'
import { ShieldCheckIcon } from 'lucide-react'
import * as React from 'react'
import useSWR from 'swr/immutable'

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { fetcher } from '@/lib/swr'

export function OneClickAppSelect({
  children,
  onSelect,
}: {
  children?: React.ReactNode
  onSelect?: (value: string) => void
}) {
  const [open, setOpen] = React.useState(false)
  const swr = useSWR<{
    oneClickApps: { name: string; displayName: string; isOfficial: boolean }[]
  }>(open ? 'https://oneclickapps.caprover.com/v4/list' : null, fetcher)
  const apps = swr.data?.oneClickApps || []

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-64 p-0">
        <Command>
          <CommandInput placeholder="Search framework..." />
          <CommandEmpty>No framework found.</CommandEmpty>
          <CommandGroup className="max-h-96 overflow-auto">
            {apps.map((framework) => (
              <CommandItem
                key={framework.name}
                onSelect={async () => {
                  const { data: template } = await axios.get(
                    'https://oneclickapps.caprover.com/v4/apps/' +
                      framework.name
                  )
                  console.log('onSelect', template)
                  onSelect?.(template)
                  setOpen(false)
                }}
              >
                {framework.isOfficial ? (
                  <ShieldCheckIcon className={'mr-2 h-4 w-4'} />
                ) : (
                  <div className={'mr-2 h-4 w-4'} />
                )}
                {framework.displayName}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
