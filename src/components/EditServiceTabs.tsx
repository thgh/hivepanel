'use client'

import type { ContainerTaskSpec } from 'dockerode'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { humanDateSecond } from '@/lib/date'
import { engine, updateService } from '@/lib/docker-client'
import { getVolumeType, isShortMount } from '@/lib/docker-util'
import { str62 } from '@/lib/random'
import { refreshServices } from '@/lib/useRefresh'

import type { Service, ServiceSpec } from '../lib/docker'
import { ErrorBoundary } from './ErrorBoundary'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import {
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from './ui/sheet'
import { Textarea } from './ui/textarea'

export function EditServiceTabs({
  onClose,
  value,
  sheet,
}: {
  onClose?: () => void
  value?: Service
  sheet?: boolean
}) {
  const navigate = useNavigate()
  const [search, setSearch] = useSearchParams()
  return (
    <Tabs
      className={
        search.get('tab') === 'logs' ? 'flex-col h-screen overflow-auto' : ''
      }
      defaultValue="edit"
      value={search.get('tab') || 'edit'}
      onValueChange={(tab) =>
        setSearch((prev) => {
          prev.set('tab', tab)
          return prev
        })
      }
    >
      <div className="top-0 sticky pl-6 pt-6">
        <TabsList className="">
          <TabsTrigger value="edit">Edit</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="edit" className="px-6 outline-none">
        {value && (
          <ErrorBoundary>
            <EditServiceForm
              key={value ? value.ID + value?.Version?.Index : ''}
              value={value}
              onClose={onClose || (() => navigate('/'))}
              sheet={sheet}
            />
          </ErrorBoundary>
        )}
      </TabsContent>
      <TabsContent value="logs" className="contents">
        <ErrorBoundary>{value && <ServiceLogs value={value} />}</ErrorBoundary>
      </TabsContent>
    </Tabs>
  )
}

function EditServiceForm({
  value,
  onClose,
  sheet,
}: {
  value: Service
  onClose?: () => void
  sheet?: boolean
}) {
  const [editor, setEditor] = useState(value.Spec)
  const TaskTemplate = editor.TaskTemplate as ContainerTaskSpec
  const ContainerSpec = TaskTemplate.ContainerSpec
  const [json, setJSON] = useState('')
  const invalid = json ? !isValidJSON(json) : false
  const label = (key: string, value: string | undefined) => {
    if (json) setJSON('')
    setEditor((spec) => ({ ...spec, Labels: { ...spec.Labels, [key]: value } }))
  }
  const mutate = (updater: (spec: ServiceSpec) => ServiceSpec) => {
    if (json) setJSON('')
    setEditor((obj) => updater(JSON.parse(JSON.stringify(obj))))
  }

  useEffect(() => {
    if (!invalid && json) setEditor(JSON.parse(json))
  }, [!invalid && json])

  // format to docker compose lines
  const mounts =
    ContainerSpec?.Mounts?.filter(isShortMount).map(
      (m) =>
        `${m.Source}${m.Target !== m.Source ? ':' + m.Target : ''}${
          m.ReadOnly ? ':ro' : ''
        }`
    ) || []

  const hasProxy = /[a-z]/.test(editor.Labels!['hive.hostnames'] || '')

  const hooks = Object.entries(editor.Labels)
    .filter(
      ([key, value]) => key.startsWith('hive.key.') && key.length > 9 && value
    )
    .map(([key, value]) => ({ key: key.slice(9), value }))

  return (
    <form
      className="contents"
      onSubmit={async (e) => {
        e.preventDefault()
        try {
          await updateService(value, () => (json ? JSON.parse(json) : editor))
          toast('Service spec updated')
          refreshServices(6)
          console.log('submit', json)
        } catch (error: any) {
          alert('Failed to save changes: ' + error.message)
        }
      }}
    >
      {sheet ? (
        <SheetHeader>
          <SheetTitle>Edit {editor.Name}</SheetTitle>
          <SheetDescription>Make changes to the service spec.</SheetDescription>
        </SheetHeader>
      ) : (
        <div className="space-y-0.5 mb-6">
          <h2 className="text-2xl font-bold tracking-tight">{editor.Name}</h2>
          <p className="text-muted-foreground">Manage the service spec.</p>
        </div>
      )}
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="image" className="text-right">
            Docker image
          </Label>
          <Input
            id="image"
            value={
              editor.Labels!['hive.deploy.image'] || ContainerSpec?.Image || ''
            }
            onChange={(evt) => label('hive.deploy.image', evt.target.value)}
            placeholder={ContainerSpec?.Image || 'nginxdemos/hello'}
            className="col-span-3"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="hostnames" className="text-right">
            Hostnames
          </Label>
          <Textarea
            id="hostnames"
            value={
              editor.Labels!['hive.hostnames']?.replaceAll(/[\s,;]+/g, '\n') ||
              ''
            }
            onChange={(evt) =>
              label(
                'hive.hostnames',
                evt.target.value?.replaceAll(/[\s;]+/g, '\n')
              )
            }
            rows={
              editor.Labels!['hive.hostnames']?.split(/[\s,;]+/g).length || 1
            }
            placeholder="example.test"
            className="col-span-3"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          {hasProxy ? (
            <Label htmlFor="port" className="text-right">
              Container port
            </Label>
          ) : (
            <Label htmlFor="ports" className="text-right">
              Expose ports
            </Label>
          )}
          <div className="col-span-3 flex gap-4 items-center">
            {hasProxy && (
              <>
                <Input
                  id="port"
                  value={editor.Labels!['hive.port'] || ''}
                  onChange={(evt) =>
                    label('hive.port', evt.target.value || undefined)
                  }
                  placeholder="80"
                />
                <Label htmlFor="ports" className="text-right whitespace-nowrap">
                  Expose ports
                </Label>
              </>
            )}
            <Textarea
              id="ports"
              value={
                editor.EndpointSpec?.Ports?.map(
                  (p) =>
                    `${p.PublishedPort || ''}${
                      p.TargetPort && p.TargetPort !== p.PublishedPort
                        ? ':' + p.TargetPort
                        : ''
                    }${
                      p.PublishMode && p.PublishMode !== 'ingress'
                        ? ':' + p.PublishMode
                        : ''
                    }${
                      p.Protocol && p.Protocol !== 'tcp' ? ':' + p.Protocol : ''
                    }${
                      typeof p.Name === 'string'
                        ? (p.PublishedPort ? ':' : '') + p.Name
                        : ''
                    }`
                ).join('\n') || ''
              }
              onChange={(evt) => {
                const ports = evt.target.value.split('\n')
                mutate((spec) => {
                  if (!spec.EndpointSpec) spec.EndpointSpec = {}
                  spec.EndpointSpec!.Ports = ports.map((p) => {
                    let PublishMode = 'ingress' as 'host',
                      Protocol = 'tcp' as any,
                      PublishedPort,
                      TargetPort
                    p = p.trimStart()
                    if (p.startsWith('- ')) p = p.slice(2)
                    let parts = p.split(':')
                    if (parts.includes('host')) PublishMode = 'host'
                    if (parts.includes('udp')) Protocol = 'udp'
                    if (parts.includes('sctp')) Protocol = 'sctp'
                    parts = parts.filter(
                      (p) => !['host', 'udp', 'sctp'].includes(p)
                    )
                    // regex to test if string is only numbers
                    if (parts[0] && /\d/.test(parts[0])) {
                      PublishedPort = parseInt(parts[0])
                      parts.shift()
                    }
                    if (parts[0] && /\d/.test(parts[0])) {
                      TargetPort = parseInt(parts[0])
                      parts.shift()
                    }
                    const Name = parts.length ? parts.join(':') : undefined

                    return {
                      PublishedPort,
                      TargetPort,
                      PublishMode,
                      Protocol,
                      Name,
                    }
                  })
                  return spec
                })
              }}
              rows={editor.EndpointSpec?.Ports?.length || 1}
              placeholder="host:container"
            />
          </div>
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="mounts" className="text-right">
            Mounts
          </Label>
          <Textarea
            id="mounts"
            rows={mounts.length || 1}
            value={mounts.join('\n') || ''}
            placeholder={'Example: node_modules:/app/node_modules'}
            onChange={(evt) =>
              mutate((spec) => {
                const mounts = evt.target.value.split('\n')
                const ContainerSpec = (spec.TaskTemplate as ContainerTaskSpec)
                  .ContainerSpec
                const before = ContainerSpec!.Mounts || []
                ContainerSpec!.Mounts = [
                  // Keep unsupported complex mounts
                  ...before.filter((m) => !isShortMount(m)),
                  // Add updated shorthand mounts
                  ...mounts.map((m) => {
                    m = m.trimStart()
                    if (m.startsWith('- ')) m = m.slice(2)

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
                ]

                return spec
              })
            }
            className="col-span-3  min-h-[38px]"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="env" className="text-right">
            Environment
          </Label>
          <Textarea
            id="env"
            rows={ContainerSpec?.Env?.length || 1}
            value={ContainerSpec?.Env?.join('\n') || ''}
            placeholder="PORT=80"
            onChange={(evt) =>
              mutate((spec) => {
                ;(spec.TaskTemplate as ContainerTaskSpec).ContainerSpec!.Env =
                  evt.target.value.split('\n')
                return spec
              })
            }
            className="col-span-3  min-h-[38px]"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="update" className="text-right">
            Update strategy
          </Label>
          <Select
            onValueChange={(value) => label('hive.update', value)}
            defaultValue={editor.Labels!['hive.update']}
          >
            <SelectTrigger id="update" className="w-[180px]">
              <SelectValue placeholder="Stop then start" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="stop-first">Stop then start</SelectItem>
              <SelectItem value="start-first">Zero-downtime</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="hook0" className="text-right">
            Deploy key
          </Label>
          <div className="col-span-3 flex gap-2 flex-col">
            {hooks.length ? (
              hooks.map((hook, index) => (
                <Input
                  key={index}
                  id={'hook' + index}
                  value={`1$${value.Spec.Name}$${hook.key}`}
                  type="password"
                  autoComplete="off"
                  data-lpignore
                  onMouseEnter={(evt) => {
                    ;(evt.target as HTMLInputElement).type = 'text'
                  }}
                  onMouseLeave={(evt) => {
                    ;(evt.target as HTMLInputElement).type = 'password'
                  }}
                  onChange={(evt) => {
                    let value = evt.target.value
                    if (value.includes('$')) value = value.split('$').pop()!
                    label('hive.key.' + hook.key, undefined)
                    if (value) label('hive.key.' + value, hook.value)
                  }}
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(
                        `1$${value.Spec.Name}$${hook.key}`
                      )
                      toast('Copied to clipboard')
                    } catch (error) {}
                  }}
                />
              ))
            ) : (
              <Input
                id="hook0"
                defaultValue=""
                placeholder="Click to create a deploy key"
                type="text"
                onClick={async () => {
                  try {
                    const key = str62(20)
                    label('hive.key.' + key, 'deploy')
                    await navigator.clipboard.writeText(
                      `1$${value.Spec.Name}$${key}`
                    )
                    toast('Copied to clipboard')
                  } catch (error) {}
                }}
              />
            )}
          </div>
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="username" className="text-right">
            Tint
          </Label>
          <Input
            type="range"
            id="username"
            min={0}
            max={360}
            value={editor.Labels!['hive.tint']}
            onChange={(evt) => label('hive.tint', evt.target.value)}
            className="col-span-3"
          />
        </div>
      </div>
      <div className="flex flex-col w-full gap-1.5 flex-1">
        <Label htmlFor="message">Spec</Label>
        <Textarea
          className="flex-1 min-h-[800px] font-mono"
          placeholder="{ ...Spec }"
          id="message"
          value={json || JSON.stringify(editor, null, 2)}
          onChange={(e) => setJSON(e.target.value)}
        />
      </div>
      <SheetFooter
        className={sheet ? 'bottom-0 sticky py-4' : 'bottom-4 fixed'}
      >
        <Button type="submit" disabled={invalid}>
          Save changes
        </Button>
        <Button
          type="button"
          variant="destructive"
          onClick={async () => {
            if (!confirm('Are you sure?')) return
            await engine.delete('/services/' + value.ID)
            toast('Service deleted')
            if (onClose) onClose()
            else window.location.href = '/'
            refreshServices(3)
          }}
        >
          Delete
        </Button>
      </SheetFooter>
    </form>
  )
}

