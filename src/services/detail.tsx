import { useEffect, useState } from 'react'
import { Outlet, useParams } from 'react-router-dom'
import useSWR from 'swr'

import { ServiceCard } from '@/components/ServiceCard'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dated } from '@/lib/date'
import type { Service, Task } from '@/lib/docker'
import { fetcher } from '@/lib/swr'

export default function ServiceDetail() {
  const [live, setLive] = useState(0)

  const params = useParams()
  console.log('params', params)
  const swr = useSWR<Dated<Service>>(
    '/api/engine/services/' + params.service,
    fetcher
  )
  const service = swr.data?.data
  const tasks = useSWR<Dated<Task[]>>(
    '/api/engine/tasks?filters=' +
      encodeURIComponent(JSON.stringify({ service: [params.service] })),
    fetcher
  )

  useEffect(() => {
    if (!live) return
    console.log('refresh live', live)
    swr.mutate()
    const t = setTimeout(() => {
      setLive((live) => (live > 0 ? live - 1 : 0))
    }, 2000)
    return () => clearTimeout(t)
  }, [live])

  return (
    <>
      <main className="p-6 w-full">
        <div className="flex gap-4 flex-col">
          {service && (
            <ServiceCard
              service={service}
              tasks={tasks.data?.data}
              onChange={(live) =>
                typeof live === 'number' ? setLive(live) : swr.mutate()
              }
            />
          )}
        </div>
        {/* <pre>{JSON.stringify(tasks.data?.data, null, 2)}</pre> */}
        {/* <pre>{JSON.stringify(service, null, 2)}</pre> */}
        <Outlet />
      </main>

      <ScrollArea
        orientation="horizontal"
        className="flex flex-col w-[calc(100vw_-_256px)]"
      >
        sdf
      </ScrollArea>
    </>
  )
}
