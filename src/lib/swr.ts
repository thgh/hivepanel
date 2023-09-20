import useSWR from 'swr'

import { Dated } from './date'
import type { Service } from './docker'

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
