import { ServiceSpec } from '@/lib/docker'
import { engine } from '@/lib/docker-client'
import { str62 } from '@/lib/random'
import { refreshServices } from '@/lib/useRefresh'

import { Button } from './ui/button'

export function EnableHive() {
  const enable = async () => {
    const user = prompt('Create user with username', 'admin')
    const password = prompt('Choose a password', str62(20))
    const port =
      prompt('What port should hivepanel run on?', '23099') || '23099'
    await engine.post<any, any, ServiceSpec>('/services/create', {
      Name: 'hive',
      TaskTemplate: {
        ContainerSpec: {
          Image: 'thgh/hivepanel',
        },
      },
      EndpointSpec: {
        Ports: [
          {
            TargetPort: 80,
            PublishedPort: parseInt(port) || 23099,
            PublishMode: 'host',
          },
        ],
      },
      Labels: {
        'hive.auth': 'labels',
        ['hive.user.' + user + '.password']: password || undefined,
      },
      Mode: { Replicated: { Replicas: 1 } },
    })
    refreshServices(6)
  }
  return (
    <Button variant={'outline'} onClick={enable}>
      Hivepanel service
    </Button>
  )
}
