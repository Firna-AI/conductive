import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { createLiveServices } from './app/live-services'
import { browserNavigation } from './app/navigation'
import type { AppServices } from './app/services'
import { MacApp, type MacWindow } from './shell/mac/mac-app'

/**
 * The services of the app. Development uses the fake API, so that each screen
 * works without its backend. The production build drops this branch, so it
 * never bundles the fake.
 */
async function services(): Promise<AppServices> {
  if (import.meta.env.DEV) {
    const { createFakeServices } = await import('./app/dev/fake-services')
    return createFakeServices(window.location.search)
  }
  return createLiveServices(window)
}

/**
 * The window of the Mac app that the development page can play, as
 * `?mac=1` asks, or null. Production is the web app, and the Mac app makes
 * its own window in its renderer.
 */
async function macWindow(): Promise<MacWindow | null> {
  if (!import.meta.env.DEV) return null
  const { devMacWindow } = await import('./app/dev/dev-mac-window')
  return devMacWindow(window)
}

const root = document.getElementById('root')

if (root) {
  void Promise.all([services(), macWindow()]).then(([ready, mac]) => {
    const app = <App navigation={browserNavigation(window)} services={ready} />
    createRoot(root).render(
      <StrictMode>
        {mac ? <MacApp window={mac}>{app}</MacApp> : app}
      </StrictMode>,
    )
  })
}
