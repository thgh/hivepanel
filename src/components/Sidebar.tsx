'use client'

import {
  DatabaseBackupIcon,
  KeyRoundIcon,
  NetworkIcon,
  RectangleHorizontalIcon,
  ServerIcon,
  SplitIcon,
  StretchHorizontalIcon,
} from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { useServices } from '@/lib/swr'
import { cn } from '@/lib/utils'

import { ThemeToggle } from './ThemeToggle'

const LIMIT = 5

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Sidebar({ className }: SidebarProps) {
  const path = useLocation().pathname
  const is = (match: string) => (path === '/' + match ? 'default' : 'ghost')

  const services = useServices()
  const sorted = (services.data?.data || []).sort(
    (a, b) => b.UpdatedAt?.localeCompare(a.UpdatedAt!) || 0
  )

  return (
    <div className={cn('pb-12', className)}>
      <div className="py-4">
        <div className="px-3 py-2">
          <Link to="/">
            <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
              📦 Hivepanel
            </h2>
          </Link>
          <div className="space-y-1">
            <Button
              variant={is('services') || is('')}
              className="w-full justify-start"
              asChild
            >
              <Link to="/services">
                <StretchHorizontalIcon className="mr-2 h-4 w-4" />
                {services.data?.data?.length} services
              </Link>
            </Button>
            {sorted.slice(0, LIMIT).map((service) => (
              <Button
                key={service.ID}
                variant={is('services/' + service.ID)}
                className="w-full justify-start"
                asChild
              >
                <Link to={'/services/' + service.ID}>
                  <RectangleHorizontalIcon className="mr-2 h-4 w-4" />
                  {service.Spec?.Name}
                </Link>
              </Button>
            ))}
          </div>
        </div>
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
            Cluster
          </h2>
          <div className="space-y-1">
            <Button variant="ghost" className="w-full justify-start">
              <NetworkIcon className="mr-2 h-4 w-4" />
              Manager
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => alert('todo')}
            >
              <ServerIcon className="mr-2 h-4 w-4" />
              Worker 1
            </Button>
          </div>
        </div>
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
            Settings
          </h2>
          <div className="space-y-1">
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => alert('add users & set password')}
            >
              <KeyRoundIcon className="mr-2 h-4 w-4" />
              Authentication
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => alert('import/export')}
            >
              <DatabaseBackupIcon className="mr-2 h-4 w-4" />
              Backup
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => alert('manage traefik/nginx/caddy')}
            >
              <SplitIcon className="mr-2 h-4 w-4" />
              Web server
            </Button>
          </div>
        </div>
        <div className="px-7 ">
          <ThemeToggle />
        </div>
      </div>
    </div>
  )
}
