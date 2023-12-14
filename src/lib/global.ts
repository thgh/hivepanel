import { useEffect, useState } from 'react'

export function createGlobal<T>(initial: T) {
  const context = {
    /** Current data that is returned from the hook */
    data: initial,
    /** React hook that returns the current data */
    hook: () => {
      const [_, setUpdate] = useState(0)
      useEffect(() => {
        context.listeners.push(setUpdate)
        return () => {
          const index = context.listeners.indexOf(setUpdate)
          if (index < 0)
            return console.error('createGlobal: listener not found')
          context.listeners.splice(index, 1)
        }
      }, [])
      return context.data
    },
    /** Internal listeners that are called when the data is updated */
    listeners: [] as ((data: number) => void)[],
    /** Read the data without hook */
    get: () => context.data,
    /** Update the data */
    setData: (data: T) => {
      context.data = data
      context.listeners.forEach((listener) => listener(Date.now()))
      if (context.nextResolve && data) {
        context.nextResolve(data)
        context.nextResolve = undefined
      }
    },
    /** Wait for non-nullable data */
    current: async () => {
      if (context.data) return context.data
      return context.next()
    },
    /** Wait for the next data */
    next: async () => {
      if (context.nextPromise) return context.nextPromise

      return (context.nextPromise = new Promise((resolve) => {
        context.nextResolve = resolve
      }))
    },
    /** Internal */
    nextPromise: undefined as Promise<NonNullable<T>> | undefined,
    /** Internal */
    nextResolve: undefined as ((data: NonNullable<T>) => void) | undefined,
  }
  return context
}
