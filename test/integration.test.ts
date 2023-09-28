import { exec } from 'node:child_process'
import type { Server } from 'node:http'

import axios, { AxiosInstance } from 'axios'
import { afterAll, beforeAll, expect, test } from 'vitest'

import { createServer } from '@/index'
import { state } from '@/lib/state'

let server: Server
let panel: AxiosInstance
beforeAll(async () => {
  server = await createServer(0)
  panel = axios.create({
    baseURL: state.origin,
    validateStatus: () => true,
  })
})
afterAll(async () => {
  // Comment out to debug the server
  server.close()
  if (process.env.FORCE_LEAVE_SWARM) {
    const leave = await new Promise((resolve) =>
      exec('docker swarm leave --force', (err) => resolve(!err))
    )
    console.log('left swarm', leave)
  }
})

test('onboarding', async () => {
  // Untested: docker is not installed
  // Untested: docker is not running

  // Access check
  const forbidden = await panel.get('/api/state')
  expect(forbidden.status).toBe(401)

  // Authenticate
  const authenticated = await panel.post('/api/auth/login', {
    email: 'admin',
    password: state.fallbackPassword,
  })
  expect(
    authenticated.headers['set-cookie'],
    'Login failed, set FORCE_LEAVE_SWARM=true to leave the swarm after every test run'
  ).toHaveLength(1)
  panel = axios.create({
    baseURL: state.origin,
    validateStatus: () => true,
    headers: { cookie: authenticated.headers['set-cookie'] },
  })

  // Onboarding state
  const { data: first } = await panel.get('/api/state')
  expect(first.isDockerRunning).toBe(true)
  expect(first.origin).toMatch(/^http:\/\/localhost:\d+$/)
  expect(first.swarm).toBeFalsy()
  expect(first.swarmLabelBuffer?.['hive.panel.user.admin']).toHaveLength(20)

  // Initialize swarm
  const init = await panel.post('/api/onboarding/init-swarm')

  // Session is still valid
  const { data: withSwarm } = await panel.get('/api/state')
  expect(withSwarm.isDockerRunning).toBe(true)
  expect(withSwarm.origin).toMatch(/^http:\/\/localhost:\d+$/)
  expect(withSwarm.swarm).toMatchObject({
    JoinTokens: {},
    Spec: { Labels: first.swarmLabelBuffer, Name: 'default' },
    Version: {},
  })
  expect(withSwarm.swarmLabelBuffer).toBeFalsy()
})
