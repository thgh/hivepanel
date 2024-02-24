import type { ServiceSpec } from '@/lib/docker'
import { engine } from '@/lib/docker-client'
import { refreshServices } from '@/lib/useRefresh'

import { Button } from '../ui/button'

export function EnableCaddy() {
  const traefik = async () => {
    // const letsencrypt = prompt('Lets encrypt email address name')
    // if (!letsencrypt) return
    await engine.post<any, any, ServiceSpec>('/services/create', {
      Name: 'router-caddy',
      TaskTemplate: {
        ContainerSpec: {
          Image: 'caddy:2.7-alpine',
          Mounts: [
            {
              Type: 'bind',
              Source: '/Users/thomas/open/hivepanel/local/caddy_data',
              Target: '/data',
            },
            {
              Type: 'bind',
              Source: '/Users/thomas/open/hivepanel/local/caddy_config',
              Target: '/config',
            },
          ],
        },
      },
      EndpointSpec: {
        Ports: [
          {
            TargetPort: 80,
            PublishedPort: 80,
            PublishMode: 'host',
          },
          {
            Protocol: 'tcp',
            TargetPort: 443,
            PublishedPort: 443,
            PublishMode: 'host',
          },
          {
            Protocol: 'udp',
            TargetPort: 443,
            PublishedPort: 443,
            PublishMode: 'host',
          },
        ],
      },
      Mode: { Replicated: { Replicas: 1 } },
      Labels: {},
    })
    refreshServices(6)
  }
  return (
    <Button variant={'outline'} onClick={traefik}>
      Caddy
    </Button>
  )
}
