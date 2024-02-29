import { ContainerTaskSpec } from 'dockerode'
import { ShieldCheckIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import * as React from 'react'
import { useParams } from 'react-router-dom'
import useSWR from 'swr/immutable'

import { engine } from '@/client'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ServiceSpec } from '@/lib/docker'
import { getVolumeType } from '@/lib/docker-util'
import { str62 } from '@/lib/random'
import { fetcher, useServices } from '@/lib/swr'

// Global data

const appNameVariable = {
  id: '$$cap_appname',
  label: 'App Name',
  description:
    'This is your app name. Pick a name such as my-first-1-click-app',
  defaultValue: '',
  validRegex: '/^([a-z0-9]+\\-)*[a-z0-9]+$/',
}

const rootDomainParts = location.hostname.split('.')
const rootDomain =
  rootDomainParts.length > 1
    ? rootDomainParts.slice(1).join('.')
    : location.hostname

// Data hooks

function useOneClickApps(enable = true) {
  return useSWR<{ oneClickApps: IOneClickAppIdentifier[] }>(
    enable ? 'https://oneclickapps.caprover.com/v4/list' : null,
    fetcher
  )
}

function useOneClickApp(name?: string) {
  return useSWR<IOneClickTemplate>(
    name ? 'https://oneclickapps.caprover.com/v4/apps/' + name : null,
    fetcher
  )
}

// Components

