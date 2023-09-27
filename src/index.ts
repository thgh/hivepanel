import type { AddressInfo } from 'node:net'

import express from 'express'

import { serverRouter } from './api'

export function createServer(port: number) {
  const app = express()

  app.use(express.static('dist'))
  app.use(express.static('public'))
  app.use(express.json())
  app.use('/api', serverRouter)
  app.use((_, res) => {
    res.sendFile(__dirname + '/dist/index.html')
  })

  const server = app.listen(port, () => {
    // If given port was 0, the actual port is assigned dynamically
    const port = (server.address() as AddressInfo).port
    console.log(`📦 Hivepanel is running on http://localhost:${port}`)
  })
  return server
}
