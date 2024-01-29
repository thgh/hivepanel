import './globals.css'

import axios from 'axios'
import React, { ReactNode, useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { createBrowserRouter } from 'react-router-dom'
import useSWR from 'swr'

import Layout from '@/components/Layout'

import { Button } from './components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './components/ui/card'
import { Input } from './components/ui/input'
import { Label } from './components/ui/label'
import { fetcher, useServerState } from './lib/swr'
import { ThemeProvider } from './lib/theme'
import { OnboardingState } from './lib/types'
import ServiceDetail from './services/detail'
import ServiceList from './services/list'
import SettingsAuthentication from './settings/authentication'
import SettingsBackup from './settings/backup'
import SettingsLinks from './settings/links'
import SettingsPrune from './settings/prune'
import SettingsRegistry from './settings/registry'
import SettingsWebserver from './settings/webserver'

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
  {
    path: '/settings',
    element: <Layout />,
    children: [
      {
        path: 'authentication',
        element: <SettingsAuthentication />,
      },
      {
        path: 'backup',
        element: <SettingsBackup />,
      },
      {
        path: 'links',
        element: <SettingsLinks />,
      },
      {
        path: 'prune',
        element: <SettingsPrune />,
      },
      {
        path: 'registry',
        element: <SettingsRegistry />,
      },
      {
        path: 'webserver',
        element: <SettingsWebserver />,
      },
    ],
  },
])

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Onboarding />
  </React.StrictMode>
)

function Onboarding() {
  const { data, error } = useServerState()

  // Loading/error
  if (!data) {
    return <OnboardingLayout>{error ? error.message : null}</OnboardingLayout>
  }

  // Normal state
  if (data.swarm) return <RouterProvider router={router} />

  return <WithoutDockerSwarm />
}

function WithoutDockerSwarm() {
  const { mutate: mutateState } = useServerState()
  const { data, mutate } = useSWR<OnboardingState>('/api/onboarding', {
    fetcher,
    refreshInterval: 3000,
  })
  const [error, setError] = useState<Error>()

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
              const ok = await axios.post('/api/onboarding/init-swarm')
              mutate()
              mutateState()
              if (ok.data?.message && !ok.data.message.includes('uccessful'))
                alert(ok.data.message)
            }}
          >
            Initialize swarm cluster
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              const ok = await axios.post('/api/onboarding/join-swarm')
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

  if (data.status === 401)
    return (
      <OnboardingLayout>
        <AdminRedirect />
        <form
          className="text-left"
          onSubmit={async (evt) => {
            evt.preventDefault()
            const data = new FormData(evt.target as HTMLFormElement)
            const json = Object.fromEntries(data.entries())
            try {
              const ok = await axios.post('/api/auth/login', json)
              if (ok.status === 200) mutateState()
              else if (ok.data?.message) alert(ok.data.message)
            } catch (error: any) {
              setError(error)
            }
          }}
        >
          <Card className="w-80">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl">Sign in</CardTitle>
              <CardDescription>
                {error ? (
                  <span className="text-red-700">
                    {(error as any).response?.data.message || error.message}
                  </span>
                ) : (
                  '  Authenticate to access the control panel.'
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="text"
                  name="email"
                  placeholder="hive@example.org"
                  autoComplete="email"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  name="password"
                  autoComplete="current-password"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full">Sign in</Button>
            </CardFooter>
          </Card>
        </form>
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
  const { error } = useServerState()
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <div className="flex flex-col p-6 gap-4 min-h-screen text-center m-auto">
        {error &&
          (error.message.includes('Failed to fetch') ? (
            <p className="text-red-600 font-medium">
              Cannot reach hivepanel server
            </p>
          ) : (
            <p className="text-red-600 font-medium">
              Server error! {error.message}
            </p>
          ))}
        <div className="flex flex-col gap-4 flex-1 items-center justify-center">
          {children}
        </div>
        <h1 className="text-4xl font-bold mt-16 text-slate-500">
          📦 Hivepanel
        </h1>
      </div>
    </ThemeProvider>
  )
}

/** Autologin as admin */
function AdminRedirect() {
  const { mutate } = useSWR<OnboardingState>('/api/onboarding', { fetcher })
  useEffect(() => {
    if (window.location.hash.startsWith('#password=')) {
      const password = window.location.hash.replace('#password=', '')
      window.location.hash = ''
      axios.post('/api/auth/login', { email: 'admin', password }).then(() => {
        mutate()
      })
    }
  }, [])
  return null
}
