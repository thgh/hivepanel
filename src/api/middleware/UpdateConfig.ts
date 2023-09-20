import { handleService } from '@/lib/docker'

export default handleService((spec) => {
  const strategy = spec.Labels?.['hive.update']
  if (!strategy) return

  if (strategy === 'start-first') {
    spec.UpdateConfig = {
      Delay: 5_000_000_000,
      Parallelism: 1,
      Order: 'start-first',
    }

    // This is too much magic, there should be a button in the UI to enable healthchecks for a service.
    // And stop-first should not be enabled for services without healthcheck.
    // Or at least warn that it will not work without healthcheck.
    if (
      'ContainerSpec' in spec.TaskTemplate! &&
      spec.TaskTemplate.ContainerSpec
    ) {
      const image = spec.TaskTemplate.ContainerSpec.Image
      if (image?.startsWith('postgres')) {
        spec.TaskTemplate.ContainerSpec.HealthCheck = {
          Test: ['CMD-SHELL', 'pg_isready -U postgres'],
          Interval: 5_000_000_000,
          Timeout: 2_000_000_000,
          Retries: 3,
        }
      }
      if (image?.startsWith('thgh/hivepanel')) {
        spec.TaskTemplate.ContainerSpec.HealthCheck = {
          Test: ['CMD-SHELL', 'curl -f http://localhost:80/ || exit 1'],
          Interval: 5_000_000_000,
          Timeout: 2_000_000_000,
          Retries: 3,
        }
      }
    }
  }

  if (strategy === 'stop-first')
    spec.UpdateConfig = {
      Delay: 5_000_000_000,
      Parallelism: 3,
      Order: 'stop-first',
    }
})
