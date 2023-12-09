'use client'

import axios from 'axios'
import {
  DatabaseBackupIcon,
  KeyRoundIcon,
  LogOutIcon,
  NetworkIcon,
  RectangleHorizontalIcon,
  ServerIcon,
  SplitIcon,
  StretchHorizontalIcon,
} from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { useNodes, useServices } from '@/lib/swr'

import { ThemeToggle } from './ThemeToggle'

const LIMIT = 5

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Sidebar({ className }: SidebarProps) {
  const path = useLocation().pathname
  const is = (match: string) => (path === '/' + match ? 'default' : 'ghost')

  const services = useServices()
  const nodes = useNodes()
  const sorted = (services.data?.data || []).sort(
    (a, b) => b.UpdatedAt?.localeCompare(a.UpdatedAt!) || 0
  )

  return (
    <div className="pb-12 py-4">
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
              size="nav"
              className="w-full justify-start"
              asChild
            >
              <Link to={'/services/' + service.ID}>
                <RectangleHorizontalIcon className="mr-2 h-4 w-4 flex-shrink-0" />
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
          {nodes.data?.data?.map((node) => (
            <Button
              key={node.ID}
              variant="ghost"
              className="w-full justify-start"
              onClick={() => alert('todo')}
            >
              {node.Spec.Role === 'manager' ? (
                <NetworkIcon className="mr-2 h-4 w-4" />
              ) : (
                <ServerIcon className="mr-2 h-4 w-4" />
              )}
              {node.Description.Hostname}
            </Button>
          ))}
        </div>
      </div>
      <div className="px-3 py-2">
        <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
          Settings
        </h2>
        <div className="space-y-1">
          <Button variant="ghost" className="w-full justify-start" asChild>
            <Link to="/settings/authentication">
              <KeyRoundIcon className="mr-2 h-4 w-4" />
              Authentication
            </Link>
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
      <div className="flex gap-3 px-7 ">
        <ThemeToggle />
        <Button
          variant="outline"
          size="icon"
          onClick={async () => {
            await axios.post('/api/auth/logout')
            window.location.reload()
          }}
        >
          <LogOutIcon className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all" />
          <span className="sr-only">Sign out</span>
        </Button>
      </div>
    </div>
  )
}
