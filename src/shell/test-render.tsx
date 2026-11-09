import type { ReactElement, ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { AppModel } from '../app/app-model'
import {
  memoryNavigation,
  NavigationContext,
  type Navigation,
} from '../app/navigation'
import { PanelWidths } from '../app/panels'
import { ServicesContext } from '../app/services'
import { testServices } from '../app/test-kit'
import type { FakeApiServer } from '../test-support/fake-api'
import { AppModelContext } from './context'
import { PanelContext } from './layout/panels'
import { PaletteProvider } from './palette/PaletteProvider'
import { ThemeRoot } from './ui/ThemeRoot'
import { ViewportProvider, type Viewport } from './ui/viewport'

/**
 * An app model over the fake API, after its first loads. The overrides
 * are those of `testServices`, such as the fetch of `HeldRequests`.
 */
export async function startedApp(
  server: FakeApiServer,
  overrides: Parameters<typeof testServices>[1] = {},
): Promise<AppModel> {
  const app = new AppModel(testServices(server, overrides))
  await app.start()
  return app
}

export interface ScreenOptions {
  viewport?: Viewport
  href?: string
  /** The address bar of the test, in place of a new one at `href`. */
  navigation?: Navigation
}

/** Every provider of the app, around a screen of a test. */
export function AppProviders(
  props: ScreenOptions & { app: AppModel; children: ReactNode },
) {
  const { app } = props
  return (
    <ServicesContext.Provider value={app.services}>
      <AppModelContext.Provider value={app}>
        <NavigationContext.Provider
          value={props.navigation ?? memoryNavigation(props.href ?? '/')}
        >
          <PanelContext.Provider value={new PanelWidths(app.services.storage)}>
            <ViewportProvider viewport={props.viewport ?? 'desktop'}>
              <ThemeRoot scheme="dark">
                <PaletteProvider>{props.children}</PaletteProvider>
              </ThemeRoot>
            </ViewportProvider>
          </PanelContext.Provider>
        </NavigationContext.Provider>
      </AppModelContext.Provider>
    </ServicesContext.Provider>
  )
}

/**
 * Draws a screen as HTML, with every provider of the app. Server rendering
 * runs no effects, so a test loads the data that the screen shows first.
 */
export function renderScreen(
  app: AppModel,
  screen: ReactElement,
  options: ScreenOptions = {},
): string {
  return renderToStaticMarkup(
    <AppProviders app={app} {...options}>
      {screen}
    </AppProviders>,
  )
}

/** The visible text of rendered HTML, with tags removed and spaces joined. */
export function textOf(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}
