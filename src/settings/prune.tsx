import { useState } from 'react'
import { toast } from 'sonner'

import { engine } from '@/client'
import { Button } from '@/components/ui/button'
import { humanDateSecond } from '@/lib/date'
import { Service } from '@/lib/docker'
import { updateService } from '@/lib/docker-client'
import { formatBytes, formatBytesRatio } from '@/lib/formatBytes'
import { useServerState, useServices, useSystemDF } from '@/lib/swr'
import { ServerState } from '@/lib/types'

type ConfigBackup = {
  swarm: ServerState['swarm']
  services: Service[]
}

export default function SettingsPrune() {
  // "container" "image" "volume" "build-cache"
  const { data } = useServerState()
  const df = useSystemDF()
  const images =
    df.data?.data?.Images?.sort((a, b) => a.Created - b.Created) || []

  const initial =
    df.data?.data?.Images.filter((i) => i.Containers === 0).map((i) => i.Id) ||
    []
  const [remove, setRemove] = useState<string[]>([])

  const [pruned, setPruned] = useState([] as string[])
  return (
    <main className="p-6 w-full">
      <div className="space-y-0.5 mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Prune</h2>
        <p className="text-muted-foreground">Cleanup disk space</p>
      </div>

      <span>
        Disk free{' '}
        {data?.freedisk ? formatBytesRatio(data.freedisk, data?.totaldisk) : ''}
      </span>

      <div className="my-6 flex gap-4">
        <Button
          variant="destructive"
          disabled={!(remove || initial).length}
          onClick={async () => {
            for (const Id of remove || initial) {
              try {
                const ok = await engine.delete(`/images/${Id}`, {
                  validateStatus: (status) => status < 300 || status === 409,
                })
                console.log(ok)
                if (ok.status === 409) {
                  const force = confirm('Force remove?\n' + ok.data.message)
                  toast('Force remove ' + (force ? 'enabled' : 'disabled'))
                  if (!force) throw new Error('Not forced')
                  else {
                    await engine.delete(`/images/${Id}?force=true`)
                  }
                }
                setRemove((prev) => prev.filter((id) => id !== Id))
                setPruned((prev) => [...prev, Id])
              } catch (error) {
                console.log('Prune image', Id, error)
              }
            }
            await new Promise((resolve) => setTimeout(resolve, 1000))
            df.mutate()
          }}
        >
          {remove ? 'Cleanup selected' : 'Cleanup dangling images'}
        </Button>
        <Button onClick={() => setRemove(initial)} variant="secondary">
          Select all
        </Button>
        <Button onClick={() => setRemove([])} variant="secondary">
          Deselect all
        </Button>
      </div>

      {images.length ? (
        <table>
          <tbody>
            <tr>
              <th className="text-left pr-6 font-medium"></th>
              <th className="text-left pr-6 font-medium">Image</th>
              <th className="text-left pr-6 font-medium">Self</th>
              <th className="text-left pr-6 font-medium">Size</th>
              <th className="text-left pr-6 font-medium">Shared</th>
              <th className="text-left pr-6 font-medium">Virtual</th>
              <th className="text-left pr-6 font-medium">Use</th>
              <th className="text-left pr-6 font-medium">Created</th>
            </tr>
            {images.map((image) => (
              <tr key={'img_' + image.Id}>
                <td className="pr-2">
                  {pruned.includes(image.Id) ? (
                    '❎'
                  ) : (
                    <input
                      type="checkbox"
                      id={'img_' + image.Id}
                      checked={(remove || initial).includes(image.Id)}
                      onChange={(evt) => {
                        if (evt.target.checked) {
                          setRemove((prev) => [...(prev || initial), image.Id])
                        } else {
                          setRemove(
                            (remove || initial).filter((id) => id !== image.Id)
                          )
                        }
                      }}
                    />
                  )}
                </td>
                <td className="pr-6 whitespace-pre-line">
                  {image.RepoTags?.join('\n') || '?'}
                </td>
                <td className="pr-6">
                  <label htmlFor={'img_' + image.Id}>
                    {formatBytes(image.Size - image.SharedSize)}
                  </label>
                </td>
                <td className="pr-6 opacity-40">
                  <label htmlFor={'img_' + image.Id}>
                    {formatBytes(image.Size)}
                  </label>
                </td>
                <td className="pr-6 opacity-40">
                  <label htmlFor={'img_' + image.Id}>
                    {formatBytes(image.SharedSize)}
                  </label>
                </td>
                <td className="pr-6 opacity-40">
                  <label htmlFor={'img_' + image.Id}>
                    {formatBytes(image.VirtualSize)}
                  </label>
                </td>
                <td className="pr-6">
                  <label htmlFor={'img_' + image.Id}>{image.Containers}</label>
                </td>
                <td className="pr-6 text-right">
                  <label htmlFor={'img_' + image.Id}>
                    {humanDateSecond(image.Created * 1000)}
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        'All clean!'
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
