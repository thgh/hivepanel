import { ReactNode } from 'react'
import { Outlet } from 'react-router-dom'

import { ThemeProvider } from '@/lib/theme'

import { Sidebar } from './Sidebar'

export default function Layout({
  children,
  onboarding,
}: {
  children?: ReactNode
  onboarding?: boolean
}) {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <div className="sm:order-1 sm:w-[calc(100vw-16rem)] sm:overflow-x-hidden">
        {children}
        <Outlet />
      </div>
      <div className="sm:w-64 sm:border-r basis-0 flex-shrink-0 flex-grow">
        <Sidebar />
      </div>
    </ThemeProvider>
  )
}
