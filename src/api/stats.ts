import { Request, Response } from 'express'

import { withDate } from '@/lib/date'
import { engine, Task } from '@/lib/docker'

export async function GET(req: Request, res: Response) {
  try {
    const tasks = await engine.get<Task[]>('/tasks')

    const ok = await Promise.all(
      tasks.data.map(async (task) => {
        if (
          !task.Status?.ContainerStatus?.ContainerID ||
          task.Status?.State === 'failed'
        )
          return { task }
        const ok = await engine.get(
          '/containers/' + task.Status.ContainerStatus.ContainerID + '/stats',
          { params: { stream: false }, validateStatus: () => true }
        )
        return { task, stats: ok.data }
      })
    )
    res.send(withDate(ok))
  } catch (error: any) {
    console.log('error', error.message, error.response?.data)

    res.status(error.response?.status || 500).json(
      error.response?.data || {
        status: error.response?.status,
        message: error.message,
        data: error.response?.data,
      }
    )
  }
}

// https://docs.docker.com/engine/api/v1.43/#tag/Service/operation/ServiceLogs
