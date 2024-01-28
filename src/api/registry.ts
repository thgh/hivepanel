import { Request, Response } from 'express'

import { engine } from '@/lib/docker'
import { swarm } from '@/lib/state'

export async function GET(req: Request, res: Response) {
  try {
    const serviceName = swarm.get('hive.registry.service') || 'registry'
    const volume = swarm.get('hive.registry.volume') || 'registry-data'
    const { data: service } = await engine
      .get('/services/' + serviceName)
      .catch(() => ({ data: null }))

    res.json({ service, serviceName, volume })
  } catch (err: any) {
    res.status(500).json({ message: 'Error getting registry: ' + err.message })
  }
}
