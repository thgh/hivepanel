import { useEffect, useState } from 'react'
import { Outlet, useSearchParams } from 'react-router-dom'

import { EditServiceSheet } from '@/components/EditServiceSheet'
import { EnableHive } from '@/components/EnableHive'
import { OneClickAppSelect } from '@/components/OneClickAppSelect'
import { ServiceTable } from '@/components/ServiceTable'
import { Button } from '@/components/ui/button'
import { Card, CardHeader } from '@/components/ui/card'
import { EnableCaddy } from '@/components/webserver/caddy'
import { OverlayNetworkButton } from '@/components/webserver/OverlayNetwork'
import { EnableTraefik } from '@/components/webserver/traefik'
import { humanDateSecond } from '@/lib/date'
import type { ServiceSpec } from '@/lib/docker'
import { engine } from '@/lib/docker-client'
import { formatBytesRatio } from '@/lib/formatBytes'
import {
  panels,
  panelSync,
  registerPanel,
  useIsPanelRegistered,
} from '@/lib/panels'
import { useServerState, useServices, useServicesWithMemory } from '@/lib/swr'

export default function ServiceList() {
  const [live, setLive] = useState(0)
  const swr = useServices()
  const [search, setSearch] = useSearchParams()
  const withMemory = useServicesWithMemory()
  const sheetDetail = search.get('service')
    ? withMemory?.find((service) => service.ID === search.get('service'))
    : undefined
  const launch = async (name: string) => {
    const Name =
      name === 'hivepanel'
        ? 'hivepanel'
        : prompt('Service name', name.split('/')[0])
    if (!Name) return
    const Image =
      name === 'ping'
        ? 'alpine'
        : name === 'hivepanel'
        ? 'thgh/hivepanel'
        : prompt('Container image', name)
    if (!Image) return
    await engine.post<any, any, ServiceSpec>('/services/create', {
      Name,
      TaskTemplate: {
        ContainerSpec: {
          Image,
          Command:
            Image === 'alpine'
              ? [
                  'ping',
                  prompt('domain name to ping', 'example.org') || 'example.org',
                ]
              : undefined,
          Env:
            Image === 'postgres' ? ['POSTGRES_PASSWORD=password'] : undefined,
        },
        Networks: [{ Target: 'hivenet' }],
      },
      EndpointSpec:
        name === 'hivepanel'
          ? {
              Ports: [
                {
                  PublishedPort: 23088,
                  TargetPort: 80,
                  PublishMode: 'host',
                },
              ],
            }
          : undefined,
      Labels: {
        'hive.deploy.image': Image,
        'hive.hostnames': window.location.origin.includes('localhost')
          ? Name + '.localhost'
          : undefined,
        'hive.tint': Math.floor(Math.random() * 360).toString(),
      },
      Mode: { Replicated: { Replicas: 1 } },
    })
    swr.mutate()
  }
  const { data, error } = useServerState()
  const registered = useIsPanelRegistered()

  // const tasks = useSWR<Dated<Task[]>>('/api/engine/tasks', fetcher, {
  //   refreshInterval: 3000,
  // })

  useEffect(() => {
    if (!live) return
    console.log('refresh live', live)
    swr.mutate()
    const t = setTimeout(() => {
      setLive((live) => (live > 0 ? live - 1 : 0))
    }, 1200)
    return () => clearTimeout(t)
  }, [live])

  return (
    <>
      <div className="pt-6 px-6 text-sm opacity-60 left-0 -mb-2 flex flex-wrap gap-x-12 gap-y-2">
        <span>RAM free {formatBytesRatio(data?.freemem, data?.totalmem)}</span>
        <span>
          Load{' '}
          {data?.loadavg
            ? (data?.loadavg).map((load) => load.toPrecision(2)).join(' ')
            : ''}
        </span>
        <span>
          Disk free{' '}
          {data?.freedisk
            ? formatBytesRatio(data.freedisk, data?.totaldisk)
            : ''}
        </span>
      </div>
      <h1 className="pt-6 px-6 text-xl left-0 -mb-2 z-10 relative">
        Launch new service
      </h1>
      <div className="overflow-auto bg-background flex">
        <div className="p-6 gap-6 flex">
          <button
            className="group text-left"
            onClick={() => launch('nginxdemos/hello')}
            type="button"
          >
            <Card>
              <CardHeader className="w-44 font-semibold">nginxdemos</CardHeader>
            </Card>
          </button>
          <button
            className="group text-left"
            onClick={() => launch('ping')}
            type="button"
          >
            <Card>
              <CardHeader className="w-44 font-semibold">Ping test</CardHeader>
            </Card>
          </button>
          <button
            className="group text-left"
            onClick={() => launch('postgres')}
            type="button"
          >
            <Card>
              <CardHeader className="w-44 font-semibold">Postgres</CardHeader>
            </Card>
          </button>
          <button
            className="group text-left"
            onClick={() => launch('hivepanel')}
            type="button"
          >
            <Card>
              <CardHeader className="w-44 font-semibold">Hivepanel</CardHeader>
            </Card>
          </button>
          <OneClickAppSelect
            onSelect={() => {
              alert('TODO: add support for one-click-apps?')
            }}
          >
            <button className="group text-left" role="combobox">
              <Card>
                <CardHeader className="w-44 font-semibold">
                  One-Click-App
                </CardHeader>
              </Card>
            </button>
          </OneClickAppSelect>
        </div>
      </div>
      <main className="px-6">
        <h1 className="text-xl mb-4">
          <span className="opacity-50 float-right text-sm">
            refreshed at {humanDateSecond(swr.data?.at)}
          </span>
          Services{' '}
          <span className="text-muted-foreground ml-2">
            {withMemory?.length}
          </span>
        </h1>
        <ServiceTable data={withMemory || []} />
        <div className="h-12"></div>
        <div className="flex flex-wrap gap-4">
          <OverlayNetworkButton />
          <EnableCaddy />
          <EnableTraefik />
          <EnableHive />
          <Button
            variant={registered ? 'outline' : 'default'}
            onClick={() => {
              registerPanel()
            }}
          >
            Register recent
          </Button>
          {panelSync.hook()}
          {panels
            .hook()
            ?.data.map((panel) => (
              <div key={panel.origin}>Panel {panel.origin}</div>
            ))}
        </div>
        {/* <div className="flex gap-4 flex-col">
          {swr.data?.data.map((service) => (
            <ServiceCard
              service={service}
              tasks={tasks.data?.data.filter(
                (task) => task.ServiceID === service.ID
              )}
              onChange={(live) =>
                typeof live === 'number' ? setLive(live) : swr.mutate()
              }
              key={service.ID}
            />
          ))}
        </div> */}
        {/* <pre>{JSON.stringify(tasks.data?.data, null, 2)}</pre> */}
        {/* <pre>{JSON.stringify(swr.data?.data, null, 2)}</pre> */}
        <Outlet />
      </main>

      <EditServiceSheet
        open={!!sheetDetail}
        onClose={() =>
          setSearch((prev) => {
            prev.delete('service')
            return prev
          })
        }
        value={sheetDetail}
      />
    </>
  )
}
