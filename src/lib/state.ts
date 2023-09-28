import type { Swarm } from 'dockerode'

import { engine } from './docker'
import { str62 } from './random'
import type { ServerState, SwarmLabel } from './types'

export const state: ServerState = {}

/** Manage labels */
export const swarm = {
  get users() {
    const users = Object.entries(
      (state.swarm?.Spec ? state.swarm.Spec.Labels! : state.swarmLabelBuffer) ||
        {}
    )
      .filter(([key]) => key.startsWith('hive.panel.user.'))
      .map(([key, value]) => [key.replace('hive.panel.user.', ''), value])
    // if (!users.length)
    //   console.log('no users', state.swarm?.Spec, state.swarmLabelBuffer)
    // @ts-expect-error
    return users.length ? new Map(users) : new Map()
  },
  async migrate(swarm: Swarm) {
    state.swarm = swarm
    state.swarm.Spec.Labels = {
      ...state.swarm.Spec.Labels,
      ...state.swarmLabelBuffer,
    }
    const ok = await engine.post(
      '/swarm/update',
      {
        ...state.swarm.Spec,
        Labels: { ...state.swarm.Spec.Labels, ...state.swarmLabelBuffer },
      },
      { params: { version: state.swarm.Version?.Index } }
    )
    delete state.swarmLabelBuffer
  },
  get(key: SwarmLabel) {
    return state.swarm?.Spec
      ? state.swarm.Spec.Labels![key]
      : state.swarmLabelBuffer?.[key]
  },
  set(key: SwarmLabel, value: string) {
    if (state.swarm?.Spec) {
      state.swarm.Spec.Labels![key] = value
      engine
        .post(
          '/swarm/update',
          {
            ...state.swarm.Spec,
            Labels: {
              ...state.swarm.Spec.Labels,
              [key]: value,
            },
          },
          { params: { version: state.swarm.Version?.Index } }
        )
        .then((ok) => {
          console.log('updated swarm', ok.status, key)
        })
        .catch((error) => {
          console.log('update swarm', error.response?.data || error.message)
        })
    } else {
      if (!state.swarmLabelBuffer) state.swarmLabelBuffer = {} as any
      state.swarmLabelBuffer![key] = value
    }
  },
}

/** Load data required for authentication */
export async function checkAuth() {
  await isSwarmManager()
  if (swarm.users.size > 0) return

  // TODO: bcrypt
  const password = state.fallbackPassword || str62(20)
  if (!state.fallbackPassword) {
    state.fallbackPassword = password
    swarm.set('hive.panel.user.admin', password)
    console.log('🔐 Generated default credentials')
  }

  return { email: 'admin', password }
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
      timeout: 1000,
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
  return !!state.swarm
}
