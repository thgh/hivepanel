import { createGlobal } from './global'

export type PanelOrigin = {
  origin: string
  accepted: string
  display?: string
}

/** Initial state is cached copy of panels */
export const panels = createGlobal<{ at: string; data: PanelOrigin[] }>(
  localStorage.panels ? JSON.parse(localStorage.panels) : undefined
)

export const panelSync = createGlobal<'on' | 'off'>(
  localStorage.panelSync || 'off'
)

export function receivePanels(data: PanelOrigin[]) {
  console.log('receivePanels', data)
  panels.setData({ at: new Date().toJSON(), data })
  localStorage.panels = JSON.stringify({ at: new Date().toJSON(), data })
}

if (localStorage.panelSync === 'on') {
  setTimeout(readPanels, 3000)
}

export function useIsPanelRegistered() {
  const all = panels.hook()
  const registered = all?.data.find((p) => p.origin === location.origin)
  return registered?.accepted
}

export async function registerPanel(display?: string) {
  if (panelSync.data === 'on') {
    const all = await readPanels()
    const exists = all?.data.find((p) => p.origin === location.origin)
  } else {
    localStorage.panelSync = 'on'
  }

  const iframe = document.createElement('iframe')
  iframe.onload = () => {
    // Listen to result
    window.addEventListener('message', (event) => {
      if (event.data && event.data.hive === 'panels') {
        console.log('panels', event.data)
        receivePanels(event.data.panels)
      }
      if (event.data && event.data.hive === 'register_accepted') {
        iframe.remove()
      }
      if (event.data && event.data.hive === 'register_denied') {
        iframe.remove()
      }
    })
    // Register
    iframe.contentWindow?.postMessage({ hive: 'register', display }, '*')
  }
  iframe.src = 'https://hivepanel-recent.vercel.app'
  document.body.appendChild(iframe)
}

export function setPanelName(origin: string, name: string) {
  const iframe = document.createElement('iframe')
  iframe.onload = () => {
    // Listen to result
    window.addEventListener('message', (event) => {
      if (event.data && event.data.hive === 'panels') {
        console.log('panels', event.data)
        receivePanels(event.data.panels)
      }
    })
    // Set name
    iframe.contentWindow?.postMessage({ hive: 'setName', origin, name }, '*')
    setTimeout(() => iframe.remove(), 3000)
  }
  iframe.src = 'https://hivepanel-recent.vercel.app'
  document.body.appendChild(iframe)
}

export function readPanels(timeout = 3000) {
  console.log('readPanels', timeout)
  const iframe = document.createElement('iframe')
  // iframe.sandbox = 'allow-scripts allow-same-origin allow-modals'
  iframe.onload = () => {
    // Listen to result
    window.addEventListener('message', (event) => {
      if (event.data && event.data.hive === 'panels') {
        console.log('read panels', event.data)
        receivePanels(event.data.panels)
      }
    })
    // Trigger read
    iframe.contentWindow?.postMessage({ hive: 'read' }, '*')
    setTimeout(() => iframe.remove(), 10 * timeout)
  }
  iframe.src = 'https://hivepanel-recent.vercel.app'
  document.body.appendChild(iframe)
  return panels.next()
}
