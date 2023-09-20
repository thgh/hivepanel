export function str62(len = 20) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let output = ''
  for (; len > 0; len--) output += chars.charAt(Math.random() * chars.length)
  return output
}
