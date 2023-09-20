import axios from 'axios'
import type {
  ContainerSpec,
  Service as DockerodeService,
  ServiceMode,
  ServiceSpec as DockerodeServiceSpec,
} from 'dockerode'
import { Request, Response } from 'express'
import http from 'http'

export const engine = axios.create({
  baseURL: 'http://localhost',
  httpAgent: new http.Agent({
    // @ts-expect-error It works, so chill out
    socketPath: '/var/run/docker.sock',
  }),
})

export const handleService = (
  handler: (service: ServiceSpec) => void | Promise<void>
) => {
  return async (request: Request, response: Response, next: () => void) => {
    if (isServiceSpec(request)) {
      const spec: ServiceSpec = request.body
      await handler(spec)
    }
    next()
  }
}

function isServiceSpec(req: Request) {
  return req.body.Name && req.body.Labels && req.body.TaskTemplate
}

// engine.interceptors.request.use((config) => {
//   console.log('🐳', config.url, config.params)
//   if (config.url?.startsWith('/')) config.url = 'http://localhost' + config.url
//   return config
// })

// // // log query
// engine.interceptors.response.use((response) => {
//   console.log('🐳', response.config.url)
//   return response
// })

/** Same as Dockerode without some undefineds */
export type Service = {
  ID: string
  Version: {
    Index: number
  }
  CreatedAt: string
  UpdatedAt: string
  PreviousSpec?: ServiceSpec
  Spec: ServiceSpec
  Endpoint: DockerodeService['Endpoint']
}

export type Task = {
  ID: string
  Version: {
    Index: number
  }
  CreatedAt: string
  UpdatedAt: string
  Spec: {
    ContainerSpec: ContainerSpec
    Resources: {
      Limits: {}
      Reservations: {}
    }
    RestartPolicy: {
      Condition: string
      MaxAttempts: number
    }
    Placement: {}
  }
  ServiceID: string
  Slot: number
  NodeID: string
  Status: {
    Timestamp: string
    State: string
    Message: string
    ContainerStatus: {
      ContainerID: string
      PID?: number
    }
  }
  DesiredState: string
  NetworksAttachments: Array<{
    Network: {
      ID: string
      Version: {
        Index: number
      }
      CreatedAt: string
      UpdatedAt: string
      Spec: {
        Name: string
        Labels: {
          'com.docker.swarm.internal': string
        }
        DriverConfiguration: {}
        IPAMOptions: {
          Driver: {}
          Configs: Array<{
            Subnet: string
            Gateway: string
          }>
        }
      }
      DriverState: {
        Name: string
        Options: {
          'com.docker.network.driver.overlay.vxlanid_list': string
        }
      }
      IPAMOptions: {
        Driver: {
          Name: string
        }
        Configs: Array<{
          Subnet: string
          Gateway: string
        }>
      }
    }
    Addresses: Array<string>
  }>
  Name?: string
}

/** Same as Dockerode without some undefineds */
export type ServiceSpec = Omit<DockerodeServiceSpec, 'Labels'> & {
  Labels: Record<string, string | undefined>
  Mode: ServiceMode
}

export type TaskAndStats = {
  task: Task
  stats?: ContainerStats
}

export type TaskInspect = {
  ID: string
  Version: {
    Index: number
  }
  CreatedAt: string
  UpdatedAt: string
  Spec: {
    ContainerSpec: ContainerSpec
    Resources: {
      Limits: {}
      Reservations: {}
    }
    RestartPolicy: {
      Condition: string
      MaxAttempts: number
    }
    Placement: {}
  }
  ServiceID: string
  Slot: number
  NodeID: string
  Status: {
    Timestamp: string
    State: string
    Message: string
    ContainerStatus: {
      ContainerID: string
      PID: number
    }
  }
  DesiredState: string
  NetworksAttachments: Array<{
    Network: {
      ID: string
      Version: {
        Index: number
      }
      CreatedAt: string
      UpdatedAt: string
      Spec: {
        Name: string
        Labels: {
          'com.docker.swarm.internal': string
        }
        DriverConfiguration: {}
        IPAMOptions: {
          Driver: {}
          Configs: Array<{
            Subnet: string
            Gateway: string
          }>
        }
      }
      DriverState: {
        Name: string
        Options: {
          'com.docker.network.driver.overlay.vxlanid_list': string
        }
      }
      IPAMOptions: {
        Driver: {
          Name: string
        }
        Configs: Array<{
          Subnet: string
          Gateway: string
        }>
      }
    }
    Addresses: Array<string>
  }>
  AssignedGenericResources: Array<{
    DiscreteResourceSpec?: {
      Kind: string
      Value: number
    }
    NamedResourceSpec?: {
      Kind: string
      Value: string
    }
  }>
}

export type ContainerStats = {
  read: string
  pids_stats: {
    current: number
  }
  networks: {
    eth0: {
      rx_bytes: number
      rx_dropped: number
      rx_errors: number
      rx_packets: number
      tx_bytes: number
      tx_dropped: number
      tx_errors: number
      tx_packets: number
    }
    eth5: {
      rx_bytes: number
      rx_dropped: number
      rx_errors: number
      rx_packets: number
      tx_bytes: number
      tx_dropped: number
      tx_errors: number
      tx_packets: number
    }
  }
  memory_stats: {
    stats: {
      total_pgmajfault: number
      cache: number
      mapped_file: number
      total_inactive_file: number
      pgpgout: number
      rss: number
      total_mapped_file: number
      writeback: number
      unevictable: number
      pgpgin: number
      total_unevictable: number
      pgmajfault: number
      total_rss: number
      total_rss_huge: number
      total_writeback: number
      total_inactive_anon: number
      rss_huge: number
      hierarchical_memory_limit: number
      total_pgfault: number
      total_active_file: number
      active_anon: number
      total_active_anon: number
      total_pgpgout: number
      total_cache: number
      inactive_anon: number
      active_file: number
      pgfault: number
      inactive_file: number
      total_pgpgin: number
    }
    max_usage: number
    usage: number
    failcnt: number
    limit: number
  }
  blkio_stats: {}
  cpu_stats: {
    cpu_usage: {
      percpu_usage: Array<number>
      usage_in_usermode: number
      total_usage: number
      usage_in_kernelmode: number
    }
    system_cpu_usage: number
    online_cpus: number
    throttling_data: {
      periods: number
      throttled_periods: number
      throttled_time: number
    }
  }
  precpu_stats: {
    cpu_usage: {
      percpu_usage: Array<number>
      usage_in_usermode: number
      total_usage: number
      usage_in_kernelmode: number
    }
    system_cpu_usage: number
    online_cpus: number
    throttling_data: {
      periods: number
      throttled_periods: number
      throttled_time: number
    }
  }
}