export function OneClickAppSelect({
  children,
  onSelect,
}: {
  children?: React.ReactNode
  onSelect?: (value: string) => void
}) {
  const [open, setOpen] = React.useState(false)
  const swr = useOneClickApps(open)
  const apps = swr.data?.oneClickApps || []

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-64 p-0">
        <Command>
          <CommandInput placeholder="Search framework..." />
          <CommandEmpty>No framework found.</CommandEmpty>
          <CommandGroup className="max-h-96 overflow-auto">
            {apps.map((framework) => (
              <CommandItem
                key={framework.name}
                onSelect={async () => {
                  onSelect?.(framework.name)
                  setOpen(false)
                }}
              >
                {framework.isOfficial ? (
                  <ShieldCheckIcon className={'mr-2 h-4 w-4'} />
                ) : (
                  <div className={'mr-2 h-4 w-4'} />
                )}
                {framework.displayName}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export function OneClickApp() {
  const all = useServices()

  const params = useParams()
  const apps = useOneClickApps()
  const app = apps.data?.oneClickApps.find((app) => app.name === params.app)

  const template = useOneClickApp(params.app)
  const end = template.data?.caproverOneClickApp?.instructions?.end
  const start = template.data?.caproverOneClickApp?.instructions?.start
  const captainVersion = template.data?.captainVersion || -1
  const variables = useMemo(
    () => [
      appNameVariable,
      ...(template.data?.caproverOneClickApp?.variables || []),
    ],
    [template.data?.caproverOneClickApp?.variables]
  )

  const defaults = useMemo(() => {
    const defaults: Record<string, string> = {}
    for (const { id, defaultValue, description } of variables) {
      const value =
        typeof defaultValue === 'string' &&
        defaultValue.includes('$$cap_gen_random_hex')
          ? str62(20)
          : !defaultValue &&
              description?.includes('random') &&
              description?.includes('string')
            ? str62(20)
            : defaultValue
      if (value) defaults[id] = value
    }
    defaults.$$cap_appname = params.app!
    return defaults
  }, [template.data?.caproverOneClickApp?.displayName])
  const [form, setForm] = useState<Record<string, string>>({})

  const data = useMemo(() => ({ ...defaults, ...form }), [form, defaults])

  // loop over all variables and replace in the instructions
  const mapping = (text: string) =>
    Object.entries(data)
      .reduce(
        (acc, [key, value]) => acc.replaceAll(key, value || ''),
        text || ''
      )
      .replaceAll('srv-captain--', '')
      .replaceAll('$$cap_root_domain', rootDomain)

  const [created, setCreated] = useState<ServiceSpec[]>([])
  const services = useMemo(() => {
    if (!template.data?.services) return []
    const mapped: Record<string, IDockerComposeService> = JSON.parse(
      mapping(JSON.stringify(template.data.services))
    )
    // Ignore nameless services
    return Object.entries(mapped)
      .filter((s) => s[0])
      .map(([key, value]) => {
        const out = {
          Name: key,
          Labels: {
            'hive.hostnames': value.caproverExtra?.containerHttpPort
              ? key + '.' + rootDomain
              : undefined,
            'hive.deploy.image': value.image,
            'hive.port':
              typeof value.caproverExtra?.containerHttpPort === 'number' &&
              value.caproverExtra?.containerHttpPort !== 80
                ? '' + value.caproverExtra?.containerHttpPort
                : undefined,
          },
          TaskTemplate: {
            ContainerSpec: {
              Env: Object.entries(value.environment || {}).map(
                ([key, value]) => `${key}=${value || ''}`
              ),
              Mounts: value.volumes?.map((m: string) => {
                let ReadOnly = false
                if (m.endsWith(':ro')) {
                  ReadOnly = true
                  m = m.slice(0, -3)
                }

                const source = m.split(':')[0]
                const target = m.slice(source.length + 1)
                return {
                  Type: getVolumeType(source),
                  Source: target ? source : m,
                  Target: target || m,
                  ReadOnly,
                }
              }),
            },
          },
          EndpointSpec: { Ports: value.ports },
          value,
        } as ServiceSpec & { value: any }
        const ContainerSpec = (out.TaskTemplate as ContainerTaskSpec)!
          .ContainerSpec!
        delete value.image
        delete value.environment
        delete value.volumes
        delete value.ports
        if (value.restart === 'always') delete value.restart
        if (value.restart === 'unless-stopped') delete value.restart
        if (value.caproverExtra) {
          // dockerfileLines
          if (value.caproverExtra.dockerfileLines) {
            if (
              value.caproverExtra.dockerfileLines.length === 2 &&
              value.caproverExtra.dockerfileLines[0].startsWith('FROM') &&
              value.caproverExtra.dockerfileLines[1].startsWith('CMD')
            ) {
              out.Labels['hive.deploy.image'] =
                value.caproverExtra.dockerfileLines[0].split(' ')[1]
              ContainerSpec.Command = value.caproverExtra.dockerfileLines[1]
                .split(' ')
                .slice(1)
              if (ContainerSpec.Command![0] === 'exec')
                ContainerSpec.Command = ContainerSpec.Command!.slice(1)
              delete value.caproverExtra.dockerfileLines
            } else {
              out.Labels['hive.deploy.Dockerfile'] =
                value.caproverExtra.dockerfileLines.join('\n')
              delete value.caproverExtra.dockerfileLines
            }
          }
          if (value.caproverExtra.containerHttpPort)
            delete value.caproverExtra.containerHttpPort
          delete value.caproverExtra.notExposeAsWebApp
          if (Object.keys(value.caproverExtra).length === 0)
            delete out.value.caproverExtra
        }
        return out
      })
  }, [template.data?.services, data])

  return (
    <main className="p-6 w-full">
      {app?.logoUrl && (
        <img
          src={'/api/one-click-apps-logos/' + app.logoUrl}
          alt="Logo"
          className="h-24 object-contain mb-4"
        />
      )}
      <div className="space-y-0.5 mb-6">
        <h2 className="text-2xl font-bold tracking-tight">
          {app?.displayName}
        </h2>
        <p className="text-muted-foreground">{app?.description}</p>
        {app?.isOfficial && (
          <p className="text-muted-foreground text-xs">
            ✅ Uses the official image provided by the application developer, or
            a trusted source like Bitnami or LinuxServer
          </p>
        )}
      </div>
      {captainVersion < 4 ? (
        <div className="bg-red-100 text-red-700 p-4 rounded-md">
          This app has an old captainVersion and may not work as expected.
        </div>
      ) : captainVersion > 4 ? (
        <div className="bg-yellow-100 text-yellow-700 p-4 rounded-md">
          This app has a newer captainVersion and may not work as expected.
        </div>
      ) : captainVersion !== 4 ? (
        <div className="bg-red-100 text-red-700 p-4 rounded-md">
          Unexpected captainVersion {captainVersion} (should be 4)
        </div>
      ) : null}

      {start &&
        start !== app?.description &&
        start !== app?.description + '.' && (
          <p className="font-light rounded-md whitespace-pre-line max-w-2xl my-8 border p-4">
            {start}
          </p>
        )}

      <form
        className="flex flex-col gap-4 max-w-2xl"
        onSubmit={async (evt) => {
          evt.preventDefault()
          for (const service of services) {
            try {
              // create service
              await engine.post('/services/create', service)
              console.log('created', service)
              setCreated((created) => [...created, service])
            } catch (error) {}
          }
          all.mutate()
        }}
      >
        {variables?.map((variable) => (
          <div key={variable.id} className="grid gap-2">
            <Label htmlFor={variable.id}>
              {variable.label}
              {variable.description && (
                <div className="text-muted-foreground font-normal mt-1 text-xs">
                  {variable.description}
                </div>
              )}
            </Label>
            <Input
              id={variable.id}
              type="text"
              name={variable.id}
              autoComplete="off"
              data-lpignore="true"
              value={form[variable.id] || defaults[variable.id]}
              onChange={(e) =>
                setForm((form) => ({ ...form, [variable.id]: e.target.value }))
              }
            />
          </div>
        ))}

        {services.length > 0 && (
          <h3 className="text-xl font-medium">Preview</h3>
        )}
        <div className="flex flex-col gap-2">
          {services.map((service, key) => (
            <div key={key} className="border rounded-lg">
              <div className="p-4">
                <h4 className="text-lg font-medium">
                  {created.some((c) => c.Name === service.Name) ? (
                    <>✅</>
                  ) : null}{' '}
                  {service.Name}
                </h4>
                <p className="text-muted-foreground text-sm">
                  {service.Labels['hive.deploy.image']}
                  {service.Labels['hive.deploy.Dockerfile'] && (
                    <pre>{service.Labels['hive.deploy.Dockerfile']}</pre>
                  )}
                  <div>
                    {(
                      service.TaskTemplate as ContainerTaskSpec
                    ).ContainerSpec?.Command?.join(' ')}
                  </div>
                </p>
              </div>
              {service.value && Object.keys(service.value).length > 0 && (
                <pre className="overflow-auto bg-yellow-900 bg-opacity-40 text-xs p-3 rounded-b-lg border-t border-yellow-900 border-opacity-20">
                  These field were ignored:{' '}
                  {JSON.stringify(service.value, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>

        <div>
          <Button size="lg" type="submit" disabled={!services.length}>
            Deploy
          </Button>
        </div>
      </form>

      {end && (
        <p className="font-light rounded-md whitespace-pre-line max-w-2xl my-8 border p-4">
          {mapping(end)}
        </p>
      )}

      <div>
        <pre className="overflow-auto text-xs">
          {JSON.stringify(template.data?.services, null, 2)}
        </pre>
        <pre className="overflow-auto text-xs">
          {JSON.stringify(
            template.data?.caproverOneClickApp.variables,
            null,
            2
          )}
        </pre>
      </div>
    </main>
  )
}

/**
 * Copyright 2017-2020 Kasra Bigdeli
 * Licensed under the Apache License, Version 2.0 (the "License");
 *
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * https://github.com/caprover/caprover-frontend/blob/52aac6f3bab9395ae9b6ba4999852c364fb5170b/src/models/IOneClickAppModels.ts
 * https://raw.githubusercontent.com/caprover/caprover/b1e3d49b4b2573f95f97af3498604f0994f300a6/LICENSE
 */

export interface IOneClickAppIdentifier {
  sortScore?: number // 0-1 and dynamically calculated based on search terms
  isOfficial?: boolean
  name: string
  displayName: string
  description: string
  logoUrl: string
  baseUrl: string
}

export interface IOneClickVariable {
  id: string
  label: string
  defaultValue?: string
  validRegex?: string
  description?: string
}

export interface IDockerComposeService {
  image?: string
  volumes?: string[]
  ports?: string[]
  environment?: Record<string, string>
  depends_on?: string[]
  hostname?: string
  /** @deprecated ? */
  restart?: string

  // These are CapRover property, not DockerCompose. We use this instead of image if we need to extend the image.
  caproverExtra?: {
    dockerfileLines?: string[]
    containerHttpPort?: number
    notExposeAsWebApp?: boolean // This is actually a string "true", make sure to double negate!
    websocketSupport?: boolean // This is actually a string "true", make sure to double negate!
  }
}

export interface IOneClickTemplate {
  services: Record<string, IDockerComposeService>
  captainVersion: number
  caproverOneClickApp: {
    instructions: {
      start: string
      end: string
    }
    displayName: string
    variables: IOneClickVariable[]
  }
}

export interface IAppDefinitionBase {
  description?: string
  deployedVersion: number
  notExposeAsWebApp: boolean
  hasPersistentData: boolean
  hasDefaultSubDomainSsl: boolean
  containerHttpPort: number
  httpAuth?: {
    user: string
    password?: string
    passwordHashed?: string
  }
  captainDefinitionRelativeFilePath: string

  forceSsl: boolean
  websocketSupport: boolean
  nodeId?: string
  instanceCount: number
  preDeployFunction?: string
  serviceUpdateOverride?: string
  customNginxConfig?: string
  redirectDomain?: string
  networks: string[]
  customDomain: IAppCustomDomain[]
  tags?: IAppTag[]
  ports: IAppPort[]
  volumes: IAppVolume[]
  envVars: IAppEnvVar[]

  versions: IAppVersion[]
  appDeployTokenConfig?: AppDeployTokenConfig
}
