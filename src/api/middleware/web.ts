import { engine, handleService, Service } from '@/lib/docker'
import { splitHostnames } from '@/lib/labels'
import { swarm } from '@/lib/state'

export default handleService(async (spec) => {
  if (!spec.Labels) return

  if (!spec.Labels['hive.hostnames']) return

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
      return console.log(
        'port 80 or 443 is in use',
        spec.Labels['hive.hostnames']
      )
    }

    const volume = 'hive_caddy'
    const service = 'hive-caddy'
    swarm.setAll({ 'hive.caddy.volume': volume, 'hive.caddy.service': service })
    console.log('caddy', volume, service)

    // TODO: check if port 80/443 are in use

    const network = await getCustomNetwork()

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
          Env: ['CADDY_INGRESS_NETWORKS=' + network],
        },
        Networks: [{ Target: network }],
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
})

type Network = {
  Name: 'captain-overlay-network' | 'ingress' | 'hivenet'
  Driver: 'overlay'
  Scope: 'swarm'
}

async function getCustomNetwork() {
  const networks = await engine.get<Network[]>('/networks', {
    validateStatus: () => true,
    timeout: 4000,
  })
  const options = networks.data
    .filter((n) => n.Driver === 'overlay' && n.Scope === 'swarm')
    .map((s) => s.Name)
    .sort((a, b) => a.localeCompare(b))

  // Return the other network if there are only two options
  if (options.length === 2 && options.some((n) => n === 'ingress'))
    return options.find((n) => n !== 'ingress')

  if (options.length < 2) {
    await engine.post('/networks/create', {
      Attachable: true,
      CheckDuplicate: true,
      Driver: 'overlay',
      Name: 'hivenet',
      Scope: 'swarm',
    })
    console.log('Created default network: hivenet')
    swarm.set('hive.network.default', 'hivenet')
    return 'hivenet'
  }

  console.log('Multiple networks found', options)
}
