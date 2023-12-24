import { FormEvent } from 'react'

import { engine } from '@/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { str62 } from '@/lib/random'
import { useServerState } from '@/lib/swr'

export default function SettingsPeers() {
  const server = useServerState()
  Object.entries(server.data?.swarm?.Spec.Labels || {})

  async function onSubmit(data: FormEvent<HTMLFormElement>) {
    console.log('sbumit', data)
    if (!server.data || !server.data.swarm) return
    // patch to /auth/user
    const ok = await engine
      .post(
        '/swarm/update',
        {
          ...server.data.swarm.Spec,
          Labels: {
            ...server.data.swarm.Spec.Labels,
            // [key]: value,
          },
        },
        { params: { version: server.swarm.Version?.Index } }
      )
      .then((ok) => {
        console.log('updated swarm', ok.status, key)
      })
    alert('ok ' + ok.data?.message)
    // toast({
    //   title: 'You submitted the following values:',
    //   description: (
    //     <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
    //       <code className="text-white">{JSON.stringify(data, null, 2)}</code>
    //     </pre>
    //   ),
    // })
  }

  const createLink = () => {
    if (!server.data || !server.data.swarm) return
    const url = prompt('URL')
    if (!url) return

    const parsed = new URL(url)

    const display = prompt('Display', parsed.host)
    if (!display) return
    const link = JSON.stringify({
      url,
      display,
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
        <h2 className="text-2xl font-bold tracking-tight">Peers</h2>
        <p className="text-muted-foreground">
          Switch easily between different swarms
        </p>
      </div>
      <form
        onSubmit={onSubmit}
        className="space-y-2 max-w-[40em]"
        autoComplete="off"
      >
        <Label>Server display name</Label>
        <Input placeholder="Defaults to 'admin'" autoComplete="username" />
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Choose a short name that is specific for this server only.
        </p>

        <Button type="submit">Save changes</Button>
      </form>
      <div>
        <Button type="button" onClick={createLink}>
          Create link
        </Button>
      </div>
    </div>
  )
}
