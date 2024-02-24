import { exec } from 'node:child_process'

import type { Swarm } from 'dockerode'
import type { Request, Response } from 'express'

import { engine } from '@/lib/docker'
import {
  checkIsDockerInstalled,
  isDockerRunning,
  state,
  swarm,
} from '@/lib/state'

export async function onboardingMiddleware(req: Request, res: Response) {
  // check if docker command is installed on the system using `which`
  const isDockerInstalled = await checkIsDockerInstalled()

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
    let initialized = false
    let migrated = false
    let message = 'Unknown error'
    try {
      initialized = await new Promise((resolve) =>
        exec('docker swarm init', (err) => resolve(!err))
      )
      message = 'Initialized swarm but failed to migrate'
      for (let index = 0; index < 10; index++) {
        try {
          await new Promise((resolve) => setTimeout(resolve, 1000))
          const newSwarm = await engine.get<Swarm>('/swarm')
          await swarm.migrate(newSwarm?.data)
          message = 'Initialized swarm successfully'
          break
        } catch (error: any) {
          console.log('init', index, error.response?.data || error.message)
        }
      }
      // const ok = await engine.post('/swarm/init', {})
      // return res.json({ message: 'Creating swarm...', data: ok.data })
    } catch (error: any) {
      console.log('init', error.response?.data || error.message)
      if (error.response?.data?.message)
        message = error.response?.data?.message || error.message
    }
    return res.json({ message, initialized, migrated })
  }

  res.json({
    isDockerInstalled,
    isDockerRunning: isDockerRunning2,
  })
}
