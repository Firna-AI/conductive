import {
  DESKTOP_ORIGIN,
  isDesktopAddress,
} from '../../worker/security/desktop-contract.js'

export type Navigation =
  | { action: 'allow' | 'drop' | 'sign-in' }
  | { action: 'external' | 'load'; url: string }

export type NavigationSource = 'trusted-main' | 'untrusted'

interface NavigationFrame {
  readonly url: string
}
interface NavigationEvent {
  url: string
  frame: NavigationFrame | null
  initiator?: NavigationFrame | null
  preventDefault(): void
}
export interface NavigationHost {
  readonly mainFrame: NavigationFrame
  on(
    event: 'will-navigate' | 'will-redirect' | 'will-frame-navigate',
    listener: (event: NavigationEvent) => void,
  ): unknown
  on(
    event: 'will-attach-webview',
    listener: (event: { preventDefault(): void }) => void,
  ): unknown
  setWindowOpenHandler(
    handler: (details: { url: string }) => { action: 'deny' },
  ): unknown
}

/** External HTTP links never replace the trusted bundled main frame. */
export function navigationTarget(
  address: string,
  appOrigin: string,
  source: NavigationSource,
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
    source !== 'trusted-main'
  ) {
    return { action: 'drop' }
  }
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
  contents: NavigationHost,
  appOrigin: string,
  dependencies: {
    load(url: string): Promise<unknown>
    external(url: string): Promise<unknown>
    signIn(): Promise<unknown>
    warn(error: unknown): void
  },
): void {
  const source = (
    initiator: NavigationFrame | null | undefined,
  ): NavigationSource => {
    if (!initiator || initiator !== contents.mainFrame) return 'untrusted'
    try {
      return isDesktopAddress(new URL(initiator.url))
        ? 'trusted-main'
        : 'untrusted'
    } catch {
      return 'untrusted'
    }
  }
  const apply = (result: Navigation) => {
    if (result.action === 'external')
      void dependencies.external(result.url).catch(dependencies.warn)
    if (result.action === 'load')
      void dependencies.load(result.url).catch(dependencies.warn)
    if (result.action === 'sign-in')
      void dependencies.signIn().catch(dependencies.warn)
  }
  contents.on('will-navigate', (event) => {
    const result = navigationTarget(
      event.url,
      appOrigin,
      source(event.initiator),
    )
    if (result.action !== 'allow') {
      event.preventDefault()
      apply(result)
    }
  })
  contents.on('will-redirect', (event) => {
    // Child documents can follow redirects inside their own frame.
    if (event.frame && event.frame !== contents.mainFrame) return
    const result = navigationTarget(
      event.url,
      appOrigin,
      source(event.initiator),
    )
    if (result.action !== 'allow') {
      event.preventDefault()
      apply(result)
    }
  })
  contents.on('will-frame-navigate', (event) => {
    if (event.frame === contents.mainFrame) return
    // A frame may load its own content, but cannot replace the main document.
    if (event.url.startsWith('conductive:')) event.preventDefault()
  })
  contents.on('will-attach-webview', (event) => event.preventDefault())
  contents.setWindowOpenHandler(({ url }) => {
    // Referrers do not identify a source frame. Native popups are untrusted.
    apply(navigationTarget(url, appOrigin, 'untrusted', true))
    return { action: 'deny' }
  })
}
