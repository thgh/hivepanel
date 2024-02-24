import type { Swarm } from 'dockerode'

import type { Service } from './docker'

export type SwarmLink = {
  type: 'hivepanel'
  display: string
  url: string
}

export type ServerState = {
  caproverNetwork?: boolean
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
  /** Set up reverse proxy using caddy */
  | 'hive.caddy'
  /** Don't manage this service at all */
  | 'hive.ignore'
  /** Used to publish from CI/CD */
  | `hive.key.${string}`
  /** Container port */
  | 'hive.port'
  | 'hive.replicas'
  | 'hive.tint'
  | 'hive.web.http'
  | 'hive.web.https'
  /** start-first or stop-first */
  | 'hive.update'
  /** Require authentication */
  | `hive.user.${string}`

export type SwarmLabel =
  | 'hive.network.default'
  | 'hive.panel.hostnames'
  | 'hive.panel.https'
  | 'hive.panel.port'
  | 'hive.panel.tag'
  | 'hive.panel.tint'
  | 'hive.panel.name'
  // Metadata about another swarm
  | `hive.link.${string}`
  // Volume for the caddy web server
  | 'hive.caddy.volume'
  // Service that acts as web server
  | 'hive.caddy.service'
  // Volume for the registry data
  | 'hive.registry.volume'
  // Service that acts as registry
  | 'hive.registry.service'
  /** Require authentication */
  | `hive.panel.user.${string}`
  | `hive.session.${string}`
