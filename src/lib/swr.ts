import useSWR from 'swr'

import { Dated } from './date'
import type { Service, TaskAndStats } from './docker'

export const fetcher = (url: string) =>
  fetch(url)
    .then((res) => res.json())
    .catch((err) => {
      console.error(err.message, err.config?.url, err.response?.data)
      return Promise.reject(new Error('Axios error'))
    })

export function useServices() {
  return useSWR<Dated<Service[]>>('/api/engine/services', fetcher, {
    refreshInterval: 60000,
  })
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
