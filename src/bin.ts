#!/usr/bin/env node
import { exec } from 'node:child_process'

import type { Swarm } from 'dockerode'
import prompts from 'prompts'

import { banner, createServer } from './index'
import { engine } from './lib/docker'
import { checkIsDockerInstalled, resetAuth, swarm } from './lib/state'

banner()
const command = process.argv[2]

if (command === 'password') reset()
else if (command === 'user') user()
else main()

// CLI
async function main() {
  // Assume everything is ready to go
  const ok = await engine.get<Swarm>('/swarm', { validateStatus: () => true })
  if (ok.status < 222) {
    console.log(
      'Docker Swarm is ready',
      ok.data?.Spec?.Labels?.['hive.panel.name']
    )
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
  const isDockerInstalled = await checkIsDockerInstalled()
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

async function user() {
  await swarm.load()
  let email = process.argv[3]
  if (!email) {
    const response = await prompts({
      type: 'text',
      name: 'email',
      message: ' Enter new email address',
      hint: 'Leave blank to use "admin"',
    })
    email = response?.email || 'admin'
  }

  const ok = await resetAuth(email)
  if (!ok) return console.log('Failed to reset password')
  const { password } = ok
  console.log('\n      Email:  ' + email + '\n   Password:  ' + password + '\n')
}

async function reset() {
  await swarm.load()
  const users = [...swarm.users.entries()]
  let email = 'admin'
  if (users.length === 1) email = users[0][0]
  else if (users.length > 1) {
    const response = await prompts({
      type: 'select',
      name: 'email',
      message: 'Select user to reset password',
      choices: users.map(([email]) => ({ title: email, value: email })),
    })
    if (!response.email) return console.log('No user selected')
    email = response.email
  }

  const ok = await resetAuth(email)
  if (!ok) return console.log('Failed to reset password')
  const { password } = ok
  console.log('\n      Email:  ' + email + '\n   Password:  ' + password + '\n')
}
