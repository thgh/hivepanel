#!/usr/bin/env node
import { exec } from 'node:child_process'

import type { Swarm } from 'dockerode'
import prompts from 'prompts'

import { engine } from './lib/docker'

// CLI
;(async () => {
  // Assume everything is ready to go
  const ok = await engine.get<Swarm>('/swarm', { validateStatus: () => true })
  if (ok.status < 222) {
    console.log('Docker Swarm is ready')
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
      message: 'Would you like to initialize a Docker swarm?',
    })
    console.log('You want to initialize Docker Swarm:', response)
    return response
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
    return response
  }

  // Docker is not installed, can it be installed?
  const response = await prompts({
    type: 'confirm',
    name: 'installDocker',
    message: 'Would you like to install a Docker?',
  })
  console.log('You want to install docker:', response)
})()
