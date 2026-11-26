import type { ReactNode } from 'react'
import styles from './Section.module.css'

/**
 * A titled card of settings, with its actions at the bottom. `action` sits
 * at the end of the title row, such as Edit.
 */
export function Section(props: {
  title: string
  status?: ReactNode
  action?: ReactNode
  description?: string
  actions?: ReactNode
  children?: ReactNode
}) {
  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.title}>{props.title}</h2>
        {props.status}
        {props.action ? (
          <div className={styles.headerAction}>{props.action}</div>
        ) : null}
      </div>
      {props.description ? (
        <p className={styles.description}>{props.description}</p>
      ) : null}
      {props.children}
      {props.actions ? (
        <div className={styles.actions}>{props.actions}</div>
      ) : null}
    </section>
  )
}

/**
 * A line of body text in a section. A `status` line says what a change of
 * the section did, so a screen reader reads it out when it shows.
 */
export function SectionText(props: {
  children: ReactNode
  muted?: boolean
  status?: boolean
}) {
  return (
    <p
      className={props.muted ? `${styles.text} ${styles.muted}` : styles.text}
      role={props.status ? 'status' : undefined}
    >
      {props.children}
    </p>
  )
}
