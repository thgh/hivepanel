import './globals.css'

import axios from 'axios'
import React, { ReactNode } from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { createBrowserRouter } from 'react-router-dom'
import useSWR from 'swr'

import Layout from '@/components/Layout'

import { Button } from './components/ui/button'
import { fetcher } from './lib/swr'
import { ThemeProvider } from './lib/theme'
import { OnboardingState, ServerState } from './lib/types'
import ServiceDetail from './services/detail'
import ServiceList from './services/list'

export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <Layout>
        <ServiceList />
      </Layout>
    ),
    errorElement: <div>Error, not found?</div>,
  },
  {
    path: '/about',
    element: <Layout>About</Layout>,
  },
  {
    path: '/services/:service',
    element: (
      <Layout>
        <ServiceDetail />
      </Layout>
    ),
  },
  {
    path: '/services',
    element: (
      <Layout>
        <ServiceList />
      </Layout>
    ),
    errorElement: <div>Not found!</div>,
  },
])

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Onboarding />
  </React.StrictMode>
)

function Onboarding() {
  const { data, error } = useSWR<ServerState>('/api/state', { fetcher })

  // Loading/error
  if (!data) {
    return <OnboardingLayout>{error ? error.message : null}</OnboardingLayout>
  }

  // Normal state
  if (data.swarm) return <RouterProvider router={router} />

  return <WithoutDockerSwarm />
}

function WithoutDockerSwarm() {
  const { data, error, mutate } = useSWR<OnboardingState>('/api/onboarding', {
    fetcher,
    refreshInterval: 3000,
  })

  if (!data) return null

  // Suggest to initialize a swarm
  if (data.isDockerRunning)
    return (
      <OnboardingLayout>
        <p className="text-lg">
          Almost there! Do you want to add this node to a cluster?
        </p>
        <p className="opacity-60 -mt-2 mb-2">
          If you are not sure, choose "Initialize swarm cluster".
        </p>
        <div className="flex gap-4">
          <Button
            onClick={async () => {
              const ok = await axios.post('/api/onboarding/swarm-init')
              mutate()
              if (ok.data?.message) alert(ok.data.message)
            }}
          >
            Initialize swarm cluster
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              const ok = await axios.post('/api/onboarding/swarm-init')
              mutate()
              if (ok.data?.message) alert(ok.data.message)
            }}
          >
            Join existing swarm cluster
          </Button>
        </div>
      </OnboardingLayout>
    )

  if (data.isDockerInstalled)
    return (
      <OnboardingLayout>
        <p className="text-lg">
          It seems that Docker is installed, but not running.
        </p>
        <p className="opacity-60 -mt-2 mb-2">
          Consider starting the Docker daemon like you are used to.
        </p>
        <Button
          onClick={async () => {
            const ok = await axios.post('/api/onboarding/start-docker-daemon')
            mutate()
            if (ok.data?.message) alert(ok.data.message)
          }}
        >
          Start Docker service
        </Button>
        {/* <pre>{JSON.stringify(data, null, 2)}</pre> */}
      </OnboardingLayout>
    )

  return (
    <OnboardingLayout>
      <p className="text-lg">TODO</p>
      <div className="flex gap-4">
        <Button onClick={async () => {}}>Install Docker</Button>
      </div>
    </OnboardingLayout>
  )
}

function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <div className="flex flex-col p-6 gap-4 h-screen text-center">
        <div className="flex flex-col gap-4  flex-1 items-center justify-center">
          {children}
        </div>
        <h1 className="text-4xl font-bold mt-16 text-slate-500">
          📦 Hivepanel
        </h1>
      </div>
    </ThemeProvider>
  )
}
