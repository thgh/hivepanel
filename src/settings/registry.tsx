import { Label } from '@radix-ui/react-dropdown-menu'
import { toast } from 'sonner'
import useSWR, { mutate } from 'swr'

import { engine } from '@/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { humanDateMinute } from '@/lib/date'
import { Service, ServiceSpec } from '@/lib/docker'
import { updateService } from '@/lib/docker-client'
import { getVolumeType } from '@/lib/docker-util'
import { formatBytes } from '@/lib/formatBytes'
import { str62 } from '@/lib/random'
import { fetcher, useServerState, useServices, useSwarmEditor } from '@/lib/swr'
import { ServerState } from '@/lib/types'

type ConfigBackup = {
  swarm: ServerState['swarm']
  services: Service[]
}

export default function SettingsRegistry() {
  // Form to create registry
  const { label, labels, flush } = useSwarmEditor()

  // Current registry details
  const registry = useSWR<{
    service: Service
    serviceName: string
    volume: string
  }>('/api/registry', fetcher)
  const service = registry.data?.service
  const serviceName = registry.data?.serviceName

  // Volume
  const volume = registry.data?.volume

  const vol = useSWR<{ size: number }>(
    service && volume
      ? '/api/disk-usage?volume=' + volume + '&service=' + serviceName
      : '/api/disk-usage?volume=' +
          (labels['hive.registry.volume'] || 'registry-data') +
          '&service=' +
          (labels['hive.registry.service'] || 'registry'),
    fetcher
  )
  const size = vol.data?.size

  return (
    <main className="p-6 w-full">
      <div className="space-y-0.5 mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Registry</h2>
        <p className="text-muted-foreground">Deploy private images</p>
      </div>

      {registry.isLoading ? (
        <div></div>
      ) : service ? (
        <>
          <div>Updated: {humanDateMinute(service.UpdatedAt)}</div>
          <div>Service name: {service.Spec.Name}</div>
          {volume && (
            <div>
              Volume: {volume} {size ? ' (' + formatBytes(size) + ')' : null}
            </div>
          )}

          {service.Spec.Labels['caddy.basicauth'] ? (
            <div>
              Basic Authentication handled by Caddy:{' '}
              {Object.entries(service.Spec.Labels)
                .filter(([key]) => key.startsWith('caddy.basicauth.'))
                .map(([key, value]) => (
                  <div className="pl-4">
                    Username: {key.slice(16)}
                    <br />
                    Password: ****{' '}
                    <Button
                      className="ml-3"
                      size="xs"
                      variant="secondary"
                      type="button"
                      onClick={() => alert('TODO')}
                    >
                      reset
                    </Button>
                  </div>
                ))}
            </div>
          ) : (
            <div>No authentication??</div>
          )}

          <Button
            className="my-6"
            variant="destructive"
            onClick={async () => {
              await engine.delete('/services/' + service.ID)
              toast('Registry deleted')
              registry.mutate()
              mutate('/api/engine/services')
            }}
          >
            Delete registry
          </Button>
        </>
      ) : (
        <form
          className="space-y-6 max-w-xl"
          onSubmit={async (evt) => {
            await flush(evt)

            const password = prompt(
              'Password\nThis value will be hashed before being stored, so copy it now.\nLeave empty to disable authentication.',
              str62(20)
            )
            if (password === null) return

            const Name = labels['hive.registry.service'] || 'registry'
            const Source = labels['hive.registry.volume'] || 'registry-data'
            await engine.post('/services/create', {
              Name,
              Labels: {
                'hive.hostnames': Name + '.localhost',
                'hive.port': '5000',
                ...(password
                  ? {
                      'caddy.basicauth': '/v2/*',
                      'caddy.basicauth.admin': password,
                    }
                  : {}),
              },
              TaskTemplate: {
                ContainerSpec: {
                  Image: 'registry',
                  Mounts: [
                    {
                      Target: '/var/lib/registry',
                      Source,
                      Type: getVolumeType(Source),
                    },
                  ],
                },
              },
              Mode: { Replicated: { Replicas: 1 } },
            } as ServiceSpec)
            toast('Registry created')
            registry.mutate()
            mutate('/api/engine/services')
            vol.mutate()
          }}
        >
          <div className="space-y-2">
            <Label>Service name</Label>
            <Input
              placeholder="Default: registry"
              value={labels['hive.registry.service'] || ''}
              onChange={(evt) =>
                label({ 'hive.registry.service': evt.target.value })
              }
            />
            <p className="text-sm text-slate-500 dark:text-slate-400"></p>
          </div>
          <div className="space-y-2">
            <Label>Volume</Label>
            <Input
              placeholder="Default: registry-data"
              value={labels['hive.registry.volume'] ?? 'registry-data'}
              onChange={(evt) =>
                label({ 'hive.registry.volume': evt.target.value })
              }
            />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              This volume will be mounted to /var/lib/registry and will contain
              the registry data.
            </p>
          </div>

          {volume && (
            <div>
              Volume disk usage: {size ? formatBytes(size) : null}{' '}
              <Button
                className="ml-3"
                size="xs"
                variant="secondary"
                type="button"
                onClick={async () => {
                  // delete volume
                  const ok = await engine.delete('/volumes/' + volume, {
                    params: { force: 'true' },
                    validateStatus: () => true,
                  })
                  vol.mutate()
                  console.log('del', ok.data)
                }}
              >
                reset
              </Button>
            </div>
          )}

          <Button type="submit">Create registry</Button>
        </form>
      )}

      <pre>{/* {JSON.stringify(registry.data, null, 2)} */}</pre>
    </main>
  )
}

