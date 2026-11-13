import type { ReactNode } from 'react'
import { classes } from '../common/classes'
import { capabilitiesLabel } from './capabilitiesCopy'
import styles from './Capabilities.module.css'

/**
 * One part of the Capabilities control: its title, a control at the end
 * of its title, such as a switch or a link, a hint, and its content.
 * Secrets and Mac access are the parts for now. Later features, such as
 * MCP servers, add their own parts to the list.
 */
export type CapabilityPart = {
  key: string
  title: string
  hint: string
  control?: ReactNode
  content?: ReactNode
}

/**
 * The Capabilities control, drawn open: its title and a line about what it
 * holds, then each part in its order. A sheet on a phone has its own
 * title, so `sheet` leaves the title out.
 */
export function CapabilitiesPanel(props: {
  intro: string
  parts: readonly CapabilityPart[]
  sheet?: boolean
}) {
  return (
    <div className={classes(styles.panel, props.sheet && styles.inSheet)}>
      <div className={styles.header}>
        {props.sheet ? null : (
          <h2 className={styles.title}>{capabilitiesLabel}</h2>
        )}
        <p className={styles.intro}>{props.intro}</p>
      </div>
      {props.parts.map((part) => (
        <section aria-label={part.title} className={styles.part} key={part.key}>
          <div className={styles.partHead}>
            <h3 className={styles.partTitle}>{part.title}</h3>
            {part.control}
          </div>
          <p className={styles.hint}>{part.hint}</p>
          {part.content}
        </section>
      ))}
    </div>
  )
}
