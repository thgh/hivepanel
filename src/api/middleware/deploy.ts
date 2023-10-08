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
})