function Inspect({
  config,
  onClose,
}: {
  config: ConfigBackup
  onClose: () => void
}) {
  const server = useServerState()
  const services = useServices()
  const labels = Object.fromEntries(
    Object.entries(config.swarm?.Spec.Labels || {}).filter(
      ([key]) =>
        key.startsWith('hive.link.') ||
        key.startsWith('hive.panel.hostnames') ||
        key.startsWith('hive.panel.https') ||
        key.startsWith('hive.panel.name') ||
        key.startsWith('hive.panel.port') ||
        key.startsWith('hive.panel.tag') ||
        key.startsWith('hive.panel.tint') ||
        key.startsWith('hive.panel.user')
      // Not session
    )
  )
  return (
    <div className="mb-6">
      <h3 className="text-xl font-medium">Swarm</h3>
      <pre className="text-sm text-muted-foreground my-4">
        {JSON.stringify(labels, null, 2)}
      </pre>
      <h3 className="text-xl font-medium">Services</h3>
      <table className="mb-6">
        <tbody>
          {config.services.map((service) => {
            const existing = services.data?.data?.find(
              (s) => s.Spec.Name === service.Spec.Name
            )
            return (
              <tr key={service.ID}>
                <th className="text-left pr-6 font-medium">
                  <input type="checkbox" checked /> {service.Spec.Name}
                </th>
                {/* <td>
                  {'ContainerSpec' in service.Spec.TaskTemplate! &&
                    service.Spec.TaskTemplate!.ContainerSpec?.Env?.length}
                </td> */}
                <td>{existing ? 'replace' : 'create'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <Button
        onClick={async () => {
          if (!config.swarm?.Version || !server.data?.swarm?.Spec) return
          await engine.post(
            '/swarm/update',
            {
              ...server.data.swarm.Spec,
              Labels: { ...server.data.swarm.Spec.Labels, ...labels },
            },
            { params: { version: server.data.swarm.Version!.Index } }
          )
          server.mutate()
          toast('Swarm updated')

          for (const service of config.services) {
            const existing = services.data?.data?.find(
              (s) => s.Spec.Name === service.Spec.Name
            )
            if (existing) {
              await updateService(existing, (_) => service.Spec)
              toast(`Service ${service.Spec.Name} updated`)
            } else {
              await engine.post('/services/create', service)
              toast(`Service ${service.Spec.Name} created`)
            }
          }
          services.mutate()
          onClose()
        }}
      >
        Apply
      </Button>
    </div>
  )
}
