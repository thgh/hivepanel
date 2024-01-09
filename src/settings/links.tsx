import { FormEvent, useRef, useState } from 'react'
import { toast } from 'sonner'

import { engine } from '@/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { str62 } from '@/lib/random'
import { parseSwarmLinks, useServerState } from '@/lib/swr'
import { SwarmLabel, SwarmLink } from '@/lib/types'
import useEvent from '@/lib/useEvent'

export default function SettingsLinks() {
  // form
  const server = useServerState()
  const ref = useRef<NodeJS.Timeout>()

  // name
  const flush = useEvent(async (evt?: FormEvent<HTMLFormElement>) => {
    console.log('sbumit', updates)
    evt && evt.preventDefault()
    if (!server.data || !server.data.swarm) return
    if (!updates) return

    try {
      const ok = await engine.post(
        '/swarm/update',
        {
          ...server.data.swarm.Spec,
          Labels: { ...server.data.swarm.Spec.Labels, ...updates },
        },
        { params: { version: server.data?.swarm.Version?.Index } }
      )
      await server.mutate()
      setUpdates(undefined)
      if (updates['hive.panel.name'])
        toast('Server name updated: ' + updates['hive.panel.name'])
      else toast('Links updated')
      console.log('updated swarm', ok.status, ok.data)
    } catch (error) {}
  })

  // links
  const [updates, setUpdates] = useState<Record<string, string>>()
  const links = parseSwarmLinks({
    ...(server.data?.swarm?.Spec.Labels || {}),
    ...updates,
  })

  const update = useEvent((updates: Partial<Record<SwarmLabel, string>>) => {
    setUpdates((prev) => ({ ...prev, ...updates }))
    clearTimeout(ref.current)
    ref.current = setTimeout(() => flush(), 500)
  })
  const updateLink = useEvent((key: string, updates: Partial<SwarmLink>) => {
    setUpdates((prev) => {
      const value = JSON.parse(
        prev?.[key] || server.data!.swarm?.Spec.Labels?.[key] || '{}'
      )
      return { ...prev, [key]: JSON.stringify({ ...value, ...updates }) }
    })
    clearTimeout(ref.current)
    ref.current = setTimeout(() => flush(), 500)
  })

  const createLink = () => {
    if (!server.data || !server.data.swarm) return
    const url = prompt('URL')
    if (!url) return

    const parsed = new URL(url)

    const link = JSON.stringify({
      url,
      display: parsed.host,
      type: 'hivepanel',
    })
    engine
      .post(
        '/swarm/update',
        {
          ...server.data!.swarm!.Spec,
          Labels: {
            ...server.data!.swarm!.Spec.Labels,
            ['hive.link.' + str62(5)]: link,
          },
        },
        { params: { version: server.data.swarm.Version?.Index } }
      )
      .then((ok) => {
        console.log('updated swarm', ok.status)
        server.mutate()
      })
  }

  return (
    <div className="p-6">
      <div className="space-y-0.5 mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Links</h2>
        <p className="text-muted-foreground">
          Switch easily between different swarms
        </p>
      </div>
      <form onSubmit={flush} className="max-w-[40em]" autoComplete="off">
        <div className="space-y-2 ">
          <Label>Server display name</Label>
          <Input
            placeholder={`Defaults to '${location.host}'`}
            autoComplete="username"
            onChange={(evt) => update({ 'hive.panel.name': evt.target.value })}
            defaultValue={server.data?.swarm?.Spec.Labels?.['hive.panel.name']}
          />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Choose a short name that is specific for this server only.
          </p>
        </div>

        {links ? (
          <div className="my-6">
            <Label>Links</Label>
            <div className="space-y-2">
              {links.map((link) => {
                return (
                  <div key={link.label} className="flex items-center space-x-2">
                    <div className="flex-1">
                      <Input
                        defaultValue={link.display}
                        placeholder="Display name"
                        onChange={(evt) =>
                          updateLink(link.label, {
                            display: evt.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="flex-1">
                      <Input
                        defaultValue={link.url}
                        placeholder="https://..."
                        onChange={(evt) =>
                          updateLink(link.label, {
                            url: evt.target.value,
                          })
                        }
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-red-500"
                      onClick={() => update({ [link.label]: undefined })}
                    >
                      Delete
                    </Button>
                  </div>
                )
              })}
            </div>
          </div>
        ) : null}
      </form>
      <div>
        <Button type="button" variant="secondary" onClick={createLink}>
          Create new link
        </Button>
      </div>
      {/* <pre>{JSON.stringify(server.data?.swarm, null, 2)}</pre> */}
    </div>
  )
}
