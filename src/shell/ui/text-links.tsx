import { createContext, useContext, useMemo, type ReactNode } from 'react'
import type { LinkOpener } from '../../../docs/mockups/src/components/common/TextLink'
import {
  webLink,
  type WebLink,
  type WebLinkContext,
} from '../../markdown/web-links'
import { isPlainClick } from './AppLink'

/** The port previews of a workspace, which a local address opens. */
interface PortPreviews {
  /** The address of the Preview tool with the port. */
  href: (port: number) => string
  /** Shows the Preview tool with the preview of the port. */
  open: (port: number) => void
}

/**
 * What a screen gives the links of untrusted text, such as chat text: the
 * origin of the app host with the check for a page of the app, the
 * navigation of the app, and the port previews of its workspace.
 */
export interface LinkOpening extends WebLinkContext {
  /** Opens a page of the app in the same window. */
  open: (to: string) => void
  /**
   * The port previews of the workspace, or null where no server runs, such
   * as in a read-only workspace. A local address then stays text.
   */
  ports: PortPreviews | null
}

/** The links of untrusted text: where each address leads, and its opener. */
export interface TextLinks {
  /** Where an address leads, or undefined when it stays text. */
  linkOf: (href: string) => WebLink | undefined
  /**
   * The element that opens a link, as the `opener` of `TextLink`, or null
   * in the plain mode, where each link draws as its words alone.
   */
  opener: ((link: WebLink) => (anchor: LinkOpener) => ReactNode) | null
}

interface LinkState {
  opening: LinkOpening | null
  plain: boolean
}

const LinkStateContext = createContext<LinkState>({
  opening: null,
  plain: false,
})

/** Outside a screen that opens links, no address is a page of the app. */
const outside: WebLinkContext = { appOrigin: '', isAppPage: () => false }

/**
 * Where an address leads. Outside a screen, every accepted address is a
 * link. A screen without port previews keeps each local address as text.
 */
function linkOf(href: string, opening: LinkOpening | null) {
  const link = webLink(href, opening ?? outside)
  if (link?.kind === 'local' && opening && !opening.ports) return undefined
  return link
}

/**
 * An anchor of the app: a plain click runs `open` in the same window. A
 * click with a modifier key stays with the browser, such as a new tab.
 */
function appAnchor(href: string, open: () => void) {
  return (anchor: LinkOpener) => (
    <a
      {...anchor}
      href={href}
      onClick={(event) => {
        if (!isPlainClick(event)) return
        event.preventDefault()
        open()
      }}
    />
  )
}

/**
 * The element that opens a link. A link of the app opens its page in the
 * app, and a local address opens the preview of its port. Every other
 * link, and every link outside a screen that opens links, opens a new tab
 * with no opener and no referrer, so the other site gets no address of
 * the app. The Mac app opens such a tab in the default browser.
 */
function openerOf(link: WebLink, opening: LinkOpening | null) {
  if (opening && link.kind === 'app') {
    const { to } = link
    return appAnchor(to, () => opening.open(to))
  }
  const ports = opening?.ports
  if (ports && link.kind === 'local') {
    const { port } = link
    return appAnchor(ports.href(port), () => ports.open(port))
  }
  return (anchor: LinkOpener) => (
    <a
      {...anchor}
      href={link.url.href}
      rel="noopener noreferrer"
      target="_blank"
    />
  )
}

/** Opens each link of untrusted text inside it as the screen says. */
export function LinkOpeningProvider(props: {
  value: LinkOpening
  children: ReactNode
}) {
  const value = useMemo(
    () => ({ opening: props.value, plain: false }),
    [props.value],
  )
  return (
    <LinkStateContext.Provider value={value}>
      {props.children}
    </LinkStateContext.Provider>
  )
}

/**
 * Draws each link of untrusted text inside it as its words alone, with no
 * element that opens it, such as in a hidden copy of a text. The text
 * keeps the links of the screen, so it reads as the shown text does.
 */
export function PlainLinks(props: { children: ReactNode }) {
  const { opening } = useContext(LinkStateContext)
  const value = useMemo(() => ({ opening, plain: true }), [opening])
  return (
    <LinkStateContext.Provider value={value}>
      {props.children}
    </LinkStateContext.Provider>
  )
}

/**
 * The links of untrusted text where it shows. Outside a screen that opens
 * links, every link opens a new tab.
 */
export function useTextLinks(): TextLinks {
  const { opening, plain } = useContext(LinkStateContext)
  return useMemo(
    () => ({
      linkOf: (href) => linkOf(href, opening),
      opener: plain ? null : (link) => openerOf(link, opening),
    }),
    [opening, plain],
  )
}
