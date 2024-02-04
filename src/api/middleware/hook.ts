import { engine, Service, ServiceSpec } from '@/lib/docker'

export async function hookMiddleware(req: any, res: any, next: any) {
  if (!req.headers.authorization)
    return res.json({ message: 'Authorization header missing' })

  if (!req.headers.authorization.startsWith('Bearer '))
    return res.json({ message: 'Authorization header must contain Bearer' })

  // Bearer 1$example$WtuGqJhSt6AxwP4
  let [version, service, key] = req.headers.authorization.split('$')
  console.log('version', req.headers.authorization)
  if (version !== 'Bearer 1' || !key) {
    service = ''
    key = req.headers.authorization.slice(7)
  }
  if (key && key.length < 20)
    return res.json({ message: 'Bearer tokens must be at least 20 characters' })

  service = service || req.query.service || req.headers['hive-service']
  if (!service)
    return res.json({
      message:
        'Specify the service using the hive-service header or ?service query param',
    })

  // get service labels
  let result = await engine.get<Service>(`/services/${service}`, {
    validateStatus: () => true,
  })
  if (result.status !== 200)
    return res.json({ message: 'Invalid authorization' })

  const Labels = result.data.Spec.Labels
  const match = Labels[`hive.key.${key}`]
  if (!match) return res.json({ message: 'Invalid authorization' })

  //////////////////// AUTHENTICATED ////////////////////
  const log: string[] = []
  const errors = []

  // Mutate this
  let spec = { ...result.data.Spec }

  // Directives > force update
  directiveForceUpdate(spec)

  // Directives > hive.deploy.image
  const image = req.query['deploy.image'] || req.headers['hive-deploy-image']
  if (image) directiveDeployImage(spec, image, log)

  // Execute the update
  try {
    const update = await engine.post(`/services/${service}/update`, spec, {
      params: { version: result.data.Version.Index },
    })
    log.push('Service update successful')
    console.log('Service update successful', update.data)
    result = await engine.get<Service>(`/services/${service}`)
  } catch (error: any) {
    errors.push(error.message)
    log.push('Failed to update service')
  }

  if (!log.length) return res.json({ message: 'Authenticated' })

  res.json({
    log,
    errors,
    message: log.join('\n') || 'No changes',
    service,
    // key,
    // labels: result.data.Spec.Labels,
    // container: result.data.Spec.TaskTemplate,
  })
}

function directiveForceUpdate(spec: ServiceSpec) {
  spec.TaskTemplate = {
    ...spec.TaskTemplate,
    ForceUpdate: (spec.TaskTemplate?.ForceUpdate || 0) + 1,
  }
}

function directiveDeployImage(spec: ServiceSpec, image: string, log: string[]) {
  const Labels = spec.Labels
  const TaskTemplate = spec.TaskTemplate as any
  // Labels.hive.deploy.image
  if (Labels['hive.deploy.image'] !== image)
    log.push(
      'Labels.hive.deploy.image: ' +
        Labels['hive.deploy.image'] +
        ' => ' +
        image
    )
  // TaskTemplate.ContainerSpec.Image
  else if (TaskTemplate?.ContainerSpec?.Image !== image)
    log.push(
      'TaskTemplate.ContainerSpec.Image: ' +
        TaskTemplate?.ContainerSpec?.Image +
        ' => ' +
        image
    )

  spec.Labels = {
    ...Labels,
    'hive.deploy.image': image,
  }
  spec.TaskTemplate = {
    ...TaskTemplate,
    ContainerSpec: {
      ...TaskTemplate?.ContainerSpec,
      Image: image,
    },
  }
}
