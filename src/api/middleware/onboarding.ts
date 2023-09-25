import { exec } from 'child_process'
import { ClusterInfo } from 'dockerode'
import { Request, Response } from 'express'

import { engine } from '@/lib/docker'
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

  if (req.method === 'POST' && req.url === '/init-swarm') {
    try {
      const ok = await new Promise((resolve) =>
        exec('docker swarm init', (err) => resolve(!err))
      )
      for (let index = 0; index < 20; index++) {
        try {
          await new Promise((resolve) => setTimeout(resolve, 1000))
          const swarm = await engine.get<ClusterInfo>('/swarm')
          console.log('got swarm', swarm.data.Spec)
          const updated = await engine.post<
            ClusterInfo,
            any,
            ClusterInfo['Spec']
          >(
            '/swarm/update',
            {
              ...swarm.data.Spec,
              Labels: {
                ...swarm.data.Spec.Labels,
                ...state.swarmLabelBuffer,
              },
            },
            { params: { version: swarm.data.Version?.Index } }
          )
          console.log('configured swarm', state.swarmLabelBuffer)
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
    isDockerRunning,
  })
}
