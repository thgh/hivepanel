import { MountSettings, PortConfig } from 'dockerode'

export function isShortMount(mount: MountSettings) {
  return (
    (mount.Type === 'bind' || mount.Type === 'volume') &&
    !mount.BindOptions &&
    !mount.VolumeOptions &&
    !mount.TmpfsOptions &&
    !mount.Consistency
  )
}

// qsdf -> true
// ./qsdf -> false
// ./q-azer -> false
// q-azer/ -> false
// q-azer -> true
// q_azer -> true
// q.azer -> true
// q%azer -> false
export function isVolumeName(name: string) {
  return name.match(/^[a-zA-Z0-9._-]+$/) !== null
}

export function getVolumeType(source: string) {
  return isVolumeName(source) ? ('volume' as const) : ('bind' as const)
}

export function parseImageName(full: string) {
  let name = full.split(':')[0]
  let tag = full.slice(name.length + 1)
  let repo = ''
  if (name.includes('/')) [repo, name] = name.split('/')
  return { repo, name, tag }
}

export function parsePort(input: string | PortConfig): PortConfig {
  // Already parsed
  if (typeof input !== 'string') return input

  let PublishMode = 'ingress' as 'host',
    Protocol = 'tcp' as any,
    PublishedPort,
    TargetPort
  input = input.trimStart()
  if (input.startsWith('- ')) input = input.slice(2)
  let parts = input.split(':')
  if (parts.includes('host')) PublishMode = 'host'
  if (parts.includes('udp')) Protocol = 'udp'
  if (parts.includes('sctp')) Protocol = 'sctp'
  parts = parts.filter((p) => !['host', 'udp', 'sctp'].includes(p))
  // regex to test if string is only numbers
  if (parts[0] && /\d/.test(parts[0])) {
    PublishedPort = parseInt(parts[0])
    parts.shift()
  }
  if (parts[0] && /\d/.test(parts[0])) {
    TargetPort = parseInt(parts[0])
    parts.shift()
  }
  const Name = parts.length ? parts.join(':') : undefined

  return {
    PublishedPort,
    TargetPort,
    PublishMode,
    Protocol,
    Name,
  }
}
