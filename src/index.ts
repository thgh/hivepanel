import { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { resolve } from 'node:path'

import express from 'express'

import { serverRouter } from './api'
import { checkAuth, state } from './lib/state'

export function createServer(port: number) {
  const app = express()
  const cwd = process.cwd()

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
        console.log(err)
      })
      if (credentials) {
        console.log(
          `📦 Hivepanel is running on http://localhost:${port}/#password=${credentials.password}`
        )
      } else {
        console.log(`📦 Hivepanel is running on http://localhost:${port}`)
      }
      resolve(server)
    })
  })
}
