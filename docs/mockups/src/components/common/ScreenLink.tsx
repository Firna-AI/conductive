import {
  createContext,
  useContext,
  type AriaAttributes,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from 'react'
import { MockLink } from '@mokly/mokly'

type Destination = { to: string; fragment?: string }

/** A link as an anchor, with the attributes that the screens give it. */
type AnchorLinkProps = Destination & {
  asChild?: false
  className?: string
  style?: CSSProperties
  title?: string
  'aria-current'?: AriaAttributes['aria-current']
  'aria-label'?: string
  children: ReactNode
}

/** A link that makes one rendered control, such as a button, the link. */
type ControlLinkProps = Destination & { asChild: true; children: ReactElement }

export type ScreenLinkProps = AnchorLinkProps | ControlLinkProps

const LiveLinks = createContext(true)

/** A table from a page of the catalogue to the page that takes its place. */
type PageTable = ReadonlyMap<string, string>

const LinkTable = createContext<PageTable>(new Map())

/**
 * Turns the links of the screens inside it into plain content, for a
 * picture of a screen, such as on the marketing site. A visitor who sees the
 * picture stays on the page. A stack of requests uses it too, for a command
 * whose answers its walk does not name.
 */
export function StillLinks(props: { children: ReactNode }) {
  return <LiveLinks.Provider value={false}>{props.children}</LiveLinks.Provider>
}

/**
 * Sends the links of the screens inside it to other pages. A link to a page
 * that the table names opens the page that the table gives, such as the
 * limited page of a file page. Each other link keeps its page. Inside an
 * enclosing table, such as the table of a workspace screen around one of
 * its parts, the enclosing table stays, because the screen knows its whole
 * state.
 */
export function LinkPages(props: { table: PageTable; children: ReactNode }) {
  const enclosing = useContext(LinkTable)
  if (enclosing.size > 0) return props.children
  return (
    <LinkTable.Provider value={props.table}>
      {props.children}
    </LinkTable.Provider>
  )
}

/**
 * The address of a link to a page outside the app, such as GitHub. Inside
 * `StillLinks` there is none, so the anchor is not a link.
 */
export function useOutsideHref(href: string): string | undefined {
  return useContext(LiveLinks) ? href : undefined
}

/**
 * A link to another screen of the catalogue, as Mokly's `MockLink`. Inside
 * `LinkPages` it opens the page that the table gives for its page. Inside
 * `StillLinks` it is not a link: an anchor becomes a span with the same
 * classes, and a control stays the control.
 */
export function ScreenLink(props: ScreenLinkProps) {
  const live = useContext(LiveLinks)
  const table = useContext(LinkTable)
  if (live) return <MockLink {...props} to={table.get(props.to) ?? props.to} />
  if (props.asChild) return props.children
  return (
    <span
      aria-current={props['aria-current']}
      className={props.className}
      style={props.style}
      title={props.title}
    >
      {props.children}
    </span>
  )
}

/** A control that opens a page of the catalogue, or the control alone. */
export function Linked(props: { to?: string; children: ReactElement }) {
  if (!props.to) return props.children
  return (
    <ScreenLink asChild to={props.to}>
      {props.children}
    </ScreenLink>
  )
}
