import type { MacWindow } from '../../shell/mac/mac-app'
import { Store } from '../store'

/**
 * A window of the Mac app for the development page, at `?mac=1`, so a
 * browser can show the parts that only the Mac app shows, such as the
 * import from Conductor. Its history buttons use the history of the page.
 * Without the option, the page is the web app.
 */
export function devMacWindow(target: Window): MacWindow | null {
  if (new URLSearchParams(target.location.search).get('mac') !== '1') {
    return null
  }
  return {
    state: new Store({ mode: 'window', canGoBack: true, canGoForward: true }),
    back: () => target.history.back(),
    forward: () => target.history.forward(),
  }
}
