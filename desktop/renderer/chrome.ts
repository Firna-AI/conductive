import './chrome.css'
import { Store } from '../../src/app/store'
import type { MacWindow, MacWindowState } from '../../src/shell/mac/mac-app'

/** WCO is a read-only browser API, not a privileged renderer bridge. */
interface WindowControlsOverlay extends EventTarget {
  visible: boolean
}

function hasOverlay(
  value: Navigator,
): value is Navigator & { windowControlsOverlay: WindowControlsOverlay } {
  return 'windowControlsOverlay' in value
}

function sameState(a: MacWindowState, b: MacWindowState): boolean {
  return (
    a.mode === b.mode &&
    a.canGoBack === b.canGoBack &&
    a.canGoForward === b.canGoForward
  )
}

/**
 * The window of the Mac app, from standard web APIs only. This document has
 * no access to Electron or Node. Window Controls Overlay shows while macOS
 * shows the window buttons, and full screen hides it. The Navigation API
 * tells whether the history can go back or forward.
 */
export function createMacWindow(target: Window): MacWindow {
  const overlay = hasOverlay(target.navigator)
    ? target.navigator.windowControlsOverlay
    : null
  const navigation = 'navigation' in target ? target.navigation : null
  const read = (): MacWindowState => ({
    mode: overlay === null || overlay.visible ? 'window' : 'full-screen',
    canGoBack: navigation?.canGoBack ?? true,
    canGoForward: navigation?.canGoForward ?? true,
  })
  const state = new Store(read())
  const update = () => {
    const next = read()
    if (!sameState(next, state.get())) state.set(next)
  }
  overlay?.addEventListener('geometrychange', update)
  navigation?.addEventListener('currententrychange', update)
  return {
    state,
    back: () => target.history.back(),
    forward: () => target.history.forward(),
  }
}
