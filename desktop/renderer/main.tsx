import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from '../../src/App'
import { browserNavigation } from '../../src/app/navigation'
import { createDesktopServices } from './services'

const root = document.getElementById('root')
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App
        navigation={browserNavigation(window)}
        services={createDesktopServices(window, __CONDUCTING_APP_ORIGIN__)}
      />
    </StrictMode>,
  )
}
