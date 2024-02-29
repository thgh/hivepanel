import axios from 'axios'
import cookieParser from 'cookie-parser'
import { Router } from 'express'

import * as config from './config'
import * as diskUsage from './disk-usage'
import * as engine from './engine'
import { authMiddleware } from './middleware/auth'
import caprover, { migrateFromCaprover } from './middleware/caprover'
import deploy from './middleware/deploy'
import { hookMiddleware } from './middleware/hook'
import Networks from './middleware/Networks'
import { onboardingMiddleware } from './middleware/onboarding'
import { caddyBasicauth } from './middleware/registry-basicauth'
import { stateMiddleware } from './middleware/state'
import UpdateConfig from './middleware/UpdateConfig'
import web from './middleware/web'
import * as registry from './registry'
import * as stats from './stats'

export const serverRouter = Router()

// Core API routes
serverRouter.use(cookieParser())
serverRouter.use('/hook', hookMiddleware)
serverRouter.use(authMiddleware)
serverRouter.use('/state', stateMiddleware)
serverRouter.use('/onboarding', onboardingMiddleware)
serverRouter.get('/config', config.GET)
serverRouter.get('/registry', registry.GET)
serverRouter.get('/disk-usage', diskUsage.GET)
serverRouter.get('/one-click-apps-logos/:name', async (req, res) => {
  const url = `https://github.com/caprover/one-click-apps/blob/master/public/v4/logos/${req.params.name}?raw=true`
  const ok = await axios.get(url, { responseType: 'stream' })
  res.writeHead(200, {
    'cache-control': 'public, max-age=31536000, immutable',
  })
  ok.data.pipe(res)
})
serverRouter.get('/migrate-from-caprover', migrateFromCaprover)
serverRouter.post('/migrate-from-caprover', migrateFromCaprover)

// Service spec middleware
serverRouter.use(caprover)
serverRouter.use(Networks)
serverRouter.use(UpdateConfig)
serverRouter.use(deploy)
serverRouter.use(web)
serverRouter.use('/engine/services/:create', caddyBasicauth)

// Docker engine routes
serverRouter.use('/engine', engine.USE)
serverRouter.get('/stats', stats.GET)

// Fallback
serverRouter.use((req, res) => {
  res.json({ message: 'Hello from the API!' })
})
