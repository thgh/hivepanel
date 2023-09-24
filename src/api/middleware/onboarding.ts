import { exec } from 'child_process'
import { Request, Response } from 'express'

import { state } from '@/lib/state'

export async function onboardingMiddleware(req: Request, res: Response) {
  // check if docker command is installed on the system using `which`
  const isDockerInstalled = await new Promise((resolve) =>
    exec('which docker', (err) => resolve(!err))
  )

  const isDockerRunning = await new Promise((resolve) =>
    exec('docker info', (err) => resolve(!err))
  )

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

  if (req.method === 'POST' && req.url === '/swarm-init') {
    try {
      const ok = await new Promise((resolve) =>
        exec('docker swarm init', (err) => resolve(!err))
      )
      return res.json({
        message: ok ? 'Initializing swarm...' : 'Failed to init swarm',
      })
      // const ok = await engine.post('/swarm/init', {})
      // return res.json({ message: 'Creating swarm...', data: ok.data })
    } catch (error: any) {
      console.log('init', error.response?.data)
      return res.json({ message: error.message })
    }
  }

  res.json({
    isDockerInstalled,
    isDockerRunning,
  })
}
