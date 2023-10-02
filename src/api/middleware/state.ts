import { freemem, loadavg, totalmem } from 'node:os'

import type { Request, Response } from 'express'

import { diskStats, isSwarmManager, state } from '@/lib/state'

export async function stateMiddleware(req: Request, res: Response) {
  if (!state.swarmAt) await isSwarmManager()

  res.json({
    ...state,
    ...(await diskStats()),
    totalmem: totalmem(),
    freemem: freemem(),
    loadavg: loadavg(),
  })
}
