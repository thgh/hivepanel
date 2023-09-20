import { createContext } from 'react'
import { mutate } from 'swr'

export async function refreshServices(x?: number) {
  await mutate('/api/engine/services')
  await mutate('/api/stats')

  if (typeof x === 'number' && x > 0) {
    context.counter = x
  }

  if (context.counter > 0) {
    clearTimeout(context.timeout)
    setTimeout(() => {
      context.counter--
      refreshServices()
    }, 2000)
  }
}

const context: { counter: number; timeout?: any } = { counter: 0 }
export const refreshContext = createContext<{ counter: number; timeout?: any }>(
  context
)
