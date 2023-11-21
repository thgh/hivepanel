#!/usr/bin/env node
import { exec } from 'node:child_process'

import type { Swarm } from 'dockerode'
import prompts from 'prompts'

import { createServer } from './index'
import { engine } from './lib/docker'

main()

// CLI
async function main() {
  // Assume everything is ready to go
  const ok = await engine.get<Swarm>('/swarm', { validateStatus: () => true })
  if (ok.status < 222) {
    console.log('Docker Swarm is ready')
    createServer(23088)
    // Open browser if possible
    exec('open http://localhost:23088')

    return
  }

  // Swarm is not ready, is Docker actually running?
  const isDockerRunning = await new Promise((resolve) =>
    exec('docker info', (err) => resolve(!err))
  )
  if (isDockerRunning) {
    const response = await prompts({
      type: 'confirm',
      name: 'initSwarm',
      message: 'Would you like to initialize a Docker Swarm?',
    })
    if (!response.initSwarm) return

    const init = await new Promise<{
      error: Error | null
      stdout: string
      stderr: string
    }>((resolve) =>
      exec('docker swarm init', (error, stdout, stderr) =>
        resolve({ error, stdout, stderr })
      )
    )

    if (init.error) {
      console.error('Swarm initialization failed:', init.error)
      return
    }
    console.log('Swarm initialized:', init)
    return main()
  }

  // Docker is not running, can it be started?
  const isDockerInstalled = await new Promise((resolve) =>
    exec('which docker', (err) => resolve(!err))
  )
  if (isDockerInstalled) {
    const response = await prompts({
      type: 'confirm',
      name: 'startDocker',
      message: 'Would you like to start a Docker?',
    })
    console.log('You want to install docker:', response)
    return
  }

  // Docker is not installed, can it be installed?
  const response = await prompts({
    type: 'confirm',
    name: 'installDocker',
    message: 'Would you like to install a Docker?',
  })
  console.log('You want to install docker:', response)
}
