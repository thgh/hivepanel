import { exec } from 'node:child_process'
import { promises } from 'node:dns'

import type { Request, Response } from 'express'

import { engine, ip4Score } from '@/lib/docker'
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

  /** For use outside docker */
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
    let AdvertiseAddr = undefined
    let ListenAddr = 'eth0'
    let message = 'Unknown error'
    try {
      // 1. Using default IP address
      const init1 = await engine.post(
        '/swarm/init',
        { ListenAddr, Spec: { Labels: state.swarmLabelBuffer } },
        { validateStatus: () => true }
      )
      let id = init1.data
      console.log('swarm.init1', { ListenAddr }, id)

      // 1.a 'interface eth0 has more than one IPv4 address (x and 10.18.0.6)'
      if (
        id &&
        typeof id === 'object' &&
        typeof id.message === 'string' &&
        id.message.includes('interface eth0 has more than one IPv4 address')
      ) {
        const ips = parseIPs(id.message)
        if (ips) {
          console.log('swarm.ips2', ips)
          ListenAddr = ips[0]
          const init2 = await engine.post(
            '/swarm/init',
            { ListenAddr, Spec: { Labels: state.swarmLabelBuffer } },
            { validateStatus: () => true }
          )
          id = init2.data
          console.log('swarm.init2', { ListenAddr }, id)
        }
      }

      // 1.b message: 'could not choose an IP address to advertise since this system has multiple addresses on interface eth0 (x and 10.18.0.6)'
      if (
        id &&
        typeof id === 'object' &&
        typeof id.message === 'string' &&
        id.message.includes(
          'could not choose an IP address to advertise since this system has multiple addresses'
        )
      ) {
        const ips = parseIPs(id.message)
        if (ips) {
          console.log('swarm.ips3', ips)
          AdvertiseAddr = ips[0]
          const init3 = await engine.post(
            '/swarm/init',
            {
              ListenAddr,
              AdvertiseAddr,
              Spec: { Labels: state.swarmLabelBuffer },
            },
            { validateStatus: () => true }
          )
          id = init3.data
          console.log('swarm.init', { ListenAddr, AdvertiseAddr }, id)
        }
      }

      // 3. Using ip based on DNS
      // if (!initialized) {
      //   AdvertiseAddr = (await resolveIP(req.hostname)) || '0.0.0.0'
      //   console.log('swarm.Adver3', AdvertiseAddr)
      //   const { data: ok } = await engine.post(
      //     '/swarm/init',
      //     {
      //       ListenAddr: 'eth0',
      //       AdvertiseAddr: AdvertiseAddr,
      //       Spec: { Labels: state.swarmLabelBuffer },
      //     },
      //     { validateStatus: () => true }
      //   )
      //   console.log('swarm.init', ok)
      // }

      // Check if response looks like a swarm id
      initialized = typeof id === 'string' && id.length > 15 && id.length < 35

      message = 'Initialized swarm but failed to migrate'
      process.stdout.write('Initializing swarm.')
      for (let index = 0; index < 10; index++) {
        try {
          await new Promise((resolve) => setTimeout(resolve, 500))
          process.stdout.write('.')
          const ok = await swarm.load()
          if (!ok) throw new Error('Failed to migrate swarm')
          message = 'Initialized swarm successfully'
          delete state.swarmLabelBuffer
          break
        } catch (err: any) {
          if (index > 7) console.log('swarm', err.response?.data || err.message)
          else process.stdout.write('!')
        }
      }
    } catch (error: any) {
      console.log('init', error.response?.data || error.message)
      if (error.response?.data?.message)
        message = error.response?.data?.message || error.message
    }
    console.log('swarm.init.done')

    return res.json({ message, initialized, migrated })
  }

  res.json({
    isDockerInstalled,
    isDockerRunning: isDockerRunning2,
  })
}

export async function resolveIP(hostname: string) {
  if (!hostname) return ''
  // remove port
  hostname = hostname.split(':')[0]

  if (
    hostname.match(/^\d+\.\d+\.\d+\.\d+$/) ||
    hostname.match(/^[a-fA-F0-9:]+$/)
  )
    return hostname

  const ip4 = await promises.resolve4(hostname)
  if (ip4[0]) return ip4[0]

  const ip6 = await promises.resolve6(hostname)
  if (ip6[0]) return ip6[0]

  return ''
}

function parseIPs(input: string) {
  if (!input) return
  const ips = input.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g)
  return ips?.sort((a, b) => ip4Score(b) - ip4Score(a))
}
