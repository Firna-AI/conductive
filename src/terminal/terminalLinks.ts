import { webLink, type WebLinkContext } from '../markdown/web-links'
import { isMacPlatform } from './plainPresses'

/**
 * Where a link of the terminal leads. A local address names a port of the
 * cloud computer. An app page opens in the app. A web link opens in a new
 * tab.
 */
export type TerminalLink =
  | { kind: 'local'; port: number }
  | { kind: 'app'; to: string }
  | { kind: 'web'; href: string }

/** What the app does with the links of the terminal. */
export interface TerminalLinks {
  /** The app origin and the router's page check, for links to the app. */
  context: WebLinkContext
  /** Opens a link that the user pressed. */
  open: (link: TerminalLink) => void
}

/** A context that names no app page, so only the local hosts count. */
const noApp: WebLinkContext = { appOrigin: '', isAppPage: () => false }

/**
 * Where an address of the terminal leads, or undefined when it opens
 * nothing: another scheme, or a user name or a password. Every local
 * address names the cloud computer, also one with the app origin, such as
 * `http://127.0.0.1:5173` in development. So the local hosts come first.
 */
export function terminalLink(
  href: string,
  context: WebLinkContext,
): TerminalLink | undefined {
  const plain = webLink(href, noApp)
  if (!plain) return undefined
  if (plain.kind === 'local') return { kind: 'local', port: plain.port }
  const link = webLink(href, context)
  if (!link || link.kind === 'local') return undefined
  return link.kind === 'app'
    ? { kind: 'app', to: link.to }
    : { kind: 'web', href: link.url.href }
}

/** The key that a click holds to open a link: Cmd on a Mac, Ctrl elsewhere. */
export type LinkKey = 'metaKey' | 'ctrlKey'

/** The key of a link click on a `navigator.platform`, as xterm.js reads it. */
export function linkKey(platform: string): LinkKey {
  return isMacPlatform(platform) ? 'metaKey' : 'ctrlKey'
}

/**
 * The hint of a link under the mouse pointer, with the key in the form of
 * the app's shortcut hints. A link with a label names the host of its real
 * address, because the label can hide where it leads.
 */
export function linkHint(key: LinkKey, labelledHost?: string): string {
  const hint = key === 'metaKey' ? '⌘-click to open' : 'Ctrl+click to open'
  return labelledHost === undefined ? hint : `${hint} ${labelledHost}`
}
