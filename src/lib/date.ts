export type Dated<T> = { at: string; data: T }

export function withDate<T>(data: T, meta: any = {}): Dated<T> {
  return { ...meta, at: new Date().toJSON(), data }
}

export const secondFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
})
export const secondYearFormatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
})
export function humanDateSecond(date?: string | number) {
  return !date
    ? ''
    : isThisYear(date)
      ? secondFormatter.format(new Date(date))
      : secondYearFormatter.format(new Date(date))
}

export const minuteFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
})
export const minuteYearFormatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
})
export function humanDateMinute(date?: string) {
  return !date
    ? ''
    : isThisYear(date)
      ? minuteFormatter.format(new Date(date))
      : minuteYearFormatter.format(new Date(date))
}

const year = new Date().getFullYear()

function isThisYear(date: string | number) {
  return new Date(date).getFullYear() === year
}
