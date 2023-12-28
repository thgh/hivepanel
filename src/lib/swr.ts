import useSWR from 'swr'
import useSWRImmutable from 'swr/immutable'

import { Dated } from './date'
import type { Node, Service, TaskAndStats } from './docker'
import { ServerState } from './types'

export const fetcher = (url: string) =>
  fetch(url)
    .then((res) => res.json())
    .catch((err) => {
      const message = err.response?.data?.message || err.message
      console.error(err.message, err.config?.url, err.response?.data)
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
  if (!tasks) return services.data?.data
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
  const nodes = useNodes()
  const server = useServerState()
  const labels = server.data?.swarm?.Spec.Labels
  if (!labels) return
  const links = Object.entries(labels)
    .filter(([label, value]) => label.startsWith('hive.link.'))
    .map(([label, value]) => JSON.parse(value))
    .filter((link) => link.type === 'hivepanel')

  return {
    hostname: nodes.data?.data?.[0].Description.Hostname,
    links,
  }
}
