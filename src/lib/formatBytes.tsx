// format using toPrecision
export function formatBytes(bytes: number, precision = 3) {
  if (typeof bytes !== 'number') return
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const unit = Math.floor(Math.log(bytes) / Math.log(1024))
  const value = (bytes / Math.pow(1024, Math.floor(unit))).toPrecision(
    precision
  )
  return parseFloat(value) + ' ' + units[unit]
}
