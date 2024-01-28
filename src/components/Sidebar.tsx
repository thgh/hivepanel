'use client'

import { DropdownMenu } from '@radix-ui/react-dropdown-menu'
import axios from 'axios'
import {
  ChevronDownIcon,
  CylinderIcon,
  DatabaseBackupIcon,
  KeyRoundIcon,
  LogOutIcon,
  NetworkIcon,
  RectangleHorizontalIcon,
  SearchXIcon,
  ServerIcon,
  SplitIcon,
  StretchHorizontalIcon,
  StretchVerticalIcon,
} from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { useNodes, useServerState, useServices, useSwarmLinks } from '@/lib/swr'

import { ThemeToggle } from './ThemeToggle'
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'

const LIMIT = 5

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Sidebar({ className }: SidebarProps) {
  const path = useLocation().pathname
  const is = (match: string) => (path === '/' + match ? 'secondary' : 'ghost')

  const server = useServerState()
  const services = useServices()
  const nodes = useNodes()
  const swarmLinks = useSwarmLinks()
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

        <div className="mx-4">
          {swarmLinks?.links.length ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="w-full flex justify-between pl-3 pr-3"
                >
                  {/* <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" /> */}
                  {/* <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" /> */}
                  {server.data?.swarm?.Spec.Labels?.['hive.panel.name'] ||
                    window.location.host}
                  <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {swarmLinks.links.map((link, key) => (
                  <DropdownMenuItem asChild key={key}>
                    <a
                      href={link.url}
                      className="flex-col justify-start"
                      target="_blank"
                    >
                      <div className="font-medium"> {link.display}</div>
                      <div className="text-sm text-slate-500"> {link.url}</div>
                    </a>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>

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
          <Button
            variant={is('settings/authentication')}
            className="w-full justify-start"
            asChild
          >
            <Link to="/settings/authentication">
              <KeyRoundIcon className="mr-2 h-4 w-4" />
              Authentication
            </Link>
          </Button>
          <Button
            variant={is('settings/backup')}
            className="w-full justify-start"
            asChild
          >
            <Link to="/settings/backup">
              <DatabaseBackupIcon className="mr-2 h-4 w-4" />
              Backup
            </Link>
          </Button>
          <Button
            variant={is('settings/links')}
            className="w-full justify-start"
            asChild
          >
            <Link to="/settings/links">
              <StretchVerticalIcon className="mr-2 h-4 w-4" />
              Links
            </Link>
          </Button>
          <Button
            variant={is('settings/prune')}
            className="w-full justify-start"
            asChild
          >
            <Link to="/settings/prune">
              <SearchXIcon className="mr-2 h-4 w-4" />
              Prune
            </Link>
          </Button>
          <Button
            variant={is('settings/registry')}
            className="w-full justify-start"
            asChild
          >
            <Link to="/settings/registry">
              <CylinderIcon className="mr-2 h-4 w-4" />
              Registry
            </Link>
          </Button>
          <Button
            variant={is('settings/webserver')}
            className="w-full justify-start"
            asChild
          >
            <Link to="/settings/webserver">
              <SplitIcon className="mr-2 h-4 w-4" />
              Webserver
            </Link>
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
