import { Request, Response } from 'express'

import { isSwarmManager, state } from '@/lib/state'

export async function stateMiddleware(req: Request, res: Response) {
  if (!state.swarmAt) await isSwarmManager()
  res.json(state)
}
