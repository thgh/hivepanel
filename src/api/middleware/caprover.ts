import { ContainerTaskSpec } from 'dockerode'
import { Request, Response } from 'express'
import { existsSync, mkdirSync, readFileSync } from 'fs'

import { engine, handleService } from '@/lib/docker'

export default handleService(async (spec) => {
  if (spec.Name === 'captain-captain') {
    // console.log('🧢 Caprover spec', spec.TaskTemplate)
    if (!spec.TaskTemplate) spec.TaskTemplate = {}
    // @ts-expect-error
    if (!spec.TaskTemplate.ContainerSpec) spec.TaskTemplate.ContainerSpec = {}
    const s = (spec.TaskTemplate as ContainerTaskSpec)!.ContainerSpec!
    // docker run -p 80:80 -p 443:443 -p 3000:3000 -e ACCEPTED_TERMS=true -v /var/run/docker.sock:/var/run/docker.sock -v /captain:/captain caprover/caprover

    spec.Name = 'captain-captain'
    if (!s.Image) s.Image = 'caprover/caprover'

    if (!s.Mounts) s.Mounts = []
    if (!s.Mounts.some((m) => m.Target === '/var/run/docker.sock'))
      s.Mounts.push({
        Type: 'bind',
        Source: '/var/run/docker.sock',
        Target: '/var/run/docker.sock',
      })

    if (!s.Env) s.Env = []
    if (!s.Env.some((e) => e.startsWith('IS_CAPTAIN_INSTANCE=')))
      s.Env.push('IS_CAPTAIN_INSTANCE=1')
    if (!s.Env.some((e) => e.startsWith('ACCEPTED_TERMS=')))
      s.Env.push('ACCEPTED_TERMS=true')

    // Put captain directory in CWD on macOS
    let directory = '/captain'
    if (process.platform === 'darwin') {
      if (!s.Env.some((e) => e.startsWith('CAPTAIN_BASE_DIRECTORY=')))
        s.Env.push('CAPTAIN_BASE_DIRECTORY=' + process.cwd() + '/captain')

      directory = s.Env.find((e) =>
        e.startsWith('CAPTAIN_BASE_DIRECTORY=')
      )!.split('=')[1]
    }

    // Create the /captain directory if it doesn't exist
    if (!existsSync(directory)) {
      console.log('🧢 Creating /captain directory:', directory)
      mkdirSync(directory, { recursive: true })
    }

    // Custom base dir requires edge tag and special mount
    if (s.Env.some((e) => e.startsWith('CAPTAIN_BASE_DIRECTORY='))) {
      s.Image = 'caprover/caprover-edge'
      console.log('🧢 Using edge tag')
      if (!s.Mounts.some((m) => m.Target === process.cwd() + '/captain'))
        s.Mounts.push({
          Type: 'bind',
          Source: process.cwd() + '/captain',
          Target: process.cwd() + '/captain',
        })
    }

    // Default /captain mount
    if (!s.Mounts.some((m) => m.Target === '/captain'))
      s.Mounts.push({
        Type: 'bind',
        Source: directory,
        Target: '/captain',
      })

    // Network
    if (!spec.TaskTemplate) spec.TaskTemplate = {}
    if (!spec.TaskTemplate!.Networks)
      spec.TaskTemplate!.Networks = [{ Target: 'captain-overlay-network' }]

    // Create network just in case
    await engine
      .post('/networks/create', {
        Name: 'captain-overlay-network',
        Driver: 'overlay',
        Scope: 'swarm',
        Attachable: true,
      })
      .catch((e) => {
        console.log('🧢 captain-overlay-network error', e.message)
      })

    // Port
    if (!spec.EndpointSpec) spec.EndpointSpec = {}
    if (!spec.EndpointSpec.Ports) spec.EndpointSpec.Ports = []
    if (!spec.EndpointSpec.Ports.some((p) => p.TargetPort === 3000))
      spec.EndpointSpec.Ports.push({
        Protocol: 'tcp',
        TargetPort: 3000,
        PublishedPort: 3000,
        PublishMode: 'host',
      })

    // console.log('🧢 Caprover spec2', s)
  }
})

export async function migrateFromCaprover(
  req: Request,
  res: Response,
  next: () => void
) {
  try {
    const config = await getCaproverConfig(req)

    if (req.method === 'POST') res.json({ config, log: req.log })
    else res.json(config)
  } catch (error: any) {
    res.json({ message: error.message, log: req.log })
  }
}

async function getCaproverConfig(req: Request) {
  const log = (req.log ||= [])

  if (process.platform === 'darwin' && existsSync(process.cwd() + '/captain')) {
    log.push('Using local captain directory')
    return JSON.parse(
      readFileSync(process.cwd() + '/captain/data/config-captain.json', 'utf-8')
    )
  }

  // Make it easy in development
  if (
    process.env.NODE_ENV === 'development' &&
    process.env.npm_lifecycle_script?.includes('vite-node')
  ) {
    log.push('Example config in development')
    return JSON.parse(readFileSync('./caprover-config-example.json', 'utf-8'))
  }

  log.push('Creating container')
  const container = await engine.post(
    '/containers/create?name=migrate-caprover',
    {
      Image: 'alpine',
      Cmd: ['cat', '/captain/data/config-captain.json'],
      HostConfig: { Binds: ['/captain:/captain'] },
    },
    { validateStatus: () => true }
  )

  const id = container.data.Id
  if (container.data.message?.includes('Conflict. The container name')) {
    log.push('Container already exists' + container.status)
    log.push('Removing container')
    const removed = await engine.delete(`/containers/migrate-caprover`, {})
    log.push('Removed container ' + removed.status)
    return
  }

  if (!id) return log.push('Failed to create container')
  log.push('Created ' + id)

  log.push('Starting container')
  const started = await engine.post(`/containers/${id}/start`)
  log.push('Started ' + started.status)

  const logs = await engine.get(`/containers/${id}/logs?stdout=1`)
  log.push('Config.length ' + logs.data.length)
  const {
    appDefinitions,
    customDomain,
    emailAddress,
    hasRootSsl,
    forceRootSsl,
    hashedPassword,
  } = JSON.parse(deindentDockerLogs(logs.data))
  log.push('Config.count ' + Object.keys(appDefinitions).length)

  log.push('Stopping container')
  const stopped = await engine.post(
    `/containers/${id}/stop`,
    {},
    { validateStatus: () => true }
  )
  log.push('Stopped', stopped.data)
  log.push('Removing container')
  const removed = await engine.delete(`/containers/${id}`, {
    validateStatus: () => true,
  })
  log.push('Removed', removed.data)

  // res.status(501).json({ message: 'Not implemented' })
  return {
    appDefinitions,
    customDomain,
    emailAddress,
    hasRootSsl,
    forceRootSsl,
    hashedPassword,
  }
}

type Network = {
  Name: 'captain-overlay-network' | 'ingress'
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

  if (options.length > 2) console.log('Multiple networks found', options)
}

function deindentDockerLogs(input: string) {
  return input
    .split('\n')
    .map((l) => l.slice(8))
    .join('\n')
}