function ServiceLogs({ value }: { value: Service }) {
  const [logs, setLogs] = useState('')
  const first = useRef(true)
  const ws = useRef<WebSocket>()
  const id = useRef<string>()
  const close = useRef<NodeJS.Timeout>()
  useEffect(() => {
    clearTimeout(close.current)
    // Close because of switch
    if (id.current && id.current !== value.ID) {
      ws.current?.close()
      id.current = undefined
      ws.current = undefined
    }
    // Open
    if (!id.current) {
      id.current = value.ID
      ws.current = new WebSocket(
        `${window.location.origin.replace('http', 'ws')}/services/${
          value.ID
        }/logs`
      )
      ws.current.onmessage = (e) => {
        setLogs((prev) => prev + e.data)
      }
    }
    return () => {
      close.current = setTimeout(() => {
        ws.current?.close()
        id.current = undefined
        ws.current = undefined
      }, 200)
    }
  }, [value.ID])

  const groupedPerTime = []
  let at = 0
  for (const line of logs.split('\n')) {
    const next = line.split(' ', 1)[0]
    const text = line.slice(next.length + 1)
    if (Math.abs(Date.parse(next) - at) > 100) {
      at = Date.parse(next)
      groupedPerTime.push(at)
    }
    groupedPerTime.push(text)
  }

  const followBottom = useRef(true)
  useEffect(() => {
    if (first.current) return
    if (!bottom.current) return

    const elem = bottom.current
    const parent = bottom.current.closest('.overflow-auto')
    if (!parent) return

    const listener = () => {
      if (!elem) return console.warn('no elem to follow')
      const rect = elem.getBoundingClientRect()
      const next = rect.top < window.innerHeight
      if (followBottom.current === next) return
      followBottom.current = next
      console.log('followBottom', next)
    }
    parent.addEventListener('scroll', listener, { passive: true })
    return () => {
      parent.removeEventListener('scroll', listener)
    }
  }, [first.current])

  const bottom = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!followBottom.current) return
    if (groupedPerTime.length < 40) return
    bottom.current?.scrollIntoView({
      behavior: first.current ? 'instant' : 'smooth',
    })

    let mounted = true
    const t = setTimeout(() => {
      if (mounted) first.current = false
    }, 500)
    return () => {
      mounted = false
      clearTimeout(t)
    }
  }, [groupedPerTime.length])

  return (
    <>
      <div className="p-6 text-xs flex-1">
        {groupedPerTime.map((line, i) =>
          typeof line === 'number' ? (
            <div key={i} className=" text-gray-500 mt-2 select-none">
              {new Date(line).toJSON()} - {humanDateSecond(line)}
            </div>
          ) : (
            <div className="font-mono" key={i}>
              {line}
            </div>
          )
        )}
      </div>
      <div ref={bottom} className="logbottom h-40"></div>
    </>
  )
}

function isValidJSON(str: string) {
  try {
    JSON.parse(str)
  } catch (e) {
    return false
  }
  return true
}
