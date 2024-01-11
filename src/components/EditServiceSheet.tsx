'use client'

import type { ContainerTaskSpec } from 'dockerode'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { engine, updateService } from '@/lib/docker-client'
import { isShortMount, isVolumeName } from '@/lib/docker-util'
import { refreshServices } from '@/lib/useRefresh'

import type { Service, ServiceSpec } from '../lib/docker'
import { ErrorBoundary } from './ErrorBoundary'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from './ui/sheet'
import { Textarea } from './ui/textarea'

export function EditServiceSheet({
  open,
  onClose,
  value,
}: {
  open: boolean
  onClose: () => void
  value?: Service
}) {
  const [search, setSearch] = useSearchParams()
  return (
    <Sheet
      open={open}
      onOpenChange={(open) => {
        if (!open)
          setTimeout(() => {
            onClose()
          }, 200)
      }}
    >
      <SheetContent
        side="right"
        className="w-[750px] max-w-[calc(100vw_-_50px)] h-full overflow-auto flex flex-col bg-white"
      >
        <Tabs
          defaultValue="edit"
          value={search.get('tab') || 'edit'}
          onValueChange={(tab) =>
            setSearch((prev) => {
              prev.set('tab', tab)
              return prev
            })
          }
        >
          <TabsList className="top-0 sticky">
            <TabsTrigger value="edit">Edit</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
          </TabsList>
          <TabsContent value="edit">
            {value && (
              <EditServiceForm
                key={value ? value.ID + value?.Version?.Index : ''}
                value={value}
              />
            )}
          </TabsContent>
          <TabsContent value="logs">
            <ErrorBoundary>
              {value && <ServiceLogs value={value} />}
            </ErrorBoundary>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}

function EditServiceForm({ value }: { value: Service }) {
  const [editor, setEditor] = useState(value.Spec)
  const TaskTemplate = editor.TaskTemplate as ContainerTaskSpec
  const ContainerSpec = TaskTemplate.ContainerSpec
  const [json, setJSON] = useState('')
  const invalid = json ? !isValidJSON(json) : false
  const label = (key: string, value: string) => {
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

  return (
    <form
      className="contents"
      onSubmit={async (e) => {
        e.preventDefault()
        await updateService(value, () => (json ? JSON.parse(json) : editor))
        refreshServices(6)
        console.log('submit', json)
      }}
    >
      <SheetHeader>
        <SheetTitle>Edit service</SheetTitle>
        <SheetDescription>Make changes to the service spec.</SheetDescription>
      </SheetHeader>
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
          <Label htmlFor="update" className="text-right">
            Mounts
          </Label>
          <Textarea
            id="env"
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
                      Type: isVolumeName(source)
                        ? ('volume' as const)
                        : ('bind' as const),
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
          <Label htmlFor="update" className="text-right">
            Update strategy
          </Label>
          <Select
            onValueChange={(value) => label('hive.update', value)}
            defaultValue={editor.Labels!['hive.update']}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Stop then start" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="stop-first">Stop then start</SelectItem>
              <SelectItem value="start-first">Zero-downtime</SelectItem>
            </SelectContent>
          </Select>
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
      <SheetFooter className="bottom-0 sticky">
        <Button
          type="button"
          onClick={async () => {
            if (!confirm('Are you sure?')) return
            await engine.delete('/services/' + value.ID)
            refreshServices(3)
          }}
        >
          Delete
        </Button>
        <SheetClose asChild>
          <Button type="submit" disabled={invalid}>
            Save changes
          </Button>
        </SheetClose>
      </SheetFooter>
    </form>
  )
}

function ServiceLogs({ value }: { value: Service }) {
  const [logs, setLogs] = useState('')
  useEffect(() => {
    // axios to browser stream
    engine
      .get<string>('/services/' + value.ID + '/logs', {
        params: { stdout: true },
      })
      .then((res) => {
        // handle first character on each line of docker logs
        // const logs: string = res as any
        // const lines = logs.split('\n')
        // let prev = ''

        setLogs((prev) => prev + res)
      })
  }, [value.ID])
  return <pre className="flex-1 min-h-[800px] font-mono text-sm">{logs}</pre>
}

function isValidJSON(str: string) {
  try {
    JSON.parse(str)
  } catch (e) {
    return false
  }
  return true
}
