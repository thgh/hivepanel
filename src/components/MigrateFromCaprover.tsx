import { useMemo } from 'react'
import { toast } from 'sonner'
import useSWR from 'swr'

import { engine } from '@/client'
import { Service } from '@/lib/docker'
import { updateService } from '@/lib/docker-client'
import { fetcher, useServices } from '@/lib/swr'
import { ServiceLabel } from '@/lib/types'
import { IAppDefinitionBase } from '@/pages/OneClickApp'

import { Button } from './ui/button'

export default function MigrateFromCaprover() {
  const services = useServices()
  const sim = useSWR<{
    appDefinitions: Record<string, IAppDefinitionBase>
    diff: number
    hasHiveLabels: boolean
    customDomain?: string
  }>('/api/migrate-from-caprover', { fetcher })

  const diffs = useMemo(() => {
    if (!sim.data || !services.data) return []

    const diff = [] as {
      service?: Service
      name: string
      labels: Record<ServiceLabel, string>
    }[]
    for (const key in sim.data.appDefinitions) {
      const app = sim.data.appDefinitions[key]
      const service = services.data?.data.find(
        (s) => s.Spec.Name === 'srv-captain--' + key
      )
      if (!service) {
        diff.push({
          name: key,
          labels: convertToHiveSpec(app, key, sim.data.customDomain).hive,
        })
        continue
      }
      const { todo, hive } = convertToHiveSpec(app, key)
      const missing = {} as Record<ServiceLabel, string>
      for (const [k, value] of Object.entries(hive)) {
        const key = k as ServiceLabel
        if (service.Spec.Labels[key] !== value) missing[key] = value
      }
      if (Object.keys(missing).length)
        diff.push({ service, name: key, labels: missing })
    }

    return diff
  }, [sim.data, services.data])

  return (
    <div className="min-h-screen pt-8">
      <h2 className="text-xl mb-4">Migrate from Caprover</h2>
      <p>
        This migration tool will remove Caprover without deleting any data. It
        needs to shut down nginx before starting caddy which will cause a few
        seconds of downtime for all web applications.
      </p>

      {/* {Object.entries(sim.data?.appDefinitions || {}).map(([name, app]) => (
        <Preview key={name} app={app} name={name} />
      ))} */}
      <pre>
        {diffs
          .map((d) => `${d.name}:\n${JSON.stringify(d.labels, null, 2)}`)
          .join('\n\n')}
      </pre>
      <table>
        <tbody>
          <tr>
            <td className="text-center">
              {location.port === '23088' ? '✅' : <Button>Execute</Button>}
            </td>
            <td>
              <Button>Undo</Button>
            </td>
            <td className="pl-4">Open hivepanel on port 23088</td>
          </tr>
          <tr>
            <td className="text-center">
              {diffs.length === 0 ? (
                '✅'
              ) : (
                <Button
                  onClick={async () => {
                    for (const diff of diffs) {
                      if (diff.service) {
                        toast('Updating ' + diff.service.Spec.Name)
                        await updateService(diff.service, (spec) => ({
                          ...spec,
                          Labels: {
                            ...spec.Labels,
                            ...diff.labels,
                          },
                        }))
                      }
                    }
                    services.mutate()
                  }}
                >
                  Execute
                </Button>
              )}
            </td>
            <td>
              <div className="h-10"></div>
            </td>
            <td className="pl-4">Sync Caprover config to Hivepanel</td>
          </tr>
          <tr>
            <td className="text-center">
              {!services.data?.data.some(
                (s) =>
                  s.Spec.Name === 'captain-captain' &&
                  s.Spec.Mode.Replicated?.Replicas
              ) ? (
                '✅'
              ) : (
                <Button
                  disabled={
                    !services.data?.data.some(
                      (s) =>
                        s.Spec.Name === 'captain-captain' &&
                        s.Spec.Mode.Replicated?.Replicas
                    )
                  }
                  onClick={async () => {
                    await updateService(
                      services.data!.data.find(
                        (s) => s.Spec.Name === 'captain-captain'
                      )!,
                      (spec) => ({
                        ...spec,
                        Mode: { Replicated: { Replicas: 0 } },
                      })
                    )
                    toast('Captain service paused')
                    services.mutate()
                  }}
                >
                  Execute
                </Button>
              )}
            </td>
            <td>
              <Button
                disabled={services.data?.data.some(
                  (s) =>
                    s.Spec.Name === 'captain-captain' &&
                    s.Spec.Mode.Replicated?.Replicas
                )}
                onClick={async () => {
                  const paused = services.data?.data.find(
                    (s) => s.Spec.Name === 'captain-captain'
                  )
                  if (paused) {
                    await updateService(paused, (spec) => ({
                      ...spec,
                      Mode: { Replicated: { Replicas: 1 } },
                    }))
                    toast('Captain service resumed')
                  } else {
                    const ok = await createCaptain()
                    console.log('ok', ok.status, ok.data)
                    toast('Captain service created')
                  }
                  services.mutate()
                }}
              >
                Undo
              </Button>
            </td>
            <td className="pl-4">Stop captain-captain service</td>
          </tr>
          <tr>
            <td className="text-center">
              {!services.data?.data.some(
                (s) =>
                  s.Spec.Name === 'captain-certbot' &&
                  s.Spec.Mode.Replicated?.Replicas
              ) ? (
                '✅'
              ) : (
                <Button
                  disabled={
                    !services.data?.data.some(
                      (s) =>
                        s.Spec.Name === 'captain-certbot' &&
                        s.Spec.Mode.Replicated?.Replicas
                    )
                  }
                  onClick={async () => {
                    await updateService(
                      services.data!.data.find(
                        (s) => s.Spec.Name === 'captain-certbot'
                      )!,
                      (spec) => ({
                        ...spec,
                        Mode: { Replicated: { Replicas: 0 } },
                      })
                    )
                    services.mutate()
                    toast('Certbot service stopped')
                  }}
                >
                  Execute
                </Button>
              )}
            </td>
            <td>
              <Button
                disabled={services.data?.data.some(
                  (s) =>
                    s.Spec.Name === 'captain-certbot' &&
                    s.Spec.Mode.Replicated?.Replicas
                )}
                onClick={async () => {
                  await updateService(
                    services.data!.data.find(
                      (s) => s.Spec.Name === 'captain-certbot'
                    )!,
                    (spec) => ({
                      ...spec,
                      Mode: { Replicated: { Replicas: 1 } },
                    })
                  )
                  services.mutate()
                  toast('Certbot service resumed')
                }}
              >
                Undo
              </Button>
            </td>
            <td className="pl-4">Stop captain-certbot service</td>
          </tr>
          <tr>
            <td className="text-center min-w-20">
              {services.data?.data.some((s) => s.Spec.Name === 'hive-caddy') ? (
                '✅'
              ) : (
                <Button
                  disabled={services.data?.data.some(
                    (s) =>
                      (s.Spec.Name === 'captain-certbot' ||
                        s.Spec.Name === 'captain-captain') &&
                      s.Spec.Mode.Replicated?.Replicas
                  )}
                  variant="destructive"
                  onClick={async () => {
                    await engine.delete('/services/captain-nginx')
                    toast('nginx service removed')

                    // Start caddy
                    const web = services.data?.data.find(
                      (s) => s.Spec.Labels['hive.hostnames']
                    )
                    if (web) {
                      await updateService(web, (spec) => spec)
                      toast('caddy service started')
                    }
                    services.mutate()
                  }}
                >
                  Execute
                </Button>
              )}
            </td>
            <td>
              <Button
                disabled={
                  !services.data?.data.some((s) => s.Spec.Name === 'hive-caddy')
                }
                onClick={async () => {
                  // remove caddy service
                  await engine.delete('/services/hive-caddy')
                  // restart captain service
                  const captain = services.data?.data.find(
                    (s) => s.Spec.Name === 'captain-captain'
                  )
                  if (captain) {
                    await updateService(captain, (spec) => ({
                      ...spec,
                      Mode: { Replicated: { Replicas: 1 } },
                    }))
                    toast('captain service started')
                  }
                  services.mutate()
                }}
              >
                Undo
              </Button>
            </td>
            <td className="pl-4">
              Remove captain-nginx service and start caddy
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function Preview({ name, app }: { name: string; app: IAppDefinitionBase }) {
  const info: Partial<IAppDefinitionBase> = JSON.parse(JSON.stringify(app))
  const { todo, hive } = convertToHiveSpec(info, name)

  return (
    <div>
      <h3 className="text-lg font-semibold">{name}</h3>
      <pre>
        {Object.entries(hive)
          .map(([key, value]) => key + ': ' + value)
          .join('\n')}
      </pre>
      ---
      <pre>
        {Object.entries(todo)
          .map(([key, value]) => key + ': ' + JSON.stringify(value))
          .join('\n')}
      </pre>
    </div>
  )
}

function createCaptain() {
  return engine.post('/services/create', {
    Name: 'captain-captain',
    Labels: {
      'hive.tint': '171',
    },
  })
}

function convertToHiveSpec(
  info: Partial<IAppDefinitionBase>,
  name: string,
  customDomain?: string
) {
  const todo: Partial<IAppDefinitionBase> = JSON.parse(JSON.stringify(info))
  const hive = {} as Record<ServiceLabel, string>

  delete todo.captainDefinitionRelativeFilePath
  delete todo.hasPersistentData
  // delete info.nodeId // TODO
  if (!todo.preDeployFunction) delete todo.preDeployFunction
  if (!todo.serviceUpdateOverride) delete todo.serviceUpdateOverride
  delete todo.websocketSupport // Default enabled

  // Use Caddy labels instead
  delete todo.forceSsl
  delete todo.hasDefaultSubDomainSsl
  delete todo.redirectDomain

  // Saved on service
  delete todo.networks
  delete todo.envVars
  delete todo.volumes
  delete todo.ports

  // versions
  console.log(
    'info',
    todo,
    todo.deployedVersion,
    todo.versions?.find((v) => v.version === todo.deployedVersion)
  )

  hive['hive.deploy.image'] = todo.versions?.find(
    (v) => v.version === todo.deployedVersion
  ).deployedImageName
  delete todo.deployedVersion
  delete todo.versions

  // appDeployTokenConfig
  if (todo.appDeployTokenConfig?.appDeployToken)
    hive[`hive.key.${todo.appDeployTokenConfig.appDeployToken}`] = 'deploy'
  delete todo.appDeployTokenConfig

  // description
  if (todo.description) hive['hive.description'] = todo.description
  delete todo.description

  if (todo.tags?.length)
    for (const tag of todo.tags) hive[`hive.tag.${tag.tagName}`] = tag.tagName
  delete todo.tags

  // customDomain
  if (Array.isArray(todo.customDomain))
    for (const domain of todo.customDomain)
      hive['hive.hostnames'] =
        (hive['hive.hostnames'] ? hive['hive.hostnames'] + '\n' : '') +
        domain.publicDomain
  delete todo.customDomain

  // default subdomain
  if (!todo.notExposeAsWebApp)
    hive['hive.hostnames'] =
      (hive['hive.hostnames'] ? hive['hive.hostnames'] + '\n' : '') +
      (name + '.' + (customDomain || 'captain.localhost'))
  delete todo.notExposeAsWebApp

  // containerHttpPort
  if (todo.containerHttpPort) hive['hive.port'] = '' + todo.containerHttpPort
  delete todo.containerHttpPort

  // instanceCount
  if (typeof todo.instanceCount === 'number' && todo.instanceCount !== 1)
    hive['hive.replicas'] = '' + todo.instanceCount
  delete todo.instanceCount

  return { hive, todo }
}
