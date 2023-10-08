import { exec } from 'node:child_process'
import type { Server } from 'node:http'

import axios, { AxiosInstance } from 'axios'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

import { createServer } from '@/index'
import { state } from '@/lib/state'

const timeout = { timeout: 100000 }
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

describe('integration', () => {
  test('login', async () => {
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
  })

  test('onboarding', async () => {
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

  let port = Math.floor(Math.random() * 10000) + 10000
  test('service', async () => {
    // Run basic service on random port
    const { data: basic } = await panel.post('/api/engine/services/create', {
      Name: 'test',
      Labels: { 'hive.deploy.image': 'nginxdemos/hello' },
      EndpointSpec: {
        Ports: [{ TargetPort: 80, PublishedPort: port, PublishMode: 'host' }],
      },
    })
    expect(basic).toMatchObject({
      at: expect.stringContaining('T'),
      data: { ID: expect.stringMatching(/^[a-z0-9]{10,30}$/) },
    })
  })

  test(
    'service started',
    async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      const ok = await axios.get('http://localhost:' + port)
      expect(ok.status).toBe(200)
    },
    { retry: 10 }
  )

  const hostname = 'localhost'
  test('web service', async () => {
    // Run basic service on random port
    const { data: basic } = await panel.post('/api/engine/services/create', {
      Name: 'web',
      Labels: {
        'hive.deploy.image': 'nginxdemos/hello',
        'hive.hostnames': hostname,
      },
    })
    expect(basic).toMatchObject({
      at: expect.stringContaining('T'),
      data: { ID: expect.stringMatching(/^[a-z0-9]{10,30}$/) },
    })
  })

  test(
    'web service started',
    async () => {
      await new Promise((resolve) => setTimeout(resolve, 2000))
      // request to localhost
      const ok = await axios.get('http://' + hostname, {
        // httpAgent: new Agent({
        //   lookup: (a, b, cb) => {
        //     cb(null, [{ family: 4, address: '127.0.0.1' }])
        //   },
        // }),
        maxRedirects: 1,
      })
      expect(ok.status).toBe(200)
      expect(ok.data).toContain('<title>Hello World</title>')
      expect(ok.data).toContain('NGINX Logo')
    },
    { retry: 10, timeout: 3000 }
  )
})
