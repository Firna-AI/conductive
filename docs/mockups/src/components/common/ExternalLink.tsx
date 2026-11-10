import type { ReactNode } from 'react'
import { ExternalLink as ExternalLinkIcon } from 'lucide-react'
import { classes } from './classes'
import { useOutsideHref } from './ScreenLink'
import styles from './ExternalLink.module.css'

/**
 * A link that opens a page outside the app in a new tab. `className` adds
 * to its own look, such as the touch height of a row on a phone.
 */
export function ExternalLink(props: {
  href: string
  children: ReactNode
  className?: string
}) {
  const href = useOutsideHref(props.href)
  return (
    <a
      className={classes(styles.link, props.className)}
      href={href}
      rel="noreferrer"
      target="_blank"
    >
      {props.children}
      <ExternalLinkIcon size={12} />
    </a>
  )
}
