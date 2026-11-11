import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from '../../src/App'
import { startBrowserErrorReporting } from '../../src/app/error-reporting'
import { browserNavigation } from '../../src/app/navigation'
import { MacApp } from '../../src/shell/mac/mac-app'
import { createMacWindow } from './chrome'
import { installAppPopups } from './navigation'
import { createDesktopServices } from './services'

const navigation = browserNavigation(window)
const reporting = startBrowserErrorReporting({
  platform: 'mac',
  target: window,
  navigation,
  appOrigin: __CONDUCTIVE_APP_ORIGIN__,
})
installAppPopups(__CONDUCTIVE_APP_ORIGIN__)

const root = document.getElementById('root')
if (root) {
  createRoot(root, reporting.rootOptions).render(
    <StrictMode>
      <MacApp window={createMacWindow(window)}>
        <App
          navigation={navigation}
          services={{
            ...createDesktopServices(window, __CONDUCTIVE_APP_ORIGIN__),
            errorReporting: reporting.identity,
          }}
        />
      </MacApp>
    </StrictMode>,
  )
}
