'use client'

import { ColumnDef } from '@tanstack/react-table'
import { PauseCircleIcon, PlayIcon, TerminalSquareIcon } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import useSWR from 'swr'

import { Dated, humanDateMinute } from '@/lib/date'
import type { Service, ServiceSpec, Task, TaskAndStats } from '@/lib/docker'
import { updateService } from '@/lib/docker-client'
import { parseImageName } from '@/lib/docker-util'
import { formatBytes2, thousand2 } from '@/lib/formatBytes'
import { splitHostnames } from '@/lib/labels'
import { fetcher, useServerState } from '@/lib/swr'
import { SwarmLabel } from '@/lib/types'
import { refreshServices } from '@/lib/useRefresh'

import { DataTable, SortButton } from './DataTable'
import { Button } from './ui/button'

export const columns: ColumnDef<Service>[] = [
  {
    id: 'cmd',
    cell: ({ row }) => {
      return (
        <Link
          to={'/?service=' + row.original.ID + '&tab=logs'}
          className="flex -m-4 py-4 pl-4 group"
          onClick={(evt) => evt.stopPropagation()}
        >
          <TerminalSquareIcon className="stroke-[1.5px] opacity-50 group-hover:opacity-100" />
          {/* <TerminalIcon className="opacity-40 opacity-60 group-hover:text-background group-hover:bg-foreground group-hover:opacity-70 rounded" /> */}
        </Link>
      )
    },
  },
  {
    id: 'name',
    accessorKey: 'Spec.Name',
    header: ({ column }) => <SortButton column={column}>Name</SortButton>,
    cell: ({ row }) => {
      const name = row.original.Spec.Name
      const state = useServerState()
      const labels = state.data?.swarm?.Spec.Labels as Partial<
        Record<SwarmLabel, string>
      >
      if (labels && labels['hive.caddy.service'] === name)
        return (
          <div className="-my-2">
            <div>Caddy</div>
            <div className="text-muted-foreground text-xs">webserver</div>
          </div>
        )
      return (
        <div className="-my-2">
          <Button
            variant="ghost"
            size="sm"
            className="-my-[8px] -mx-3 text-left"
          >
            {name}
          </Button>
        </div>
      )
    },
  },
  {
    id: 'image',
    accessorKey: 'Spec.TaskTemplate.ContainerSpec.Image',
    header: ({ column }) => (
      <SortButton column={column}>Hostname / Image</SortButton>
    ),
    cell: ({ row }) => {
      const spec: ServiceSpec = row.original.Spec
      const image = parseImageName(row.getValue('image'))
      const hostname = spec.Labels['hive.hostnames']
      if (hostname) {
        let first = splitHostnames(hostname)[0]
        if (first === '*') first = window.location.hostname
        return (
          <a
            className="block -my-2 group"
            href={'http://' + first}
            target="_blank"
            onClick={(evt) => {
              evt.stopPropagation()
            }}
          >
            <div className="group-hover:underline group-focus-visible:underline">
              {first}
            </div>
            <div className="text-muted-foreground text-xs flex max-w-[200px] whitespace-nowrap">
              {image.repo ? (
                <>
                  <div className="flex-shrink text-ellipsis overflow-hidden">
                    {image.repo}
                  </div>
                  /
                </>
              ) : null}
              <div className="flex-shrink text-ellipsis overflow-hidden">
                {image.name}
              </div>
              {image.tag ? (
                <div className="flex-shrink-0">:{image.tag}</div>
              ) : null}
            </div>
          </a>
        )
      }
      return (
        <div
          className="-my-2 group cursor-pointer"
          onClick={async (evt) => {
            evt.stopPropagation()
            const hostnames = prompt('Add hostname')
            if (!hostnames) return
            await updateService(row.original, (spec) => ({
              ...spec,
              Labels: {
                ...spec.Labels,
                'hive.hostnames': hostnames,
              },
            }))
            refreshServices()
          }}
        >
          <div className="group-hover:underline font-medium invisible group-hover:visible text-muted-foreground">
            Add hostname...
          </div>
          <div className="text-muted-foreground text-xs flex max-w-[210px] whitespace-nowrap">
            {image.repo ? (
              <>
                <div className="flex-shrink text-ellipsis overflow-hidden">
                  {image.repo}
                </div>
                /
              </>
            ) : null}
            <div className="flex-shrink text-ellipsis overflow-hidden">
              {image.name}
            </div>
            {image.tag ? (
              <div className="flex-shrink-0">:{image.tag}</div>
            ) : null}
          </div>
        </div>
      )
    },
  },
  // {
  //   id: 'labels',
  //   accessorFn: (row) => row.Spec?.Labels?.['hive.tint'],
  //   header: ({ column }) => <SortButton column={column}>Labels</SortButton>,
  //   cell: ({ row }) => {
  //     const labels = row.original.Spec.Labels
  //     return (
  //       <div className="flex flex-wrap gap-2">
  //         {Object.entries(labels || {})
  //           .filter(([k, v]) => !k.startsWith('caddy.') && k !== 'caddy')
  //           .filter(([k, v]) => !k.startsWith('traefik.'))
  //           .filter(([k, v]) => !k.startsWith('hive.'))
  //           .map(([key, value]) => (
  //             <div
  //               key={key}
  //               className="bg-muted text-muted-foreground text-xs rounded-full px-2 py-1 -my-[2px] text-ellipsis max-w-xs overflow-hidden"
  //               onClick={async () => {
  //                 if (!confirm(`Delete label "${key}": "${value}"?`)) return
  //                 await updateService(row.original, (spec) => {
  //                   delete spec.Labels[key as ServiceLabel]
  //                   return spec
  //                 })
  //                 refreshServices(1)
  //               }}
  //             >
  //               {key.length > 64 ? 'K' + key.length : key}{' '}
  //               {value!.length > 64 ? 'V' + value!.length : value}
  //             </div>
  //           ))}
  //         <Button
  //           type="button"
  //           size="icon"
  //           variant="outline"
  //           className="-my-[10px] text-muted-foreground"
  //           onClick={async () => {
  //             const key = prompt('Key')!
  //             const value = prompt('Value')!
  //             await updateService(row.original, (spec) => ({
  //               ...spec,
  //               Labels: {
  //                 ...spec.Labels,
  //                 [key]: value.replaceAll('\\n', '\n'),
  //               },
  //             }))
  //             refreshServices(1)
  //           }}
  //         >
  //           <PlusIcon />
  //         </Button>
  //       </div>
  //     )
  //   },
  // },
  // {
  //   accessorKey: 'CreatedAt',
  //   header: ({ column }) => (
  //     <div className="text-right">
  //       <SortButton column={column} alignRight>
  //         Created
  //       </SortButton>
  //     </div>
  //   ),
  //   cell: ({ row }) => {
  //     return (
  //       <div className="text-right font-medium">
  //         {humanDateMinute(row.getValue('CreatedAt'))}
  //       </div>
  //     )
  //   },
  // },
  {
    accessorKey: 'UpdatedAt',
    header: ({ column }) => (
      <div className="text-right">
        <SortButton column={column} alignRight>
          Updated
        </SortButton>
      </div>
    ),
    cell: ({ row }) => {
      const tasks = useSWR<Dated<TaskAndStats[]>>('/api/stats', fetcher, {
        refreshInterval: 30000,
      }).data?.data.filter(({ task }) => task.ServiceID === row.original.ID)
      if (tasks) {
        const recent = tasks.sort((a, b) =>
          b.task.CreatedAt.localeCompare(a.task.CreatedAt)
        )
        const runningIndex = recent.findIndex(
          ({ task }) => task.Status.State === 'running'
        )
        const running = recent[runningIndex]
        const notrunning = recent.slice(0, runningIndex)
        const desired = notrunning.some(
          ({ task }) => task.DesiredState !== 'shutdown'
        )

        if (notrunning.length && desired) {
          const statuses = notrunning
            .map((t) => t.task.Status)
            .reverse()
            .reduce(
              (acc, Status) => {
                if (!acc.length) return [{ Status, count: 1 }]
                if (acc[acc.length - 1].Status.State === Status.State) {
                  acc[acc.length - 1].count++
                } else {
                  acc.push({ Status, count: 1 })
                }
                return acc
              },
              [] as { count: number; Status: Task['Status'] }[]
            )
            .map((s) => (s.count > 1 ? s.count + ' ' : '') + s.Status.State)
            .join(', ')
          return (
            <div className="-my-2 text-muted-foreground whitespace-nowrap">
              <div className="flex items-center">
                {running && 'running'}
                <div className=" text-red-700 flex-1 text-right">
                  {statuses}
                </div>
              </div>
              <div className="flex">
                {running && (
                  <div className="text-xs ">
                    {humanDateMinute(running.task.Status.Timestamp)}
                  </div>
                )}
                <div className="text-xs text-red-700  flex-1  text-right">
                  {humanDateMinute(notrunning[0].task.Status.Timestamp)}
                </div>
              </div>
            </div>
          )
        }
      }
      return (
        <div className="text-right text-muted-foreground whitespace-nowrap">
          {humanDateMinute(row.getValue('UpdatedAt'))}
        </div>
      )
    },
  },
  // {
  //   id: 'cpu',
  //   accessorKey: 'Spec.TaskTemplate.Resources.Limits.NanoCPUs',
  //   header: ({ column }) => <SortButton column={column}>CPU</SortButton>,
  //   cell: ({ row }) => {
  //     const value: number = row.getValue('cpu')
  //     return (
  //       <div className="text-muted-foreground">{value ? value / 1e9 : ''}</div>
  //     )
  //   },
  // },
  {
    id: 'memory',
    accessorKey: 'memory',
    sortDescFirst: true,
    header: ({ column }) => (
      <div className="text-right">
        <SortButton column={column} alignRight>
          Memory
        </SortButton>
      </div>
    ),
    cell: ({ row }) => {
      const max = row.original.Spec.TaskTemplate?.Resources?.Limits?.MemoryBytes
      const memory = row.original.memory
      return (
        <div
          className={
            'text-right ' +
            (!memory && !max ? 'opacity-0 hover:opacity-100' : '')
          }
        >
          <Button
            size="sm"
            variant="ghost"
            className="-my-[8px] -mx-3 font-normal"
            onClick={async (evt) => {
              evt.stopPropagation()
              const limit = prompt(
                'Set memory limit in MB',
                '' + (max || 0) / thousand2 / thousand2
              )
              if (typeof limit !== 'string') return
              await updateService(row.original, (spec) => ({
                ...spec,
                TaskTemplate: {
                  ...spec.TaskTemplate,
                  Resources: {
                    ...spec.TaskTemplate?.Resources,
                    Limits: {
                      ...spec.TaskTemplate?.Resources?.Limits,
                      MemoryBytes: limit
                        ? thousand2 * thousand2 * parseInt(limit)
                        : undefined,
                    },
                  },
                },
              }))
              refreshServices()
            }}
          >
            {memory ? formatBytes2(memory) : undefined}
            <span className="text-muted-foreground">
              {memory && max ? <>&nbsp;/ </> : ''}
              {!memory && max ? 'Max ' : ''}
              {max ? formatBytes2(max) : ''}
              {!memory && !max ? 'Set limit...' : ''}
            </span>
          </Button>
        </div>
      )
    },
  },
  {
    id: 'replicas',
    accessorKey: 'Spec.Mode.Replicated.Replicas',
    header: ({ column }) => (
      <div className="text-right">
        <SortButton column={column} alignRight>
          Replicas
        </SortButton>
      </div>
    ),
    // On off
    cell: ({ row }) => {
      const value: number = row.getValue('replicas') || 0
      return (
        <div className="flex items-end justify-end">
          {value ? (
            <Button
              className="-my-[8px]"
              variant="ghost"
              size="sm"
              onClick={async (evt) => {
                evt.stopPropagation()
                await updateService(row.original, (spec) => {
                  const r = parseInt(
                    prompt(
                      'Set replicas',
                      '' + (spec.Mode?.Replicated?.Replicas || '')
                    )!
                  )
                  return {
                    ...spec,
                    Mode: {
                      ...spec.Mode,
                      Replicated: {
                        ...spec.Mode?.Replicated,
                        Replicas: r > -1 ? r : spec.Mode?.Replicated?.Replicas,
                      },
                    },
                  }
                })
                refreshServices(10)
              }}
            >
              {value}
            </Button>
          ) : null}
          <Button
            className="-my-[10px]"
            variant="outline"
            size="icon"
            onClick={async (evt) => {
              evt.stopPropagation()
              await updateService(row.original, (spec) => ({
                ...spec,
                Mode: {
                  ...spec.Mode,
                  Replicated: {
                    ...spec.Mode?.Replicated,
                    Replicas: spec.Mode?.Replicated?.Replicas
                      ? 0
                      : row.original.PreviousSpec?.Mode?.Replicated?.Replicas ||
                        1,
                  },
                },
              }))
              refreshServices(10)
            }}
          >
            {value ? (
              <PauseCircleIcon className="text-yellow-600" />
            ) : (
              <PlayIcon className="text-green-600" />
            )}
          </Button>
        </div>
      )
    },
  },
]

export function ServiceTable({ data }: { data: Service[] }) {
  const navigate = useNavigate()
  return (
    <DataTable
      columns={columns}
      data={data}
      onRowClick={(row) => {
        navigate('?service=' + row.original.ID)
      }}
    />
  )
}
