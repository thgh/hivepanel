// format using toPrecision
export function formatBytes(bytes: number) {
  if (typeof bytes !== 'number') return
  if (bytes < 1) return '0'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const unit = Math.floor(Math.log(bytes) / Math.log(1024))
  const value = (bytes / Math.pow(1024, Math.floor(unit))).toPrecision(3)
  return parseFloat(value) + ' ' + units[unit]
}

// format using toPrecision
export function formatBytesRatio(bytes?: number, max?: number) {
  if (typeof bytes !== 'number') {
    return typeof max !== 'number' ? '' : 'Max ' + formatBytes(max)
  }
  if (typeof max !== 'number') return formatBytes(bytes)
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const unit = Math.floor(Math.log(bytes) / Math.log(1024))
  const unitMax = Math.floor(Math.log(max) / Math.log(1024))
  const value = (bytes / Math.pow(1024, Math.floor(unit))).toPrecision(3)
  const valueMax = (max / Math.pow(1024, Math.floor(unitMax))).toPrecision(3)
  if (unit === unitMax)
    return parseFloat(value) + ' / ' + parseFloat(valueMax) + ' ' + units[unit]
  return (
    parseFloat(value) +
    ' ' +
    units[unit] +
    ' / ' +
    parseFloat(valueMax) +
    ' ' +
    units[unitMax]
  )
}
