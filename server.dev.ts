/// <reference types="vite/client" />
import express from 'express'
import { createServer } from 'vite'

import { serverRouter } from './src/api'
import { enableDNS } from './src/api/dns'

enableDNS()
const app = express()
const port = process.env.PORT || 23088

app.use(express.static('public'))
app.use(express.json())
app.use('/api', serverRouter)

// global.counter ||= 1
// let counter = global.counter++

if (global.closeSignal) {
  // const start = performance.now()
  await global.closeSignal
  // console.log(counter, 'Waited for close', performance.now() - start)
}

// First start
global.viteInstance ||= await createServer({ server: { middlewareMode: true } })
app.use(global.viteInstance.middlewares)
const server = app.listen(port, () => {
  console.log(`📦 Hivepanel is running on http://localhost:${port}`)
})
global.closeSignal = new Promise((resolve) =>
  server.on('close', () => resolve(1))
)

// Reload on file change
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    server.close()
  })
  import.meta.hot.accept(() => {})
}
