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
      <div className="w-64 border-r">
        <Sidebar />
      </div>
      <div className="w-full h-screen">
        {children}
        <Outlet />
      </div>
    </ThemeProvider>
  )
}
