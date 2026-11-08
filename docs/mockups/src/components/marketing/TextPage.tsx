import type { ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import { classes } from '../common/classes'
import styles from './TextPage.module.css'

/**
 * A page of text on the site, such as the terms, the privacy notice, and
 * the page for an unknown address: a short label, the title, the lead, and
 * the text under them.
 */
export function TextPage(props: {
  label?: string
  title: string
  lead: ReactNode
  children?: ReactNode
  viewport: Viewport
}) {
  return (
    <div
      className={classes(
        styles.page,
        props.viewport === 'mobile' && styles.mobile,
      )}
    >
      <article className={styles.article}>
        <header className={styles.head}>
          {props.label ? (
            <span className={styles.label}>{props.label}</span>
          ) : null}
          <h1 className={styles.title}>{props.title}</h1>
          <p className={styles.lead}>{props.lead}</p>
        </header>
        {props.children}
      </article>
    </div>
  )
}
