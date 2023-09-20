import { Request, Response, Router } from 'express'

import * as engine from './engine'
import Networks from './middleware/Networks'
import UpdateConfig from './middleware/UpdateConfig'
import * as stats from './stats'

export const serverRouter = Router()

serverRouter.use(Networks)
serverRouter.use(UpdateConfig)

wrap('/engine', engine)
wrap('/stats', stats)

serverRouter.use((req, res) => {
  res.json({ message: 'Hello from the API!ff' })
})

function wrap(prefix: string, methodHandlers: Handlers) {
  if (methodHandlers.GET) serverRouter.get(prefix, methodHandlers.GET)
  if (methodHandlers.POST) serverRouter.post(prefix, methodHandlers.POST)
  if (methodHandlers.DELETE) serverRouter.delete(prefix, methodHandlers.DELETE)
  if (methodHandlers.USE) serverRouter.use(prefix, methodHandlers.USE)
}

type Handlers = {
  GET?: (req: Request, res: Response) => void
  POST?: (req: Request, res: Response) => void
  DELETE?: (req: Request, res: Response) => void
  USE?: (req: Request, res: Response) => void
}
