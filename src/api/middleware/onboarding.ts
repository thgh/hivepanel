import { exec } from 'node:child_process'

import type { Swarm } from 'dockerode'
import type { Request, Response } from 'express'

import { engine } from '@/lib/docker'
import { isDockerRunning, state, swarm } from '@/lib/state'

export async function onboardingMiddleware(req: Request, res: Response) {
  // check if docker command is installed on the system using `which`
  const isDockerInstalled = await new Promise((resolve) =>
    exec('which docker', (err) => resolve(!err))
  )

  const isDockerRunning2 = await isDockerRunning()

  if (req.method === 'POST' && req.url === '/install-docker') {
  }

  if (req.method === 'POST' && req.url === '/start-docker-daemon') {
    if (process.platform === 'darwin') {
      exec('open --background -a Docker')
    } else if (process.platform === 'linux') {
      exec('sudo systemctl start docker')
      return res.json({
        message:
          "If it didn't work, run this in the terminal: sudo systemctl start docker",
      })
    } else if (process.platform === 'win32') {
      exec('start-service docker')
    }

    state.isDockerRunningAt = undefined
    state.swarmAt = undefined

    res.json({ message: 'Starting Docker, this may take 20 seconds...' })
    return
  }

  if (req.method === 'POST' && req.url === '/init-swarm') {
    try {
      const ok = await new Promise((resolve) =>
        exec('docker swarm init', (err) => resolve(!err))
      )
      for (let index = 0; index < 20; index++) {
        try {
          await new Promise((resolve) => setTimeout(resolve, 1000))
          const newSwarm = await engine.get<Swarm>('/swarm')
          const migrated = await swarm.migrate(newSwarm.data)
          console.log('migrated swarm', migrated)
          return res.json({
            message: 'Swarm initialized successfully',
          })
        } catch (error: any) {
          console.log('init', index, error.response?.data || error.message)
        }
      }
      return res.json({
        message: ok ? 'Initializing swarm...' : 'Failed to init swarm',
      })
      // const ok = await engine.post('/swarm/init', {})
      // return res.json({ message: 'Creating swarm...', data: ok.data })
    } catch (error: any) {
      console.log('init', error.response?.data || error.message)
      return res.json({ message: error.message })
    }
  }

  res.json({
    isDockerInstalled,
    isDockerRunning: isDockerRunning2,
  })
}
