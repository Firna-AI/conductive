import { Fragment, type ReactNode } from 'react'
import type { LinkTarget, Text } from '../../../../../src/marketing/legal-text'
import styles from './RunningText.module.css'

/** Draws a link of running text: to a page of the site, or to an email. */
export type TextLinkRenderer = (link: {
  target: LinkTarget
  className: string
  children: ReactNode
}) => ReactNode

/**
 * Running text of the site: plain words and links. The
 * caller draws each link, so that the mockups link to the catalogue and the
 * app links to the site. The app uses it too, so it imports nothing of the
 * catalogue.
 */
export function RunningText(props: { text: Text; link: TextLinkRenderer }) {
  return props.text.map((part, index) => {
    if (typeof part === 'string') return <Fragment key={index}>{part}</Fragment>
    return (
      <Fragment key={index}>
        {props.link({
          target: part,
          className: styles.link,
          children: part.text,
        })}
      </Fragment>
    )
  })
}
