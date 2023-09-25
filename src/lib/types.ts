import type { Swarm } from 'dockerode'

import type { Service } from './docker'

export type ServerState = {
  isDockerRunning?: boolean
  isDockerRunningAt?: number
  // isSwarmManager?: boolean
  // isSwarmManagerAt?: number
  panelService?: Service
  panelServiceAt?: number
  swarm?: Swarm
  swarmAt?: number
  swarmLabelBuffer?: Record<SwarmLabel, string>
  origin?: string
  fallbackPassword?: string
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
  /** Require authentication */
  | `${'hive.user.'}${string}`

export type SwarmLabel =
  | 'hive.panel.hostnames'
  | 'hive.panel.https'
  | 'hive.panel.port'
  | 'hive.panel.tag'
  | 'hive.panel.tint'
  /** Require authentication */
  | `${'hive.panel.user.'}${string}`
  | `${'hive.session.'}${string}`
