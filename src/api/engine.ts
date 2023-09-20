import { Request, Response } from 'express'

import { withDate } from '@/lib/date'
import { engine } from '@/lib/docker'
import { hiveConfig } from '@/lib/hiveConfig'

import { traefikRouterMiddleware } from './webserver/traefik'

export async function USE(req: Request, res: Response) {
  try {
    if (hiveConfig.webserver === 'traefik')
      await traefikRouterMiddleware(req, res)

    const ok = await engine({
      method: req.method,
      url: req.path,
      data: req.body,
      params: req.query,
    })
    // console.log('ok', ok.data)
    if (typeof ok.data === 'object')
      return res.status(ok.status).json(withDate(ok.data))
    res.status(ok.status).send(ok.data)
  } catch (error: any) {
    console.log('error', error.message, error.response?.data)

    res.status(error.response?.status || 500).json(
      error.response?.data || {
        status: error.response?.status,
        message: error.message,
        data: error.response?.data,
      }
    )
  }
}

// https://docs.docker.com/engine/api/v1.43/#tag/Service/operation/ServiceLogs
