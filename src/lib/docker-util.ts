import { MountSettings } from 'dockerode'

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
