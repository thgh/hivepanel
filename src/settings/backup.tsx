import { useState } from 'react'
import { toast } from 'sonner'

import { engine } from '@/client'
import { Button } from '@/components/ui/button'
import { Service } from '@/lib/docker'
import { updateService } from '@/lib/docker-client'
import { useServerState, useServices } from '@/lib/swr'
import { ServerState } from '@/lib/types'

type ConfigBackup = {
  swarm: ServerState['swarm']
  services: Service[]
}

export default function SettingsBackup() {
  const [config, setConfig] = useState<ConfigBackup>()
  return (
    <main className="p-6 w-full">
      <div className="space-y-0.5 mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Backup</h2>
        <p className="text-muted-foreground">
          Backup & restore configuration of the swarm and services
        </p>
      </div>

      {config ? (
        <>
          <Inspect config={config} onClose={() => setConfig(undefined)} />
        </>
      ) : (
        <div className="flex gap-4">
          <Button asChild>
            <a href="/api/config" download>
              Export
            </a>
          </Button>

          <Button asChild>
            <div className="relative">
              <input
                type="file"
                className="absolute inset-0 w-full h-full opacity-0"
                onChange={(evt) => {
                  const file = evt.target.files?.[0]
                  if (!file) return
                  const reader = new FileReader()
                  reader.onload = (evt) => {
                    const json = evt.target?.result
                    if (!json) return toast('Import faild: empty file')

                    let data: ConfigBackup
                    try {
                      data = JSON.parse(json as string)
                    } catch (err) {
                      return toast('Import faild: invalid file')
                    }
                    setConfig(data)
                  }
                  reader.readAsText(file)
                }}
              />
              Import
            </div>
          </Button>
        </div>
      )}
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
