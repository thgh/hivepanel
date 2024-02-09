import { ContainerTaskSpec } from 'dockerode'
import stream from 'stream'
import tar from 'tar-stream'

import { engine, handleService, ServiceSpec } from '@/lib/docker'
import { parsePort } from '@/lib/docker-util'

export default handleService(async (spec) => {
  if (!spec.Labels) return

  if (spec.Labels['hive.deploy.Dockerfile']) {
    const image = await buildImage(spec)
    spec.Labels['hive.deploy.image'] = image.tag
  }

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
    ContainerSpec.Env = ContainerSpec.Env.filter(Boolean)
  }

  // Remove invalid endpoint ports (without published port)
  if (spec.EndpointSpec?.Ports) {
    spec.EndpointSpec.Ports = spec.EndpointSpec.Ports.map(parsePort).filter(
      (port) => port?.PublishedPort
    )
  }

  // Remove invalid volume mounts
  if (ContainerSpec?.Mounts) {
    ContainerSpec!.Mounts = ContainerSpec!.Mounts?.filter(
      (mount) =>
        typeof mount === 'string' ||
        ((mount.Type === 'bind' || mount.Type === 'volume') &&
          mount.Source &&
          mount.Target)
    )

    // Trim spaces
    ContainerSpec!.Mounts = ContainerSpec!.Mounts?.map((mount) =>
      typeof mount === 'string'
        ? mount
        : {
            ...mount,
            Source: mount.Source?.trim(),
            Target: mount.Target?.trim(),
          }
    )
  }
})

async function buildImage(spec: ServiceSpec) {
  if (!spec.Labels['hive.deploy.Dockerfile'])
    throw new Error('No Dockerfile specified')

  const now = new Date()
  now.setMilliseconds(0)
  const tag = `build-${spec.Name}:${now.toJSON().replace(/:/g, '-').replace('.000Z', '')}`
  console.log('Building', tag)

  try {
    // Create the tar stream
    const pack = tar.pack()
    pack.entry({ name: 'Dockerfile' }, spec.Labels['hive.deploy.Dockerfile'])
    pack.finalize()

    // Pass tar file to docker engine
    const response = await engine.post(
      '/build?' + new URLSearchParams({ t: tag }),
      pack.pipe(new stream.PassThrough()),
      { headers: { 'Content-Type': 'application/x-tar' } }
    )

    console.log('Build success:', response.data)
    return { tag }
  } catch (error: any) {
    console.error('Error building image:', error.response?.data, error.message)
    throw error
  }
}

// return Promise.resolve() //
//   .then(function () {
//     return tar.c(
//       {
//         file: tarFilePath,
//         cwd: sourceDirectory,
//       },
//       ['./']
//     )
//   })

// module.exports.prepareBuildContext = function (file, next) {
//   if (file && file.context) {
//     fs.readFile(path.join(file.context, '.dockerignore'), (err, data) => {
//       let ignoreFn
//       let filterFn

//       if (!err) {
//         const dockerIgnore = DockerIgnore({ ignorecase: false }).add(
//           data.toString()
//         )

//         filterFn = dockerIgnore.createFilter()
//         ignoreFn = (path) => {
//           return !filterFn(path)
//         }
//       }

//       const entries = file.src.slice() || []

//       const pack = tar.pack(file.context, {
//         entries: filterFn ? entries.filter(filterFn) : entries,
//         ignore: ignoreFn, // Only works on directories
//       })

//       next(pack.pipe(zlib.createGzip()))
//     })
//   } else {
//     next(file)
//   }
// }
