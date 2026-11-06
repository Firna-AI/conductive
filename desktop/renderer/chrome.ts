import './chrome.css'
import { installAppPopups } from './navigation.js'

installAppPopups(__CONDUCTING_APP_ORIGIN__)

/** Standard web APIs only. This document has no access to Electron or Node. */
const chrome = document.createElement('nav')
chrome.setAttribute('aria-label', 'Window controls')
chrome.dataset.desktopTitlebar = ''
chrome.innerHTML = `<span data-desktop-window-space aria-hidden="true"></span>
  <span data-desktop-panel-slot></span><span data-desktop-spacer></span>
  <button type="button" aria-label="Back" title="Back"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 19-7-7 7-7M5 12h14"/></svg></button>
  <button type="button" aria-label="Forward" title="Forward"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14m-7-7 7 7-7 7"/></svg></button>`
const back = chrome.querySelector('button[aria-label="Back"]')
const forward = chrome.querySelector('button[aria-label="Forward"]')
back?.addEventListener('click', () => history.back())
forward?.addEventListener('click', () => history.forward())
document.querySelector('[data-desktop-chrome-slot]')?.append(chrome)

interface BrowserNavigation extends EventTarget {
  canGoBack: boolean
  canGoForward: boolean
}
function hasNavigation(
  value: Window,
): value is Window & { navigation: BrowserNavigation } {
  return 'navigation' in value
}
if (hasNavigation(window)) {
  const navigation = window.navigation
  const update = () => {
    if (back instanceof HTMLButtonElement) back.disabled = !navigation.canGoBack
    if (forward instanceof HTMLButtonElement)
      forward.disabled = !navigation.canGoForward
  }
  navigation.addEventListener('currententrychange', update)
  update()
}

/** WCO is a read-only browser API, not a privileged renderer bridge. */
interface WindowControlsOverlay extends EventTarget {
  visible: boolean
}
function hasOverlay(
  value: Navigator,
): value is Navigator & { windowControlsOverlay: WindowControlsOverlay } {
  return 'windowControlsOverlay' in value
}
if (hasOverlay(navigator)) {
  const overlay = navigator.windowControlsOverlay
  const update = () => {
    document.documentElement.dataset.desktopFullscreen = String(
      !overlay.visible,
    )
  }
  overlay.addEventListener('geometrychange', update)
  update()
}
