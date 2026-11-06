import type { ReactNode } from 'react'
import styles from './Section.module.css'

/** A titled card of settings, with its actions at the bottom. */
export function Section(props: {
  title: string
  description?: string
  actions?: ReactNode
  children?: ReactNode
}) {
  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.title}>{props.title}</h2>
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

/** Preformatted text, such as a script, in a tinted block. */
export function MonoBlock(props: { text: string; label?: string }) {
  return (
    <pre aria-label={props.label} className={styles.mono}>
      {props.text}
    </pre>
  )
}

/** A line of body text in a section. */
export function SectionText(props: { children: ReactNode; muted?: boolean }) {
  return (
    <p className={props.muted ? `${styles.text} ${styles.muted}` : styles.text}>
      {props.children}
    </p>
  )
}

/** The heading of a settings tab, with one line about what it holds. */
export function TabIntro(props: { title: string; children: ReactNode }) {
  return (
    <div className={styles.intro}>
      <h2 className={styles.introTitle}>{props.title}</h2>
      <p className={styles.introText}>{props.children}</p>
    </div>
  )
}
