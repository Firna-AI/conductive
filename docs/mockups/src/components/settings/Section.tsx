import type { ReactNode } from 'react'
import { Caption, H5 } from '@firna/ui/typography'
import styles from './Section.module.css'

/** A titled card of settings, with its actions at the bottom. */
export function Section(props: {
  title: string
  status?: ReactNode
  description?: string
  actions?: ReactNode
  children?: ReactNode
}) {
  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <H5>{props.title}</H5>
        {props.status}
      </div>
      {props.description ? <Caption>{props.description}</Caption> : null}
      {props.children}
      {props.actions ? (
        <div className={styles.actions}>{props.actions}</div>
      ) : null}
    </section>
  )
}

/** Preformatted text, such as script output, in a tinted block. */
export function MonoBlock(props: { text: string }) {
  return <pre className={styles.mono}>{props.text}</pre>
}
