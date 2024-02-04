import { hashSync } from 'bcryptjs'
import { Request } from 'express'

import { ServiceSpec } from '@/lib/docker'

export function caddyBasicauth(req: Request, _: any, next: () => void) {
  if (isServiceSpec(req)) {
    const spec: ServiceSpec = req.body
    for (const k in spec.Labels) {
      const key = k as `caddy.basicauth.${string}`
      const value = spec.Labels[key] as string
      if (
        key.startsWith('caddy.basicauth.') &&
        value &&
        !/^\$2[abxy]?\$\d+\$[.\/A-Za-z0-9]{53}$/.test(value)
      ) {
        console.log('bcrypt.hashSync', key)
        spec.Labels[key] = hashSync(value)
      }
    }
  }
  next()
}
export function isServiceSpec(req: Request) {
  return req.body.Name && req.body.Labels && req.body.TaskTemplate
}
