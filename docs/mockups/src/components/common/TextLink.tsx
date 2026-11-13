import type { ReactNode } from 'react'
import styles from './TextLink.module.css'

/** What the element that opens a link gets from `TextLink`. */
export type LinkOpener = {
  className: string
  /** The whole address, as the URL parser writes it. */
  title: string
  children: ReactNode
}

/**
 * A link in untrusted text, such as an answer, a sent message, or the
 * Markdown preview of a file: its words in the colour of a link, with an
 * underline. It keeps the font, the size, and the weight of the text
 * around it, so a link in bold stays bold, and a link in code keeps its
 * code box. A long link breaks to fit the line. Its title gives the whole
 * address as the URL parser writes it, so a host in another script shows
 * its ASCII form.
 *
 * `opener` makes the element that opens the address, such as an anchor
 * that opens a new tab, or a link of the app. Without one, the link keeps
 * its look and opens nothing, as for a page that the mockups do not draw.
 */
export function TextLink(props: {
  /** The address that the link opens. */
  address: URL
  /** What the link shows: its label, or its address as the text has it. */
  children: ReactNode
  opener?: (link: LinkOpener) => ReactNode
}) {
  const link: LinkOpener = {
    className: styles.link,
    title: props.address.href,
    children: props.children,
  }
  return props.opener ? props.opener(link) : <span {...link} />
}
