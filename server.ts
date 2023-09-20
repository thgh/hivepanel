import type { AddressInfo } from 'node:net'

import express from 'express'

import { serverRouter } from './src/api'

const app = express()
const port = parseInt(process.env.PORT || '23088')

app.use(express.static('dist'))
app.use(express.static('public'))
app.use(express.json())
app.use('/api', serverRouter)
app.use((_, res) => {
  res.sendFile(__dirname + '/dist/index.html')
})

const server = app.listen(port, () => {
  const port = (server.address() as AddressInfo).port
  console.log(`📦 Hivepanel is running on http://localhost:${port}`)
})

// Listen for termination signals allows Ctrl+C in docker run
process.on('SIGINT', () => process.exit(0))
process.on('SIGTERM', () => process.exit(0))
