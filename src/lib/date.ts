export type Dated<T> = { at: string; data: T }

export function withDate<T>(data: T, meta: any = {}): Dated<T> {
  return { ...meta, at: new Date().toJSON(), data }
}

export const secondFormatter = new Intl.DateTimeFormat('nl-BE', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
})
export function humanDateSecond(date?: string) {
  return date ? secondFormatter.format(new Date(date)) : ''
}

export const minuteFormatter = new Intl.DateTimeFormat('nl-BE', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
})
export function humanDateMinute(date?: string) {
  return date ? minuteFormatter.format(new Date(date)) : ''
}
