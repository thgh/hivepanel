import { Request, Response } from 'express'

import { engine } from '@/lib/docker'

export async function GET(req: Request, res: Response) {
  try {
    const { data: swarm } = await engine.get('/swarm')
    const { data: services } = await engine.get('/services')

    res.setHeader(
      'Content-Disposition',
      'attachment; filename="hivepanel-config.json"'
    )
    res.setHeader('Content-Type', 'application/json')
    res.send(JSON.stringify({ swarm, services }, null, 2))
  } catch (err: any) {
    res.status(500).json({ message: 'Error getting config: ' + err.message })
  }
}
