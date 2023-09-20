import { NetworkCreateOptions } from 'dockerode'

import { engine } from '@/lib/docker-client'
import { refreshServices } from '@/lib/useRefresh'

import { Button } from '../ui/button'

export function OverlayNetworkButton() {
  return (
    <Button
      variant={'outline'}
      onClick={async () => {
        await engine.post<any, any, NetworkCreateOptions>('/networks/create', {
          Attachable: true,
          CheckDuplicate: true,
          Driver: 'overlay',
          Name: 'hivenet',
        })
        refreshServices(6)
      }}
    >
      Overlay Network
    </Button>
  )
}
