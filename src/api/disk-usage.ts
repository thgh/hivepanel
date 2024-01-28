import { ContainerInfo } from 'dockerode'
import { Request, Response } from 'express'

import { engine, Task } from '@/lib/docker'
import { isVolumeName } from '@/lib/docker-util'
import { swarm } from '@/lib/state'

// volume=registry-data
// service=registry&path=/var/lib/registry
export async function GET(req: Request, res: Response) {
  let size = -1
  try {
    const volume = String(req.query.volume || '')

    const service = String(req.query.service || '')
    const containerPath = String(req.query.path || '')

    // Run du in existing container
    if (isVolumeName(volume)) {
      // const start = Date.now()
      const containers = await engine.get<ContainerInfo[]>('/containers/json', {
        params: { filters: JSON.stringify({ volume: [volume] }) },
      })
      const container = containers.data.find((c) => c.State === 'running')
      if (container) {
        const path = container.Mounts.find((m) => m.Name === volume)
          ?.Destination
        const { data: exec } = await engine.post(
          '/containers/' + container.Id + '/exec',
          { AttachStdout: true, Cmd: ['du', '-bs', path] }
        )
        const result = await engine.post('/exec/' + exec.Id + '/start', {
          Detach: false,
          Tty: false,
        })
        size = parseFloat(result.data.slice(8))
        // console.log('existing container', Date.now() - start)
      }
    }

    // Create temporary alpine container, mount the requested volume, run du, read output
    if (size === -1 && isVolumeName(volume)) {
      // const start = Date.now()
      const { data: container } = await engine.post('/containers/create', {
        Image: 'alpine',
        Cmd: ['du', '-bs', '/var/disk-usage'],
        HostConfig: { Binds: [volume + ':/var/disk-usage'] },
      })
      await engine.post('/containers/' + container.Id + '/start')
      const log = await engine.get(
        '/containers/' + container.Id + '/logs?stdout=1'
      )
      size = parseFloat(log.data.slice(8))
      // console.log('extra container', Date.now() - start)

      // Cleanup
      ;(async () => {
        await engine.post(
          '/containers/' + container.Id + '/stop',
          {},
          { validateStatus: () => true }
        )
        await engine.delete('/containers/' + container.Id)
      })()
    }

    // Run du in existing container
    if (size === -1 && service && volume && !isVolumeName(volume)) {
      // console.log('host path through service', service, volume)
      // const start = Date.now()
      const tasks = await engine.get<ContainerInfo[]>('/containers/json', {
        params: {
          filters: JSON.stringify({
            label: ['com.docker.swarm.service.name=' + service],
          }),
        },
      })
      const container = tasks.data.find(
        (t) =>
          t.State === 'running' &&
          t.Mounts.find((m) => m.Source.endsWith(volume))
      )
      if (container) {
        const mount = container.Mounts.find((m) => m.Source.endsWith(volume))
        if (!mount) throw new Error('Mount not found impossible')

        const { data: exec } = await engine.post(
          '/containers/' + container.Id + '/exec',
          { AttachStdout: true, Cmd: ['du', '-bs', mount.Destination] }
        )
        const result = await engine.post('/exec/' + exec.Id + '/start', {
          Detach: false,
          Tty: false,
        })
        size = parseFloat(result.data.slice(8))
        // console.log('host path through service', Date.now() - start, size)
      }
    }

    // Untested
    if (size === -1 && service && containerPath) {
      // const start = Date.now()
      // console.log('container path through service', service, containerPath)
      const tasks = await engine.get<Task[]>('/tasks', {
        params: { filters: JSON.stringify({ service: [service] }) },
      })
      const task = tasks.data.find((t) => t.Status.State === 'running')
      if (task) {
        const { data: exec } = await engine.post(
          '/containers/' + service + '.1.' + task.ID + '/exec',
          { AttachStdout: true, Cmd: ['du', '-bs', containerPath] }
        )
        const result = await engine.post('/exec/' + exec.Id + '/start', {
          Detach: false,
          Tty: false,
        })
        size = parseFloat(result.data.slice(8))
        // console.log('container path through service', Date.now() - start)
      }
    }

    res.json({ size })
  } catch (err: any) {
    console.error('err', err.message, err.response?.data)
    res
      .status(500)
      .json({ message: 'Error getting disk usage: ' + err.message })
  }
}

export async function POST(req: Request, res: Response) {
  try {
    const service = swarm.get('hive.registry.service') || 'registry'
    const { data: services } = await engine.get('/services')

    res.setHeader(
      'Content-Disposition',
      'attachment; filename="hivepanel-config.json"'
    )
    res.setHeader('Content-Type', 'application/json')
    res.send(JSON.stringify({ swarm, services }, null, 2))
  } catch (err: any) {
    res.status(500).json({ message: 'Error getting config: ' + err.message })
  }
}
