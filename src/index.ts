import { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { resolve } from 'node:path'

import express from 'express'

import { serverRouter } from './api'
import { setupWebsocket } from './lib/docker'
import { buildDate, version } from './lib/env'
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
      state.origin = `http://localhost:${port}`
      const credentials = await checkAuth().catch((err) => {
        console.log('credentials.err', err)
      })
      console.log(
        `Server is listening on ${state.origin}${
          credentials ? `/#password=${credentials.password}` : ''
        }`
      )
      resolve(server)
    })
    setupWebsocket(server)
  })
}
