import { engine, handleService, Service } from '@/lib/docker'
import { splitHostnames } from '@/lib/labels'
import { swarm } from '@/lib/state'

export default handleService(async (spec) => {
  if (!spec.Labels) return

  if (!spec.Labels['hive.hostnames']) return

  let created = swarm.get('hive.caddy.service')
  // Check if caddy service exists
  if (created) {
    const exists = await engine.get('/services/' + created, {
      validateStatus: () => true,
    })
    if (exists.status !== 200) {
      console.log('caddy service exists', exists.status, exists.data)
      swarm.set('hive.caddy.service', '')
      created = undefined
    }
  }
  if (!created) {
    const services = await engine.get<Service[]>('/services')
    const usedPorts = services.data.flatMap(
      (service) =>
        service.Endpoint?.Ports?.filter(
          (port) => port.PublishMode === 'host'
        )?.map((port) => port.PublishedPort) || []
    )
    console.log('used ports', usedPorts)
    if (usedPorts.includes(80) || usedPorts.includes(443)) {
      return console.log('port 80 or 443 is in use')
    }

    const volume = 'hive_caddy'
    const service = 'hive-caddy'
    swarm.setAll({ 'hive.caddy.volume': volume, 'hive.caddy.service': service })
    console.log('caddy', volume, service)

    // TODO: check if port 80/443 are in use

    // Create caddy service
    const caddy = await engine.post('/services/create', {
      Name: service,
      TaskTemplate: {
        ContainerSpec: {
          Image: 'lucaslorentz/caddy-docker-proxy:2.8',
          Mounts: [
            {
              Target: '/var/run/docker.sock',
              Source: '/var/run/docker.sock',
              Type: 'bind',
            },
            {
              Target: '/data',
              Source: volume,
              Type: 'volume',
            },
          ],
          Environment: ['CADDY_INGRESS_NETWORKS=hivenet'],
        },
        Networks: [{ Target: 'hivenet' }],
      },
      EndpointSpec: {
        Ports: [
          { TargetPort: 80, PublishedPort: 80, PublishMode: 'host' },
          { TargetPort: 443, PublishedPort: 443, PublishMode: 'host' },
        ],
      },
    })
    console.log('caddy service created', caddy.status, caddy.data)

    // Wait 3 seconds for container to be created
    // await new Promise((resolve) => setTimeout(resolve, 3000))

    // // Get container id
    // const containers = await engine.get('/containers/json', {
    //   params: { filters: JSON.stringify({ volume: [volume] }) },
    // })

    // // Extract tar in a container
    // console.log('caddy containers', containers.data.length, containers.data[0])
  }

  // TODO: check if any other reverse proxy is running
  if (spec.Labels['hive.caddy'] === 'custom') return

  const port = spec.Labels['hive.port'] || ''

  spec.Labels = {
    ...spec.Labels,
    caddy: splitHostnames(spec.Labels['hive.hostnames'])
      .map((h) =>
        h.endsWith('localhost') || h.endsWith('traefik.me') ? 'http://' + h : h
      )
      .filter(Boolean)
      .join(', '),
    'caddy.reverse_proxy': `{{upstreams${port ? ' ' + port : ''}}}`,
    // 'caddy.tls': 'internal',
  }
})
