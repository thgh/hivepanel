import { Link } from 'react-router-dom'
import useSWR from 'swr'

import { Dated, humanDateSecond } from '@/lib/date'
import { ContainerStats, Service, Task, TaskInspect } from '@/lib/docker'
import { engine, updateService } from '@/lib/docker-client'
import { formatBytes } from '@/lib/formatBytes'
import { fetcher } from '@/lib/swr'

import { Button } from './ui/button'
import { Card } from './ui/card'

export function ServiceCard({
  service,
  tasks,
  onChange,
}: {
  service: Service
  tasks?: Task[]
  onChange: (live?: number) => void
}) {
  tasks = tasks
    ?.filter((task) => task.Status?.State !== 'shutdown')
    .sort((a, b) => -a.CreatedAt.localeCompare(b.CreatedAt))

  const replicas = service.Spec.Mode.Replicated?.Replicas
  return (
    <Card>
      <div className="flex px-4 py-3 gap-4">
        <Link
          to={'/services/' + service.ID}
          className={'text-lg' + (replicas === 0 ? ' opacity-40' : '')}
        >
          {service.Spec?.Name}
        </Link>
        <div className="flex-1"></div>
        {replicas ? (
          <Button
            variant={'outline'}
            onClick={async () => {
              await updateService(service, (spec) => {
                const r = parseInt(
                  prompt('Set replicas', '' + spec.Mode.Replicated?.Replicas)!
                )
                return {
                  ...spec,
                  Mode: {
                    ...spec.Mode,
                    Replicated: {
                      ...spec.Mode.Replicated,
                      Replicas: r > -1 ? r : spec.Mode.Replicated?.Replicas,
                    },
                  },
                }
              })
              onChange(10)
            }}
          >
            {replicas > 1 ? replicas + ' replicas' : 'Scale'}
          </Button>
        ) : (
          <Button
            variant={'outline'}
            onClick={async () => {
              if (!confirm('Are you sure?')) return
              await engine.delete('/services/' + service.ID)
              onChange(3)
            }}
          >
            Remove
          </Button>
        )}
        <Button
          variant={'outline'}
          onClick={async () => {
            await updateService(service, (spec) => ({
              ...spec,
              Mode: {
                ...spec.Mode,
                Replicated: {
                  ...spec.Mode.Replicated,
                  Replicas: spec.Mode.Replicated?.Replicas ? 0 : 1,
                },
              },
            }))
            onChange(10)
          }}
        >
          {service.Spec.Mode.Replicated?.Replicas ? 'Off' : 'On'}
        </Button>
      </div>
      {tasks?.length ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-4 px-4">
          {tasks?.map((task: any) => (
            <TaskCard
              key={task.ID}
              task={task}
              service={service}
              serviceMutate={() => onChange(10)}
            />
          ))}
        </div>
      ) : null}
      {/* <pre>{JSON.stringify(inspect.data?.data, null, 2)}</pre> */}
    </Card>
  )
}

function TaskCard({
  task,
  service,
  serviceMutate,
}: {
  task: TaskInspect
  service: Service
  serviceMutate: () => void
}) {
  const swr = useSWR<Dated<ContainerStats>>(
    task.Status?.ContainerStatus?.ContainerID
      ? '/api/engine/containers/' +
          task.Status.ContainerStatus.ContainerID +
          '/stats?stream=false'
      : null,
    fetcher
  )
  const stats = swr.data?.data
  return (
    <Card
      className={
        (task.Status?.State === 'rejected'
          ? '!text-red-600'
          : task.Status?.State === 'failed'
          ? 'text-slate-400'
          : '') + ' p-2'
      }
    >
      <div className="opacity-40 mr-2 text-xs">
        Created at {humanDateSecond(task.CreatedAt)}
      </div>{' '}
      {/* {task.Status?.Message} */}
      <div>
        {task.Status?.State}{' '}
        {task.DesiredState !== task.Status?.State
          ? ' -->' + task.DesiredState
          : ''}
      </div>
      {stats ? (
        <button
          type="button"
          onClick={async () => {
            const limit = prompt(
              'Set memory limit',
              '' + stats.memory_stats.limit / 1024 / 1024
            )
            await updateService(service, (spec) => ({
              ...spec,
              TaskTemplate: {
                ...spec.TaskTemplate,
                Resources: {
                  ...spec.TaskTemplate?.Resources,
                  Limits: {
                    ...spec.TaskTemplate?.Resources?.Limits,
                    MemoryBytes: limit
                      ? 1024 * 1024 * parseInt(limit)
                      : undefined,
                  },
                },
              },
            }))
            serviceMutate()
          }}
        >
          {stats.memory_stats.limit ? (
            <>
              {(
                (100 *
                  (stats.memory_stats?.usage -
                    (stats.memory_stats?.stats?.cache || 0))) /
                stats.memory_stats.limit
              ).toPrecision(2)}
              %{' '}
              <span className="opacity-50">
                of {formatBytes(stats.memory_stats.limit)} RAM
              </span>
            </>
          ) : stats.memory_stats?.usage ? (
            <>
              {formatBytes(
                stats.memory_stats?.usage -
                  (stats.memory_stats?.stats?.cache || 0)
              )}
            </>
          ) : null}
        </button>
      ) : null}
    </Card>
  )
}
