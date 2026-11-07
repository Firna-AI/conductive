import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { createLiveServices } from './app/live-services'
import { browserNavigation } from './app/navigation'
import type { AppServices } from './app/services'

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

const root = document.getElementById('root')

if (root) {
  void services().then((ready) => {
    createRoot(root).render(
      <StrictMode>
        <App navigation={browserNavigation(window)} services={ready} />
      </StrictMode>,
    )
  })
}
