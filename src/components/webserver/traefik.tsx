import { ServiceSpec } from '@/lib/docker'
import { engine } from '@/lib/docker-client'
import { refreshServices } from '@/lib/useRefresh'

import { Button } from '../ui/button'

export function EnableTraefik() {
  const traefik = async () => {
    // const letsencrypt = prompt('Lets encrypt email address name')
    // if (!letsencrypt) return
    await engine.post<any, any, ServiceSpec>('/services/create', {
      Name: 'traefik',
      TaskTemplate: {
        Placement: {
          Constraints: ['node.role==manager'],
        },
        ContainerSpec: {
          Image: 'traefik:2.10',
          Mounts: [
            {
              Type: 'bind',
              Source: '/Users/thomas/open/hivepanel/local/traefik',
              Target: '/data',
            },
            {
              Type: 'bind',
              Source: '/var/run/docker.sock',
              Target: '/var/run/docker.sock',
              ReadOnly: true,
            },
          ],
          Args: [
            '--providers.docker=true',
            '--providers.docker.constraints=Label(`traefik.constraint-label`, `hivenet`)',
            '--providers.docker.exposedbydefault=false',
            // '--providers.docker.swarmmode=true',
            '--providers.docker.swarmMode=true',
            '--entrypoints.http.address=:80',
            '--entryPoints.http.forwardedHeaders.insecure',
            // '--entrypoints.https.address=:443',
            // '--entryPoints.https.forwardedHeaders.insecure',
            // `--certificatesresolvers.le.acme.email=${letsencrypt}`,
            // '--certificatesresolvers.le.acme.storage=/data/acme.json',
            // '--certificatesresolvers.le.acme.tlschallenge=true',
            // '--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=http',
            // '--accesslog.filepath=/data/access.log',
            // '--log',
            // '--api',

            // '--log.level=DEBUG',
            '--api.insecure=true',
            '--api.dashboard=true',
            // '--providers.docker.exposedByDefault=false',
            // '--entryPoints.http.address=:80',
            // '--entryPoints.http.forwardedHeaders.insecure',
            // '--entryPoints.https.address=:443',
            // '--entryPoints.https.forwardedHeaders.insecure',
            // `--certificatesresolvers.letsencrypt.acme.email=${letsencrypt}`,
            // '--certificatesresolvers.letsencrypt.acme.storage=/data/acme.json',
            // '--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=http',
            // '--docker',
            // '--docker.swarmMode',
            // '--docker.domain=traefik',
            // '--docker.watch',
          ],
        },
        Networks: [{ Target: 'hivenet' }],
      },
      Labels: {
        'traefik.enable': 'true',
        'traefik.docker.network': 'hivenet',
        // 'traefik.constraint-label': 'hivenet',
        // 'traefik.http.middlewares.admin-auth.basicauth.users':
        //   '${USERNAME?Variable not set}:${HASHED_PASSWORD?Variable not set}',
        // 'traefik.http.middlewares.https-redirect.redirectscheme.scheme':
        //   'https',
        // 'traefik.http.middlewares.https-redirect.redirectscheme.permanent':
        //   'true',
        'traefik.http.routers.traefik-http.rule': 'HostRegexp(`{host:.+}`)',
        'traefik.http.routers.traefik-http.entrypoints': 'http',
        'traefik.http.routers.traefik-http.service': 'dashboard@internal',
        'traefik.http.routers.traefik-http.middlewares':
          'dashboard_stripprefix@internal',
        // 'traefik.http.routers.traefik-https.rule':
        //   'Host(`example.org`)',
        // 'traefik.http.routers.traefik-https.entrypoints': 'https',
        // 'traefik.http.routers.traefik-https.tls': 'true',
        // 'traefik.http.routers.traefik-https.service': 'api@internal',
        // 'traefik.http.routers.traefik-https.tls.certresolver': 'le',
        // 'traefik.http.routers.traefik-https.middlewares': 'admin-auth',
        'traefik.http.services.traefik.loadbalancer.server.port': '8080',
      },
      Mode: { Replicated: { Replicas: 1 } },
      EndpointSpec: {
        Ports: [
          {
            TargetPort: 80,
            PublishedPort: 80,
            PublishMode: 'host',
          },
          {
            TargetPort: 443,
            PublishedPort: 443,
            PublishMode: 'host',
          },
          {
            TargetPort: 8080,
            PublishedPort: 8080,
            PublishMode: 'host',
          },
        ],
      },
    })
    refreshServices(6)
  }
  return (
    <Button variant={'outline'} onClick={traefik}>
      Traefik
    </Button>
  )
}
