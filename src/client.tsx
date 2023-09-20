import './globals.css'

import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { createBrowserRouter } from 'react-router-dom'

import Layout from '@/components/Layout'

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
    <RouterProvider router={router} />
  </React.StrictMode>
)
