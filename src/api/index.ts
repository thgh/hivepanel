import cookieParser from 'cookie-parser'
import { Router } from 'express'

import * as engine from './engine'
import { authMiddleware } from './middleware/auth'
import Networks from './middleware/Networks'
import { onboardingMiddleware } from './middleware/onboarding'
import { stateMiddleware } from './middleware/state'
import UpdateConfig from './middleware/UpdateConfig'
import * as stats from './stats'

export const serverRouter = Router()

// Core API routes
serverRouter.use(cookieParser())
serverRouter.use(authMiddleware)
serverRouter.use('/state', stateMiddleware)
serverRouter.use('/onboarding', onboardingMiddleware)

// Service spec middleware
serverRouter.use(Networks)
serverRouter.use(UpdateConfig)

// Docker engine routes
serverRouter.use('/engine', engine.USE)
serverRouter.get('/stats', stats.GET)

// Fallback
serverRouter.use((req, res) => {
  res.json({ message: 'Hello from the API!' })
})
