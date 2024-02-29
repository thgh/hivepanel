import { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { resolve } from 'node:path'

import express from 'express'

import { serverRouter } from './api'
import { setupWebsocket } from './lib/docker'
import { buildDate, URL, version } from './lib/env'
import { checkAuth, state } from './lib/state'

let hasPrintedBanner = false
export function banner() {
  if (hasPrintedBanner) return
  console.log(`📦 Hivepanel ${version} ${buildDate}`)
  hasPrintedBanner = true
}

export function createServer(port: number) {
  banner()
  const app = express()
  const cwd = process.cwd()
  app.set('trust proxy', true)
  app.set('x-powered-by', false)
  app.use(express.static(resolve(cwd, 'dist')))
  app.use(express.urlencoded({ extended: false }))
  app.use(express.json())
  app.use('/api', serverRouter)
  app.use((_, res) => {
    res.sendFile(resolve(cwd, 'dist/index.html'))
  })

  return new Promise<Server>((resolve) => {
    const server = app.listen(port, async () => {
      // If given port was 0, the actual port is assigned dynamically
      const port = (server.address() as AddressInfo).port

      let address = (state.origin = addPort(URL, port))

      // Add credentials if swarm is not initialized
      const credentials = await checkAuth()
      if (credentials) address += '/#password=' + credentials.password

      console.log(`Server is running on ${address}`)

      resolve(server)
    })
    setupWebsocket(server)
  })
}

function addPort(host: string, port: number) {
  return host + (port === 80 ? '' : ':' + port)
}
