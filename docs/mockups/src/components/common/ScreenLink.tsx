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

/**
 * Turns the links of the screens inside it into plain content, for a
 * picture of a screen, such as on the marketing site. A visitor who sees the
 * picture stays on the page.
 */
export function StillLinks(props: { children: ReactNode }) {
  return <LiveLinks.Provider value={false}>{props.children}</LiveLinks.Provider>
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
 * `StillLinks` it is not a link: an anchor becomes a span with the same
 * classes, and a control stays the control.
 */
export function ScreenLink(props: ScreenLinkProps) {
  const live = useContext(LiveLinks)
  if (live) return <MockLink {...props} />
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
