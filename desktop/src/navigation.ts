import type { WebContents } from 'electron'

import {
  DESKTOP_ORIGIN,
  isDesktopAddress,
} from '../../worker/security/desktop-contract.js'

export type Navigation =
  | { action: 'allow' | 'drop' | 'sign-in' }
  | { action: 'external' | 'load'; url: string }

/** External HTTP links never replace the trusted bundled main frame. */
export function navigationTarget(
  address: string,
  appOrigin: string,
  popup = false,
): Navigation {
  let url: URL
  try {
    url = new URL(address)
  } catch {
    return { action: 'drop' }
  }
  if (url.username || url.password) return { action: 'drop' }
  if (
    (isDesktopAddress(url) || url.origin === appOrigin) &&
    url.pathname === '/api/auth/github'
  ) {
    return { action: 'sign-in' }
  }
  if (isDesktopAddress(url)) {
    return popup ? { action: 'load', url: url.href } : { action: 'allow' }
  }
  if (!['http:', 'https:'].includes(url.protocol)) return { action: 'drop' }
  if (url.origin === appOrigin && !url.pathname.startsWith('/api/')) {
    return {
      action: 'load',
      url: DESKTOP_ORIGIN + url.pathname + url.search + url.hash,
    }
  }
  return { action: 'external', url: url.href }
}

export function installNavigation(
  contents: WebContents,
  appOrigin: string,
  dependencies: {
    load(url: string): Promise<unknown>
    external(url: string): Promise<unknown>
    signIn(): Promise<unknown>
    warn(error: unknown): void
  },
): void {
  const apply = (result: Navigation) => {
    if (result.action === 'external')
      void dependencies.external(result.url).catch(dependencies.warn)
    if (result.action === 'load')
      void dependencies.load(result.url).catch(dependencies.warn)
    if (result.action === 'sign-in')
      void dependencies.signIn().catch(dependencies.warn)
  }
  contents.on('will-navigate', (event) => {
    const result = navigationTarget(event.url, appOrigin)
    if (result.action !== 'allow') {
      event.preventDefault()
      apply(result)
    }
  })
  contents.on('will-redirect', (event) => {
    if (!event.isMainFrame) return
    const result = navigationTarget(event.url, appOrigin)
    if (result.action !== 'allow') {
      event.preventDefault()
      apply(result)
    }
  })
  contents.on('will-frame-navigate', (event) => {
    if (event.isMainFrame) return
    // A frame may load its own content, but cannot replace the main document.
    if (event.url.startsWith('conducting:')) event.preventDefault()
  })
  contents.on('will-attach-webview', (event) => event.preventDefault())
  contents.setWindowOpenHandler(({ url }) => {
    apply(navigationTarget(url, appOrigin, true))
    return { action: 'deny' }
  })
}
