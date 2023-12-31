import type { Swarm } from 'dockerode'

import type { Service } from './docker'

export type SwarmLink = {
  type: 'hivepanel'
  display: string
  url: string
}

export type ServerState = {
  isDockerRunning?: boolean
  isDockerRunningAt?: number
  // isSwarmManager?: boolean
  // isSwarmManagerAt?: number
  panelService?: Service
  panelServiceAt?: number
  swarm?: Swarm
  swarmAt?: number
  swarmLabelBuffer?: Partial<Record<SwarmLabel, string>>
  origin?: string
  fallbackPassword?: string

  freemem?: number
  totalmem?: number
  loadavg?: number[]

  freedisk?: number
  totaldisk?: number
}

export type OnboardingState = {
  isDockerRunning?: boolean
  isDockerInstalled?: boolean
  message?: string
  status?: number
}

export type ServiceLabel =
  | 'hive.auth'
  | 'hive.deploy.Dockerfile'
  | 'hive.deploy.image'
  | 'hive.deploy.static'
  | 'hive.hostnames'
  /** Don't manage this service */
  | 'hive.ignore'
  | 'hive.replicas'
  | 'hive.tint'
  | 'hive.web.http'
  | 'hive.web.https'
  /** start-first or stop-first */
  | 'hive.update'
  /** Require authentication */
  | `${'hive.user.'}${string}`

export type SwarmLabel =
  | 'hive.panel.hostnames'
  | 'hive.panel.https'
  | 'hive.panel.port'
  | 'hive.panel.tag'
  | 'hive.panel.tint'
  | 'hive.panel.name'
  // Metadata about another swarm
  | `${'hive.link.'}${string}`
  // Volume for the caddy web server
  | 'hive.caddy.volume'
  // Service that acts as web server
  | 'hive.caddy.service'
  /** Require authentication */
  | `${'hive.panel.user.'}${string}`
  | `${'hive.session.'}${string}`
