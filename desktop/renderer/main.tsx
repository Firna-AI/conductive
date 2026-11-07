import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from '../../src/App'
import { browserNavigation } from '../../src/app/navigation'
import { MacApp } from '../../src/shell/mac/mac-app'
import { createMacWindow } from './chrome'
import { installAppPopups } from './navigation'
import { createDesktopServices } from './services'

installAppPopups(__CONDUCTING_APP_ORIGIN__)

const root = document.getElementById('root')
if (root) {
  createRoot(root).render(
    <StrictMode>
      <MacApp window={createMacWindow(window)}>
        <App
          navigation={browserNavigation(window)}
          services={createDesktopServices(window, __CONDUCTING_APP_ORIGIN__)}
        />
      </MacApp>
    </StrictMode>,
  )
}
