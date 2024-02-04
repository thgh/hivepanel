import { ImageInfo, VolumeInspectInfo } from 'dockerode'
import { FormEvent, useCallback, useRef, useState } from 'react'
import useSWR from 'swr'
import useSWRImmutable from 'swr/immutable'

import { Dated } from './date'
import { type Node, type Service, type TaskAndStats } from './docker'
import { engine } from './docker-client'
import { ServerState, SwarmLabel, SwarmLink } from './types'
import useEvent from './useEvent'

export const fetcher = (url: string) =>
  fetch(url)
    .then((res) => res.json())
    .catch((err) => {
      const message = err.response?.data?.message || err.message
      console.error(
        'fetcher.error',
        err.message,
        err.config?.url,
        err.response?.data
      )
      return Promise.reject(new Error('Fetch error: ' + message))
    })

export function useServices() {
  return useSWR<Dated<Service[]>>('/api/engine/services', fetcher, {
    refreshInterval: 60000,
  })
}

export function useNodes() {
  return useSWRImmutable<Dated<Node[]>>('/api/engine/nodes', fetcher)
}

export function useServicesWithMemory() {
  const services = useServices()
  const tasks = useSWR<Dated<TaskAndStats[]>>('/api/stats', fetcher, {
    refreshInterval: 30000,
  }).data?.data
  const list = Array.isArray(services.data?.data)
  if (!tasks || !list) return services.data?.data
  return services.data?.data.map((service) => {
    const memory = tasks
      .filter(({ task }) => task.ServiceID === service.ID)
      .reduce((sum, { stats }) => sum + (stats?.memory_stats?.usage || 0), 0)
    return { ...service, memory }
  })
}

export function useServerState() {
  return useSWR<ServerState>('/api/state', fetcher)
}

export function useSwarmLinks() {
  const server = useServerState()
  const labels = server.data?.swarm?.Spec.Labels
  if (!labels) return
  return { links: parseSwarmLinks(labels) }
}

export function parseSwarmLinks(labels: Record<string, string>) {
  return Object.entries(labels)
    .filter(([label, value]) => value && label.startsWith('hive.link.'))
    .map(([label, value]) => ({ ...(JSON.parse(value) as SwarmLink), label }))
    .filter((link) => link.type === 'hivepanel')
}

export function useSystemDF() {
  return useSWRImmutable<
    Dated<{ Images: ImageInfo[]; Volumes: VolumeInspectInfo[] }>
  >('/api/engine/system/df?type=image', fetcher)
}

export function useSwarmEditor() {
  // form
  const server = useServerState()
  const ref = useRef<NodeJS.Timeout>()

  // name
  const flush = useEvent(async (evt?: FormEvent<HTMLFormElement>) => {
    console.log('flush', updates)
    evt && evt.preventDefault()
    if (!server.data || !server.data.swarm) return
    if (!updates) return

    try {
      const ok = await engine.post(
        '/swarm/update',
        {
          ...server.data.swarm.Spec,
          Labels: { ...server.data.swarm.Spec.Labels, ...updates },
        },
        { params: { version: server.data?.swarm.Version?.Index } }
      )
      await server.mutate()
      setUpdates(undefined)
    } catch (error) {}
  })

  // links
  const [updates, setUpdates] = useState<Record<string, string>>()

  const label = useCallback((updates: Partial<Record<SwarmLabel, string>>) => {
    setUpdates((prev) => ({ ...prev, ...updates }))
    clearTimeout(ref.current)
    ref.current = setTimeout(() => flush(), 500)
  }, [])

  return {
    labels: { ...server.data?.swarm?.Spec.Labels, ...updates },
    updates,
    label,
    flush,
  }
}
