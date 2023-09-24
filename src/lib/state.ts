import type { Swarm } from 'dockerode'

import { engine } from './docker'
import type { ServerState, SwarmLabel } from './types'

export const state: ServerState = {}

/** Manage labels */
export const swarm = {
  get(key: SwarmLabel) {
    return state.swarm?.Spec
      ? state.swarm.Spec.Labels![key]
      : state.swarmLabelBuffer?.[key]
  },
  set(key: SwarmLabel, value: string) {
    if (state.swarm?.Spec) {
      state.swarm.Spec.Labels![key] = value
    } else {
      if (!state.swarmLabelBuffer) state.swarmLabelBuffer = {} as any
      state.swarmLabelBuffer![key] = value
    }
  },
}

export async function isDockerRunning({ revalidate = 10 } = {}) {
  if (
    state.isDockerRunningAt &&
    Date.now() - state.isDockerRunningAt < 1000 * revalidate
  ) {
    return state.isDockerRunning
  }
  try {
    const ok = await engine.get('/containers/json', {
      validateStatus: () => true,
    })
    state.isDockerRunning = Array.isArray(ok.data)
  } catch (error) {
    state.isDockerRunning = false
  }
  state.isDockerRunningAt = Date.now()
  return state.isDockerRunning
}

export async function isSwarmManager({ revalidate = 10 } = {}) {
  // TODO: Check if the current node is a swarm manager
  if (!(await isDockerRunning())) {
    return false
  }
  const ok = await engine.get<Swarm>('/swarm', { validateStatus: () => true })
  state.swarmAt = Date.now()
  state.swarm = ok.status < 222 ? ok.data : undefined
  console.log('Swarm:', state.swarm)
  return !!state.swarm
}
