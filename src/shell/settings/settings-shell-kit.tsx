import type { ReactElement } from 'react'
import { memoryNavigation, NavigationContext } from '../../app/navigation'
import { Store } from '../../app/store'
import { FakeApiServer } from '../../test-support/fake-api'
import { MacApp, type MacWindow, type MacWindowState } from '../mac/mac-app'
import { Shell } from '../Shell'
import { mountScreen, settle } from '../test-mount'
import { startedApp } from '../test-render'

/** The shell at `address`, as a desktop, a phone, or the Mac app. */
export async function openShell(
  address: string,
  options: {
    viewport?: 'desktop' | 'phone'
    mac?: boolean
    server?: FakeApiServer
  } = {},
) {
  const app = await startedApp(options.server ?? new FakeApiServer())
  const navigation = memoryNavigation(address)
  const window: MacWindow = {
    state: new Store<MacWindowState>({
      mode: 'window',
      canGoBack: false,
      canGoForward: false,
    }),
    back: () => undefined,
    forward: () => undefined,
  }
  const shell: ReactElement = (
    <NavigationContext.Provider value={navigation}>
      <Shell />
    </NavigationContext.Provider>
  )
  const view = mountScreen(
    app,
    options.mac ? <MacApp window={window}>{shell}</MacApp> : shell,
    { viewport: options.viewport ?? 'desktop' },
  )
  await settle()
  return { app, view, navigation }
}
