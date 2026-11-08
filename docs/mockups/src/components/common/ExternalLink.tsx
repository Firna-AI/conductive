import type { ReactNode } from 'react'
import { ExternalLink as ExternalLinkIcon } from 'lucide-react'
import { useOutsideHref } from './ScreenLink'
import styles from './ExternalLink.module.css'

/** A link that opens a page outside the app in a new tab. */
export function ExternalLink(props: { href: string; children: ReactNode }) {
  const href = useOutsideHref(props.href)
  return (
    <a className={styles.link} href={href} rel="noreferrer" target="_blank">
      {props.children}
      <ExternalLinkIcon size={12} />
    </a>
  )
}
