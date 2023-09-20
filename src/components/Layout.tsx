import { ReactNode } from 'react'

import { ThemeProvider } from '@/lib/theme'

import { Sidebar } from './Sidebar'
import { ScrollArea } from './ui/scroll-area'

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <div className="grid grid-flow-col-dense w-full">
        <div className="w-64 border-r">
          <Sidebar />
        </div>
        <ScrollArea className="w-full h-screen">{children}</ScrollArea>
      </div>
    </ThemeProvider>
  )
}
