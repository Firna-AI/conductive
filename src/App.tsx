import { useState } from 'react'
import { AppModel } from './app/app-model'
import { NavigationContext, type Navigation } from './app/navigation'
import { PanelLayout } from './app/panels'
import { ServicesContext, type AppServices } from './app/services'
import { AppModelContext } from './shell/context'
import { PanelContext } from './shell/layout/panels'
import { Shell } from './shell/Shell'
import { ThemeRoot } from './shell/ui/ThemeRoot'
import { useViewport, ViewportProvider } from './shell/ui/viewport'
import {
  FeaturesContext,
  type WorkspaceFeatures,
} from './shell/workspace/features'

/**
 * The web app. `services` gives the API, the events, the clock, and the
 * storage: the live Worker in production, the fake API in development.
 * `features` gives the parts of a workspace that later milestones build,
 * such as the chat, the files, and the tools.
 */
export function App(props: {
  services: AppServices
  navigation: Navigation
  features?: WorkspaceFeatures
}) {
  const [app] = useState(() => new AppModel(props.services))
  const [panels] = useState(() => new PanelLayout(props.services.storage))
  const viewport = useViewport()
  return (
    <ServicesContext.Provider value={props.services}>
      <AppModelContext.Provider value={app}>
        <NavigationContext.Provider value={props.navigation}>
          <PanelContext.Provider value={panels}>
            <FeaturesContext.Provider value={props.features ?? {}}>
              <ViewportProvider viewport={viewport}>
                <ThemeRoot>
                  <Shell />
                </ThemeRoot>
              </ViewportProvider>
            </FeaturesContext.Provider>
          </PanelContext.Provider>
        </NavigationContext.Provider>
      </AppModelContext.Provider>
    </ServicesContext.Provider>
  )
}
