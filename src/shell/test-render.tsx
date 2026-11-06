import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { AppModel } from '../app/app-model'
import { memoryNavigation, NavigationContext } from '../app/navigation'
import { PanelWidths } from '../app/panels'
import { ServicesContext, type AppServices } from '../app/services'
import { testServices } from '../app/test-kit'
import type { FakeApiServer } from '../test-support/fake-api'
import { AppModelContext } from './context'
import { PanelContext } from './layout/panels'
import { ThemeRoot } from './ui/ThemeRoot'
import { ViewportProvider, type Viewport } from './ui/viewport'

/** An app model over the fake API, after its first loads. */
export async function startedApp(
  server: FakeApiServer,
  overrides: Partial<AppServices> = {},
): Promise<AppModel> {
  const app = new AppModel(testServices(server, overrides))
  await app.start()
  return app
}

/**
 * Draws a screen as HTML, with every provider of the app. Server rendering
 * runs no effects, so a test loads the data that the screen shows first.
 */
export function renderScreen(
  app: AppModel,
  screen: ReactElement,
  options: { viewport?: Viewport; href?: string } = {},
): string {
  return renderToStaticMarkup(
    <ServicesContext.Provider value={app.services}>
      <AppModelContext.Provider value={app}>
        <NavigationContext.Provider
          value={memoryNavigation(options.href ?? '/')}
        >
          <PanelContext.Provider value={new PanelWidths(app.services.storage)}>
            <ViewportProvider viewport={options.viewport ?? 'desktop'}>
              <ThemeRoot scheme="dark">{screen}</ThemeRoot>
            </ViewportProvider>
          </PanelContext.Provider>
        </NavigationContext.Provider>
      </AppModelContext.Provider>
    </ServicesContext.Provider>,
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
