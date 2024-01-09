import { exec } from 'node:child_process'

import type { NetworkCreateOptions, Swarm } from 'dockerode'
import { SWRResponse } from 'swr'

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
    const spec = {
      ...state.swarm.Spec,
      Labels: { ...state.swarm.Spec.Labels, ...state.swarmLabelBuffer },
    }
    const ok = await engine.post('/swarm/update', spec, {
      params: { version: state.swarm.Version?.Index },
    })
    if (ok.status >= 300) throw new Error('Failed to migrate swarm')
    delete state.swarmLabelBuffer

    const network = await engine.post<SWRResponse, any, NetworkCreateOptions>(
      '/networks/create',
      {
        Attachable: true,
        CheckDuplicate: true,
        Driver: 'overlay',
        Name: 'hivenet',
      },
      { validateStatus: () => true }
    )
    if (network.status !== 409 && network.status !== 201) {
      console.log('Failed to create network', network.status, network.data)
    }
    return { swarm }
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
          if (error.response?.data?.message === 'update out of sequence') {
            console.log('out of sequence, data lost')
          }
          console.log('update swarm', error.response?.data || error.message)
        })
    } else {
      if (!state.swarmLabelBuffer) state.swarmLabelBuffer = {}
      state.swarmLabelBuffer![key] = value
    }
  },
  setAll(labels: Partial<Record<SwarmLabel, string>>) {
    if (state.swarm?.Spec) {
      state.swarm.Spec.Labels = {
        ...state.swarm.Spec.Labels,
        ...labels,
      }
      engine
        .post(
          '/swarm/update',
          {
            ...state.swarm.Spec,
            Labels: {
              ...state.swarm.Spec.Labels,
              ...labels,
            },
          },
          { params: { version: state.swarm.Version?.Index } }
        )
        .then((ok) => {
          console.log('updated swarm', ok.status, labels)
        })
        .catch((error) => {
          console.log('update swarm', error.response?.data || error.message)
        })
    } else {
      if (!state.swarmLabelBuffer) state.swarmLabelBuffer = {}
      state.swarmLabelBuffer = {
        ...state.swarmLabelBuffer,
        ...labels,
      }
    }
  },

  async load() {
    try {
      const ok = await engine.get<Swarm>('/swarm', {
        validateStatus: () => true,
      })
      state.swarmAt = Date.now()
      state.swarm = ok.status < 222 ? ok.data : undefined
      console.log('🐝 Loaded swarm', state.swarm?.Version)
      return state.swarm
    } catch (error) {}
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

export async function diskStats({ revalidate = 10 } = {}) {
  return new Promise<{ totaldisk: number; freedisk: number }>(
    (resolve, reject) => {
      exec(`df -k / | awk 'NR==2{print $2,$4}'`, (err, stdout, stderr) => {
        if (err) {
          console.error('diskStats:', stderr)
          reject(err)
        } else {
          const [totaldisk, freedisk] = stdout
            .split(' ')
            .map(Number)
            .map((n) => n * 1024)
          resolve({ totaldisk, freedisk })
        }
      })
    }
  )
}
