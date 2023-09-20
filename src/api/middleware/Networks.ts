import { handleService } from '@/lib/docker'

export default handleService((spec) => {
  if (!spec.TaskTemplate) spec.TaskTemplate = {}

  // Keep existing networks
  if (!spec.TaskTemplate?.Networks)
    spec.TaskTemplate.Networks = [{ Target: 'hivenet' }]
})
