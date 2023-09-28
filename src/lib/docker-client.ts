import axios from 'axios'

import type { Service } from './docker'

export const engine = axios.create({
  baseURL: '/api/engine',
})

engine.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response) {
      if (error.response?.data?.message) {
        alert(error.response?.data?.message)
      }
      throw error.response.data
    }
    throw error
  }
)

export async function updateService(
  service: Service,
  mutate: (service: Service['Spec']) => Service['Spec']
) {
  return engine.post<any, any, Service['Spec']>(
    '/services/' + service.ID + '/update',
    mutate(service['Spec']),
    { params: { version: service.Version.Index } }
  )
}
