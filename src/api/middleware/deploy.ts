import { ContainerTaskSpec } from 'dockerode'

import { handleService } from '@/lib/docker'

export default handleService((spec) => {
  if (!spec.Labels) return

  if (spec.Labels['hive.deploy.image']) {
    spec.TaskTemplate = {
      ...spec.TaskTemplate,
      ContainerSpec: {
        ...(spec.TaskTemplate as ContainerTaskSpec)?.ContainerSpec,
        Image: spec.Labels['hive.deploy.image'],
      },
    }
  }

  const TaskTemplate = spec.TaskTemplate as ContainerTaskSpec
  const ContainerSpec = TaskTemplate.ContainerSpec

  // Remove invalid env variables
  if (ContainerSpec?.Env) {
    ContainerSpec!.Env = ContainerSpec!.Env?.filter((env) => !env)
  }

  // Remove invalid endpoint ports (without published port)
  if (spec.EndpointSpec?.Ports) {
    spec.EndpointSpec.Ports = spec.EndpointSpec.Ports.filter(
      (port) => port.PublishedPort
    )
  }

  // Remove invalid volume mounts
  if (ContainerSpec?.Mounts) {
    ContainerSpec!.Mounts = ContainerSpec!.Mounts?.filter(
      (mount) =>
        (mount.Type === 'bind' || mount.Type === 'volume') &&
        mount.Source &&
        mount.Target
    )

    // Trim spaces
    ContainerSpec!.Mounts = ContainerSpec!.Mounts?.map((mount) => ({
      ...mount,
      Source: mount.Source?.trim(),
      Target: mount.Target?.trim(),
    }))
  }
})
