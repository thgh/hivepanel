import type { Request, Response } from 'express'

import { hiveConfig } from '@/lib/hiveConfig'

export async function traefikRouterMiddleware(req: Request, res: Response) {
  // if service has host labels, then it must be routed
  if (isServiceSpec(req)) {
    const Name = req.body.Name
    const labels: {
      hive?: {
        ignore?: boolean
        hostnames?: string
      }
    } = parseInput(req.body.Labels)
    console.log('traefikRouterMiddleware', Name, labels)
    // Don't touch existing/ignored services
    if (!labels.hive || labels.hive.ignore) return

    // Overwrite relevant traefik labels
    if (labels.hive.hostnames && typeof labels.hive.hostnames === 'string') {
      req.body = {
        ...req.body,
        Labels: {
          'traefik.enable': 'true',
          'traefik.docker.network': 'hivenet',
          ['traefik.http.routers.' + Name + '.rule']: labels.hive.hostnames
            .split(',')
            .map((h) => 'Host(`' + h.trim() + '`)')
            .join(' || ')
            .replaceAll('.*', '.' + hiveConfig.rootDomain),
          ['traefik.http.routers.' + Name + '.entrypoints']: 'http',
          ['traefik.http.routers.' + Name + '.service']: '' + Name + '',
          ['traefik.http.services.' + Name + '.loadbalancer.server.port']: '80',
          ...req.body.Labels,
        },
      }
    }
  }
}

function isServiceSpec(req: Request) {
  return req.body.Name && req.body.Labels && req.body.TaskTemplate
}
function parseInput(input: Record<string, string>): Record<string, any> {
  const result: Record<string, any> = {}

  for (const [key, value] of Object.entries(input)) {
    const keys = key.split('.')
    let nestedObj = result

    for (let i = 0; i < keys.length; i++) {
      const currentKey = keys[i]
      if (i === keys.length - 1) {
        if (typeof nestedObj === 'string') {
          nestedObj = { _: nestedObj }
        }
        nestedObj[currentKey] = value
      } else {
        nestedObj[currentKey] = nestedObj[currentKey] || {}
        nestedObj = nestedObj[currentKey]
      }
    }
  }

  return result
}
