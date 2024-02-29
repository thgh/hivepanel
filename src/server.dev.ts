/// <reference types="vite/client" />
import express from 'express'
// @ts-expect-error
import { createServer } from 'vite'

import { serverRouter } from './api'
import { enableDNS } from './api/dns'
import { setupWebsocket } from './lib/docker'
import { devPort, HOST } from './lib/env'
import { checkAuth, state } from './lib/state'

enableDNS()
const app = express()
app.set('trust proxy', true)
app.set('x-powered-by', false)
app.use(express.static('public'))
app.use(express.urlencoded({ extended: false }))
app.use(express.json())
app.use('/api', serverRouter)

// global.counter ||= 1
// let counter = global.counter++

if (global.closeSignal) {
  // const start = performance.now()
  // @ts-expect-error
  await global.closeSignal
  // console.log(counter, 'Waited for close', performance.now() - start)
}

// First start
// @ts-expect-error
global.viteInstance ||= await createServer({
  server: { middlewareMode: true, hmr: { port: 23087 } },
})
app.use(global.viteInstance.middlewares)
const server = app.listen(devPort, async () => {
  const url =
    process.env.HIVEPANEL_URL ||
    'http://' + (HOST || 'localhost') + (devPort === 80 ? '' : ':' + devPort)
  let address = (state.origin = url)

  // Add credentials if swarm is not initialized
  const credentials = await checkAuth()
  if (credentials) address += '/#password=' + credentials.password

  console.log(`📦 Hivepanel is running on ${address}`)
})
global.closeSignal = new Promise((resolve) =>
  server.on('close', () => resolve(1))
)

setupWebsocket(server)

// Reload on file change
// @ts-expect-error
if (import.meta.hot) {
  // @ts-expect-error
  import.meta.hot.dispose(() => {
    server.close()
  })
  // @ts-expect-error
  import.meta.hot.accept(() => {})
}
