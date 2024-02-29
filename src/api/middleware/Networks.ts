import { engine, handleService } from '@/lib/docker'
import { swarm } from '@/lib/state'

export default handleService(async (spec) => {
  if (spec.Name === 'captain-captain') return

  if (!spec.TaskTemplate) spec.TaskTemplate = {}

  // Keep existing networks
  if (!spec.TaskTemplate?.Networks) {
    await swarm.load()

    const Target =
      // Explicit choice
      swarm.get('hive.network.default') ||
      // Use existing network
      (await getCustomNetwork())

    if (Target) spec.TaskTemplate.Networks = [{ Target }]
  }
})

type Network = {
  Name: 'captain-overlay-network' | 'ingress'
  Driver: 'overlay'
  Scope: 'swarm'
}

async function getCustomNetwork() {
  const networks = await engine.get<Network[]>('/networks', {
    validateStatus: () => true,
    timeout: 4000,
  })
  const options = networks.data
    .filter((n) => n.Driver === 'overlay' && n.Scope === 'swarm')
    .map((s) => s.Name)
    .sort((a, b) => a.localeCompare(b))

  // Return the other network if there are only two options
  if (options.length === 2 && options.some((n) => n === 'ingress'))
    return options.find((n) => n !== 'ingress')

  if (options.length < 2) {
    await engine.post('/networks/create', {
      Attachable: true,
      CheckDuplicate: true,
      Driver: 'overlay',
      Name: 'hivenet',
      Scope: 'swarm',
    })
    console.log('Created default network: hivenet')
    swarm.set('hive.network.default', 'hivenet')
    return 'hivenet'
  }

  console.log('Multiple networks found', options)
}
